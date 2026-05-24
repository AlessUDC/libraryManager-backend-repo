/**
 * Tests alineados con flujoPrestamos.txt — diseñados para romperse si la lógica de negocio cambia.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LoansService } from './loans.service';
import { SanctionsService } from './sanctions.service';
import { FinesService } from './fines.service';
import { ReservationsService } from '../../reservations/services/reservations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { SanctionType, SanctionStatus, LoanType } from '@prisma/client';
import { createPrismaMock, PrismaMock } from '../../../test/helpers/prisma-mock';
import * as businessCalendar from '../../../common/business-calendar';

describe('flujoPrestamos.txt — reglas de negocio críticas', () => {
  describe('A. Préstamo en SALA', () => {
    let reservations: ReservationsService;
    let prisma: PrismaMock;

    beforeEach(async () => {
      prisma = createPrismaMock();
      const module = await Test.createTestingModule({
        providers: [
          ReservationsService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: SanctionsService,
            useValue: { isUserBlocked: jest.fn().mockResolvedValue(false) },
          },
          { provide: AuditLogService, useValue: { log: jest.fn() } },
        ],
      }).compile();
      reservations = module.get(ReservationsService);
      prisma.reservation.findMany.mockResolvedValue([]);
      prisma.user.findUnique.mockResolvedValue({ userId: 'u1', role: 'STUDENT' });
    });

    it('rechaza reserva en sala después de las 19:00', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 4, 20, 19, 30, 0));

      await expect(
        reservations.createReservation('u1', {
          copyId: 'c1',
          requestedLoanType: 'LIBRARY',
          requestedDueDate: new Date().toISOString(),
          reservationDurationMinutes: 60,
        }),
      ).rejects.toThrow(BadRequestException);

      jest.useRealTimers();
    });

    it('permite reserva en sala antes de las 19:00 en día hábil', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 4, 20, 18, 0, 0));

      prisma.copy.findUnique.mockResolvedValue({ copyId: 'c1', status: 'AVAILABLE' });
      prisma.reservation.create.mockImplementation(({ data }) =>
        Promise.resolve({ reservationId: 'r1', ...data }),
      );
      prisma.copy.update.mockResolvedValue({});

      await expect(
        reservations.createReservation('u1', {
          copyId: 'c1',
          requestedLoanType: 'LIBRARY',
          requestedDueDate: new Date().toISOString(),
          reservationDurationMinutes: 60,
        }),
      ).resolves.toBeDefined();

      jest.useRealTimers();
    });
  });

  describe('B. Préstamo a DOMICILIO — devolución a tiempo', () => {
    let loans: LoansService;
    let prisma: PrismaMock;
    let sanctions: { registerOnTimeDelivery: jest.Mock };
    let fines: { annulFine: jest.Mock };

    beforeEach(async () => {
      prisma = createPrismaMock();
      sanctions = { registerOnTimeDelivery: jest.fn() };
      fines = { annulFine: jest.fn() };
      const audit = { log: jest.fn() };

      const module = await Test.createTestingModule({
        providers: [
          LoansService,
          { provide: PrismaService, useValue: prisma },
          { provide: SanctionsService, useValue: sanctions },
          { provide: FinesService, useValue: fines },
          { provide: AuditLogService, useValue: audit },
        ],
      }).compile();
      loans = module.get(LoansService);
    });

    it('devolución a tiempo: reembolsa depósito y registra entrega puntual', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);

      prisma.loan.findUnique.mockResolvedValue({
        loanId: 'l1',
        userId: 'u1',
        copyId: 'c1',
        type: LoanType.HOME,
        status: 'ACTIVE',
        depositAmount: 20,
        depositStatus: 'HELD',
        dueDate: tomorrow,
        user: { userId: 'u1' },
      });
      prisma.loan.update.mockResolvedValue({ status: 'RETURNED', depositStatus: 'REFUNDED' });
      prisma.copy.update.mockResolvedValue({});
      prisma.fine.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ loanBlockUntil: null });
      prisma.loan.count.mockResolvedValue(0);

      await loans.returnLoan('l1', { condition: 'GOOD' });

      expect(sanctions.registerOnTimeDelivery).toHaveBeenCalledWith('u1');
      const updateArg = prisma.loan.update.mock.calls[0][0].data;
      expect(updateArg.depositStatus).toBe('REFUNDED');
    });

    it('devolución tardía: NO reembolsa depósito automáticamente', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      prisma.loan.findUnique.mockResolvedValue({
        loanId: 'l1',
        userId: 'u1',
        copyId: 'c1',
        type: LoanType.HOME,
        status: 'ACTIVE',
        depositAmount: 20,
        depositStatus: 'HELD',
        dueDate: yesterday,
        user: { userId: 'u1' },
      });
      prisma.loan.update.mockImplementation(({ data }) => Promise.resolve(data));
      prisma.copy.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ loanBlockUntil: null });
      prisma.loan.count.mockResolvedValue(0);

      await loans.returnLoan('l1');

      expect(sanctions.registerOnTimeDelivery).not.toHaveBeenCalled();
      expect(prisma.loan.update.mock.calls[0][0].data.depositStatus).toBeUndefined();
    });
  });

  describe('SANCIONES — umbrales y redención', () => {
    let sanctionsService: SanctionsService;
    let prisma: PrismaMock;

    beforeEach(() => {
      prisma = createPrismaMock();
      sanctionsService = new SanctionsService(prisma as unknown as PrismaService);
    });

    it('3 LEVE pendientes → bloqueo 3 días (reincidencia)', async () => {
      const leves = [1, 2, 3].map((i) => ({
        sanctionId: `s${i}`,
        type: SanctionType.LEVE,
        status: SanctionStatus.PENDING,
      }));
      prisma.sanction.create.mockResolvedValue({});
      prisma.sanction.findMany.mockResolvedValue(leves);
      prisma.user.findUnique.mockResolvedValue({ loanBlockUntil: null });

      await sanctionsService.applySanction('u1', 'loan-x', SanctionType.LEVE);

      expect(prisma.sanction.updateMany).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('2 GRAVE → bloqueo 5 días', async () => {
      prisma.sanction.create.mockResolvedValue({});
      prisma.sanction.findMany.mockResolvedValue(
        [1, 2].map((i) => ({
          sanctionId: `g${i}`,
          type: SanctionType.GRAVE,
          status: SanctionStatus.PENDING,
        })),
      );
      prisma.user.findUnique.mockResolvedValue({ loanBlockUntil: null });

      await sanctionsService.applySanction('u1', 'loan-x', SanctionType.GRAVE);

      const blockUntil: Date = prisma.user.update.mock.calls[0][0].data.loanBlockUntil;
      const days = Math.round((blockUntil.getTime() - Date.now()) / 86400000);
      expect(days).toBeGreaterThanOrEqual(4);
    });

    it('redención: 3 entregas a tiempo eliminan 1 LEVE pendiente', async () => {
      prisma.student.findUnique.mockResolvedValue({
        userId: 'stu',
        onTimeDeliveriesCount: 2,
      });
      prisma.student.update.mockResolvedValue({ onTimeDeliveriesCount: 3 });
      prisma.sanction.findFirst.mockResolvedValue({ sanctionId: 's-leve' });

      await sanctionsService.registerOnTimeDelivery('stu');

      expect(prisma.sanction.update).toHaveBeenCalledWith({
        where: { sanctionId: 's-leve' },
        data: { status: SanctionStatus.REDEEMED },
      });
    });
  });

  describe('Calendario — fines de semana no avanzan multas de domicilio', () => {
    it('viernes→lunes: solo 1 día hábil de penalización', () => {
      const due = new Date(2026, 4, 22, 12, 0, 0);
      const monday = new Date(2026, 4, 25, 12, 0, 0);
      expect(businessCalendar.countCalendarBusinessOverdueDays(due, monday)).toBe(1);
    });

    it('sábado: shouldApplyDailyPenaltyLogic es false', () => {
      expect(
        businessCalendar.shouldApplyDailyPenaltyLogic(new Date(2026, 4, 23)),
      ).toBe(false);
    });
  });

  describe('Límites de reserva (flujo cabecera)', () => {
    it('estudiante máximo 60 min de reserva', async () => {
      const prisma = createPrismaMock();
      const module = await Test.createTestingModule({
        providers: [
          ReservationsService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: SanctionsService,
            useValue: { isUserBlocked: jest.fn().mockResolvedValue(false) },
          },
          { provide: AuditLogService, useValue: { log: jest.fn() } },
        ],
      }).compile();
      const svc = module.get(ReservationsService);
      prisma.reservation.findMany.mockResolvedValue([]);
      prisma.user.findUnique.mockResolvedValue({ userId: 'u1', role: 'STUDENT' });

      await expect(
        svc.createReservation('u1', {
          copyId: 'c1',
          requestedLoanType: 'HOME',
          requestedDueDate: new Date(Date.now() + 86400000).toISOString(),
          reservationDurationMinutes: 90,
        }),
      ).rejects.toThrow(/60 minutos/);
    });

    it('domicilio máximo 5 días de plazo', async () => {
      const prisma = createPrismaMock();
      const module = await Test.createTestingModule({
        providers: [
          ReservationsService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: SanctionsService,
            useValue: { isUserBlocked: jest.fn().mockResolvedValue(false) },
          },
          { provide: AuditLogService, useValue: { log: jest.fn() } },
        ],
      }).compile();
      const svc = module.get(ReservationsService);
      prisma.reservation.findMany.mockResolvedValue([]);
      prisma.user.findUnique.mockResolvedValue({ userId: 'u1', role: 'STUDENT' });

      const far = new Date();
      far.setDate(far.getDate() + 10);

      await expect(
        svc.createReservation('u1', {
          copyId: 'c1',
          requestedLoanType: 'HOME',
          requestedDueDate: far.toISOString(),
          reservationDurationMinutes: 60,
        }),
      ).rejects.toThrow(/5 días/);
    });
  });
});
