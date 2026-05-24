import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SanctionsService } from '../../loans/services/sanctions.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { ReservationStatus } from '@prisma/client';
import { createPrismaMock, PrismaMock } from '../../../test/helpers/prisma-mock';

describe('ReservationsService — flujo disciplinario y expiración', () => {
  let service: ReservationsService;
  let prisma: PrismaMock;
  let sanctionsService: { isUserBlocked: jest.Mock };
  let auditLog: { log: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    sanctionsService = { isUserBlocked: jest.fn().mockResolvedValue(false) };
    auditLog = { log: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SanctionsService, useValue: sanctionsService },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get(ReservationsService);
    jest.clearAllMocks();
  });

  describe('createReservation', () => {
    const dtoBase = {
      copyId: 'copy-1',
      requestedLoanType: 'HOME' as const,
      requestedDueDate: new Date().toISOString(),
      reservationDurationMinutes: 60,
    };

    beforeEach(() => {
      prisma.reservation.findMany.mockResolvedValue([]);
    });

    it('rechaza reserva si el usuario está bloqueado', async () => {
      sanctionsService.isUserBlocked.mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue({
        userId: 'u1',
        role: 'STUDENT',
      });

      await expect(service.createReservation('u1', dtoBase)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza duración mayor al máximo del rol (estudiante 60 min)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        userId: 'u1',
        role: 'STUDENT',
      });

      await expect(
        service.createReservation('u1', {
          ...dtoBase,
          reservationDurationMinutes: 90,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza fecha de devolución en el pasado (HOME)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        userId: 'u1',
        role: 'STUDENT',
      });
      const past = new Date();
      past.setDate(past.getDate() - 2);

      await expect(
        service.createReservation('u1', {
          ...dtoBase,
          requestedDueDate: past.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza HOME con más de 5 días de plazo', async () => {
      prisma.user.findUnique.mockResolvedValue({
        userId: 'u1',
        role: 'STUDENT',
      });
      const far = new Date();
      far.setDate(far.getDate() + 10);

      await expect(
        service.createReservation('u1', {
          ...dtoBase,
          requestedDueDate: far.toISOString(),
        }),
      ).rejects.toThrow(/5 días/);
    });

    it('normaliza LIBRARY a hoy 19:00 independiente de la fecha enviada', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 4, 20, 18, 0, 0));

      prisma.user.findUnique.mockResolvedValue({
        userId: 'u1',
        role: 'STUDENT',
      });
      prisma.copy.findUnique.mockResolvedValue({
        copyId: 'copy-1',
        status: 'AVAILABLE',
      });
      prisma.reservation.create.mockImplementation(({ data }) =>
        Promise.resolve({ reservationId: 'r1', ...data }),
      );
      prisma.copy.update.mockResolvedValue({});

      const far = new Date();
      far.setDate(far.getDate() + 5);

      await service.createReservation('u1', {
        copyId: 'copy-1',
        requestedLoanType: 'LIBRARY',
        requestedDueDate: far.toISOString(),
        reservationDurationMinutes: 60,
      });

      const createData = prisma.reservation.create.mock.calls[0][0].data;
      expect(createData.requestedDueDate.getHours()).toBe(19);
      const today = new Date();
      expect(createData.requestedDueDate.getDate()).toBe(20);
      expect(createData.requestedDueDate.getHours()).toBe(19);

      jest.useRealTimers();
    });

    it('rechaza LIBRARY después de las 19:00', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 4, 20, 19, 15, 0));

      prisma.user.findUnique.mockResolvedValue({ userId: 'u1', role: 'STUDENT' });

      await expect(
        service.createReservation('u1', {
          copyId: 'copy-1',
          requestedLoanType: 'LIBRARY',
          requestedDueDate: new Date().toISOString(),
          reservationDurationMinutes: 60,
        }),
      ).rejects.toThrow(/7:00 PM/);

      jest.useRealTimers();
    });

    it('lanza ConflictException si el ejemplar no está disponible', async () => {
      prisma.user.findUnique.mockResolvedValue({
        userId: 'u1',
        role: 'STUDENT',
      });
      prisma.copy.findUnique.mockResolvedValue({
        copyId: 'copy-1',
        status: 'LENT',
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await expect(
        service.createReservation('u1', {
          ...dtoBase,
          requestedDueDate: tomorrow.toISOString(),
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('expireOldReservations (handleCron)', () => {
    it('expira reserva pendiente y libera ejemplar', async () => {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() - 5);

      prisma.reservation.findMany.mockResolvedValue([
        {
          reservationId: 'res-1',
          userId: 'teacher-1',
          copyId: 'copy-1',
          status: ReservationStatus.PENDING,
          expiresAt,
        },
      ]);
      prisma.reservation.findUnique.mockResolvedValue({
        reservationId: 'res-1',
        userId: 'teacher-1',
        copyId: 'copy-1',
        status: ReservationStatus.PENDING,
        expiresAt,
      });
      prisma.reservation.update.mockResolvedValue({
        copyId: 'copy-1',
      });
      prisma.copy.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({
        userId: 'teacher-1',
        role: 'TEACHER',
        student: null,
      });

      await service.handleCron();

      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { reservationId: 'res-1' },
        data: { status: ReservationStatus.EXPIRED },
      });
      expect(prisma.copy.update).toHaveBeenCalledWith({
        where: { copyId: 'copy-1' },
        data: { status: 'AVAILABLE' },
      });
      expect(auditLog.log).toHaveBeenCalledWith(
        'EXPIRE_RESERVATION',
        'Reservation',
        'res-1',
        'SYSTEM',
        expect.any(Object),
      );
    });

    it('estudiante: incrementa missedReservationsCount sin bloqueo en 1 o 2 faltas', async () => {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() - 1);

      prisma.reservation.findMany.mockResolvedValue([
        { reservationId: 'res-1', userId: 'stu-1', copyId: 'c1', expiresAt },
      ]);
      prisma.reservation.findUnique.mockResolvedValue({
        reservationId: 'res-1',
        userId: 'stu-1',
        copyId: 'c1',
        status: ReservationStatus.PENDING,
        expiresAt,
      });
      prisma.reservation.update.mockResolvedValue({ copyId: 'c1' });
      prisma.copy.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({
        userId: 'stu-1',
        role: 'STUDENT',
        student: { userId: 'stu-1' },
      });
      prisma.student.update.mockResolvedValue({
        missedReservationsCount: 1,
      });

      await service.handleCron();

      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { userId: 'stu-1' },
        data: { missedReservationsCount: { increment: 1 } },
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('estudiante: bloqueo 1 día al llegar a 3 reservas perdidas', async () => {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() - 1);

      prisma.reservation.findMany.mockResolvedValue([
        { reservationId: 'res-1', userId: 'stu-1', copyId: 'c1', expiresAt },
      ]);
      prisma.reservation.findUnique.mockResolvedValue({
        reservationId: 'res-1',
        userId: 'stu-1',
        copyId: 'c1',
        status: ReservationStatus.PENDING,
        expiresAt,
      });
      prisma.reservation.update.mockResolvedValue({ copyId: 'c1' });
      prisma.copy.update.mockResolvedValue({});
      prisma.user.findUnique
        .mockResolvedValueOnce({
          userId: 'stu-1',
          role: 'STUDENT',
          student: { userId: 'stu-1' },
        })
        .mockResolvedValueOnce({ loanBlockUntil: null });
      prisma.student.update.mockResolvedValue({
        missedReservationsCount: 3,
      });

      await service.handleCron();

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'stu-1' },
          data: { loanBlockUntil: expect.any(Date) },
        }),
      );
      expect(auditLog.log).toHaveBeenCalledWith(
        'USER_BLOCK_AUTOMATIC',
        'User',
        'stu-1',
        'SYSTEM',
        expect.objectContaining({ reason: 'MISSED_RESERVATIONS', blockDays: 1 }),
      );
    });

    it('estudiante: bloqueo 3 días al llegar a 5 reservas perdidas', async () => {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() - 1);

      prisma.reservation.findMany.mockResolvedValue([
        { reservationId: 'res-1', userId: 'stu-1', copyId: 'c1', expiresAt },
      ]);
      prisma.reservation.findUnique.mockResolvedValue({
        reservationId: 'res-1',
        userId: 'stu-1',
        copyId: 'c1',
        status: ReservationStatus.PENDING,
        expiresAt,
      });
      prisma.reservation.update.mockResolvedValue({ copyId: 'c1' });
      prisma.copy.update.mockResolvedValue({});
      prisma.user.findUnique
        .mockResolvedValueOnce({
          userId: 'stu-1',
          role: 'STUDENT',
          student: { userId: 'stu-1' },
        })
        .mockResolvedValueOnce({ loanBlockUntil: null });
      prisma.student.update.mockResolvedValue({
        missedReservationsCount: 5,
      });

      await service.handleCron();

      expect(auditLog.log).toHaveBeenCalledWith(
        'USER_BLOCK_AUTOMATIC',
        'User',
        'stu-1',
        'SYSTEM',
        expect.objectContaining({ blockDays: 3 }),
      );
    });

    it('estudiante: bloqueo 7 días desde 7 reservas perdidas', async () => {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() - 1);

      prisma.reservation.findMany.mockResolvedValue([
        { reservationId: 'res-1', userId: 'stu-1', copyId: 'c1', expiresAt },
      ]);
      prisma.reservation.findUnique.mockResolvedValue({
        reservationId: 'res-1',
        userId: 'stu-1',
        copyId: 'c1',
        status: ReservationStatus.PENDING,
        expiresAt,
      });
      prisma.reservation.update.mockResolvedValue({ copyId: 'c1' });
      prisma.copy.update.mockResolvedValue({});
      prisma.user.findUnique
        .mockResolvedValueOnce({
          userId: 'stu-1',
          role: 'STUDENT',
          student: { userId: 'stu-1' },
        })
        .mockResolvedValueOnce({ loanBlockUntil: null });
      prisma.student.update.mockResolvedValue({
        missedReservationsCount: 7,
      });

      await service.handleCron();

      expect(auditLog.log).toHaveBeenCalledWith(
        'USER_BLOCK_AUTOMATIC',
        'User',
        'stu-1',
        'SYSTEM',
        expect.objectContaining({ blockDays: 7 }),
      );
    });
  });

  describe('redeemReservation', () => {
    it('rechaza canje de reserva expirada', async () => {
      prisma.reservation.findMany.mockResolvedValue([]);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() - 10);

      prisma.reservation.findUnique.mockResolvedValue({
        reservationId: 'res-1',
        userId: 'u1',
        copyId: 'c1',
        status: ReservationStatus.PENDING,
        expiresAt,
        token: '123456',
        failedAttempts: 0,
        copy: { copyId: 'c1' },
      });
      prisma.reservation.update.mockResolvedValue({ copyId: 'c1' });
      prisma.copy.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({
        role: 'STUDENT',
        student: { userId: 'u1' },
      });
      prisma.student.update.mockResolvedValue({ missedReservationsCount: 1 });

      await expect(
        service.redeemReservation('res-1', 'u1', { token: '123456' }),
      ).rejects.toThrow(/expirado/i);
    });

    it('incrementa intentos fallidos con token inválido', async () => {
      prisma.reservation.findMany.mockResolvedValue([]);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

      prisma.reservation.findUnique.mockResolvedValue({
        reservationId: 'res-1',
        userId: 'u1',
        copyId: 'c1',
        status: ReservationStatus.PENDING,
        expiresAt,
        token: '123456',
        failedAttempts: 2,
        copy: { copyId: 'c1' },
      });
      prisma.reservation.update.mockResolvedValue({});

      await expect(
        service.redeemReservation('res-1', 'u1', { token: '000000' }),
      ).rejects.toThrow(/inválido/i);

      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { reservationId: 'res-1' },
        data: { failedAttempts: 3 },
      });
    });

    it('cancela reserva tras 5 intentos fallidos de token', async () => {
      prisma.reservation.findMany.mockResolvedValue([]);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

      prisma.reservation.findUnique.mockResolvedValue({
        reservationId: 'res-1',
        userId: 'u1',
        copyId: 'c1',
        status: ReservationStatus.PENDING,
        expiresAt,
        token: '123456',
        failedAttempts: 4,
        copy: { copyId: 'c1' },
      });
      prisma.reservation.update.mockResolvedValue({});
      prisma.copy.update.mockResolvedValue({});

      await expect(
        service.redeemReservation('res-1', 'u1', { token: '000000' }),
      ).rejects.toThrow(/Demasiados intentos/);

      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { reservationId: 'res-1' },
        data: { status: 'CANCELLED', failedAttempts: 5 },
      });
      expect(prisma.copy.update).toHaveBeenCalledWith({
        where: { copyId: 'c1' },
        data: { status: 'AVAILABLE' },
      });
    });

    it('rechaza canje por usuario no autorizado', async () => {
      prisma.reservation.findMany.mockResolvedValue([]);
      prisma.reservation.findUnique.mockResolvedValue({
        reservationId: 'res-1',
        userId: 'owner',
        status: ReservationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60000),
      });

      await expect(
        service.redeemReservation('res-1', 'other-user', { token: '123456' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelReservation', () => {
    it('solo permite cancelar reservas PENDING', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        reservationId: 'res-1',
        userId: 'u1',
        copyId: 'c1',
        status: ReservationStatus.FULFILLED,
      });

      await expect(
        service.cancelReservation('res-1', 'u1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('cancela y libera ejemplar correctamente', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        reservationId: 'res-1',
        userId: 'u1',
        copyId: 'c1',
        status: ReservationStatus.PENDING,
      });
      prisma.reservation.update.mockResolvedValue({});
      prisma.copy.update.mockResolvedValue({});

      const result = await service.cancelReservation('res-1', 'u1');

      expect(result.message).toBe('Reserva cancelada');
      expect(prisma.copy.update).toHaveBeenCalledWith({
        where: { copyId: 'c1' },
        data: { status: 'AVAILABLE' },
      });
    });

    it('lanza NotFoundException si la reserva no existe', async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelReservation('x', 'u1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
