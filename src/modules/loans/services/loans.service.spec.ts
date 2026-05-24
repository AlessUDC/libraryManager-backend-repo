import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { LoansService } from './loans.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SanctionsService } from './sanctions.service';
import { FinesService } from './fines.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { LoanType } from '@prisma/client';
import { createPrismaMock, PrismaMock } from '../../../test/helpers/prisma-mock';

describe('LoansService', () => {
  let service: LoansService;
  let prisma: PrismaMock;
  let sanctionsService: {
    registerOnTimeDelivery: jest.Mock;
  };
  let finesService: {
    annulFine: jest.Mock;
  };
  let auditLog: { log: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    sanctionsService = { registerOnTimeDelivery: jest.fn() };
    finesService = { annulFine: jest.fn() };
    auditLog = { log: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        { provide: PrismaService, useValue: prisma },
        { provide: SanctionsService, useValue: sanctionsService },
        { provide: FinesService, useValue: finesService },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get(LoansService);
    jest.clearAllMocks();
  });

  describe('createLoan', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createLoan({
          userId: 'x',
          copyId: 'c1',
          dueDate: new Date().toISOString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si el ejemplar no existe', async () => {
      prisma.user.findUnique.mockResolvedValue({ userId: 'u1' });
      prisma.copy.findUnique.mockResolvedValue(null);

      await expect(
        service.createLoan({
          userId: 'u1',
          copyId: 'c1',
          dueDate: new Date().toISOString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ConflictException si el ejemplar no está AVAILABLE', async () => {
      prisma.user.findUnique.mockResolvedValue({ userId: 'u1' });
      prisma.copy.findUnique.mockResolvedValue({
        copyId: 'c1',
        status: 'LENT',
        book: { cost: 10 },
      });

      await expect(
        service.createLoan({
          userId: 'u1',
          copyId: 'c1',
          dueDate: new Date().toISOString(),
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('crea préstamo con depósito 2x costo y marca ejemplar LENT', async () => {
      prisma.user.findUnique.mockResolvedValue({ userId: 'u1' });
      prisma.copy.findUnique.mockResolvedValue({
        copyId: 'c1',
        status: 'AVAILABLE',
        book: { cost: 15 },
      });
      prisma.loan.create.mockResolvedValue({
        loanId: 'loan-1',
        depositAmount: 30,
        depositStatus: 'HELD',
      });
      prisma.copy.update.mockResolvedValue({});

      await service.createLoan({
        userId: 'u1',
        copyId: 'c1',
        dueDate: new Date().toISOString(),
      });

      expect(prisma.loan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            depositAmount: 30,
            depositStatus: 'HELD',
            status: 'ACTIVE',
          }),
        }),
      );
      expect(prisma.copy.update).toHaveBeenCalledWith({
        where: { copyId: 'c1' },
        data: { status: 'LENT' },
      });
    });
  });

  describe('returnLoan', () => {
    const baseLoan = {
      loanId: 'loan-1',
      userId: 'u1',
      copyId: 'c1',
      type: LoanType.HOME,
      status: 'ACTIVE',
      depositAmount: 20,
      depositStatus: 'HELD',
      dueDate: new Date(Date.now() + 86400000),
      user: { userId: 'u1' },
    };

    it('lanza NotFoundException si el préstamo no existe', async () => {
      prisma.loan.findUnique.mockResolvedValue(null);

      await expect(service.returnLoan('x')).rejects.toThrow(NotFoundException);
    });

    it('lanza ConflictException si ya fue devuelto', async () => {
      prisma.loan.findUnique.mockResolvedValue({
        ...baseLoan,
        status: 'RETURNED',
      });

      await expect(service.returnLoan('loan-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('devolución a tiempo: reembolsa depósito y registra entrega puntual', async () => {
      prisma.loan.findUnique.mockResolvedValue(baseLoan);
      prisma.loan.update.mockResolvedValue({
        ...baseLoan,
        status: 'RETURNED',
        depositStatus: 'REFUNDED',
      });
      prisma.copy.update.mockResolvedValue({});
      prisma.fine.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ loanBlockUntil: null });
      prisma.loan.count.mockResolvedValue(0);

      await service.returnLoan('loan-1', { condition: 'GOOD' });

      expect(prisma.loan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'RETURNED',
            depositStatus: 'REFUNDED',
          }),
        }),
      );
      expect(sanctionsService.registerOnTimeDelivery).toHaveBeenCalledWith(
        'u1',
      );
    });

    it('devolución tardía: no reembolsa depósito automáticamente', async () => {
      const lateLoan = {
        ...baseLoan,
        dueDate: new Date(Date.now() - 86400000),
      };
      prisma.loan.findUnique.mockResolvedValue(lateLoan);
      prisma.loan.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...lateLoan, ...data }),
      );
      prisma.copy.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ loanBlockUntil: null });
      prisma.loan.count.mockResolvedValue(0);

      await service.returnLoan('loan-1');

      const updateData = prisma.loan.update.mock.calls[0][0].data;
      expect(updateData.depositStatus).toBeUndefined();
      expect(sanctionsService.registerOnTimeDelivery).not.toHaveBeenCalled();
    });

    it('anula multa de Día 1 si devuelve a tiempo', async () => {
      prisma.loan.findUnique.mockResolvedValue(baseLoan);
      prisma.loan.update.mockResolvedValue({ ...baseLoan, status: 'RETURNED' });
      prisma.copy.update.mockResolvedValue({});
      prisma.fine.findFirst.mockResolvedValue({ fineId: 'fine-day1' });
      prisma.user.findUnique.mockResolvedValue({ loanBlockUntil: null });
      prisma.loan.count.mockResolvedValue(0);

      await service.returnLoan('loan-1');

      expect(finesService.annulFine).toHaveBeenCalledWith(
        'fine-day1',
        'SYSTEM',
      );
    });

    it('limpia bloqueo preventivo (2099) si no quedan otros OVERDUE', async () => {
      prisma.loan.findUnique.mockResolvedValue(baseLoan);
      prisma.loan.update.mockResolvedValue({ ...baseLoan, status: 'RETURNED' });
      prisma.copy.update.mockResolvedValue({});
      prisma.fine.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({
        loanBlockUntil: new Date('2099-12-31'),
      });
      prisma.loan.count.mockResolvedValue(0);

      await service.returnLoan('loan-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: { loanBlockUntil: null },
      });
      expect(auditLog.log).toHaveBeenCalledWith(
        'CLEAR_PREVENTIVE_BLOCK',
        'User',
        'u1',
        'SYSTEM',
        expect.any(Object),
      );
    });

    it('mantiene bloqueo preventivo si aún hay otros préstamos OVERDUE', async () => {
      prisma.loan.findUnique.mockResolvedValue(baseLoan);
      prisma.loan.update.mockResolvedValue({ ...baseLoan, status: 'RETURNED' });
      prisma.copy.update.mockResolvedValue({});
      prisma.fine.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({
        loanBlockUntil: new Date('2099-12-31'),
      });
      prisma.loan.count.mockResolvedValue(1);

      await service.returnLoan('loan-1');

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('actualiza condición física del ejemplar al devolver', async () => {
      prisma.loan.findUnique.mockResolvedValue(baseLoan);
      prisma.loan.update.mockResolvedValue({ ...baseLoan, status: 'RETURNED' });
      prisma.copy.update.mockResolvedValue({});
      prisma.fine.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ loanBlockUntil: null });
      prisma.loan.count.mockResolvedValue(0);

      await service.returnLoan('loan-1', { condition: 'DAMAGED' });

      expect(prisma.copy.update).toHaveBeenCalledWith({
        where: { copyId: 'c1' },
        data: {
          status: 'AVAILABLE',
          condition: 'DAMAGED',
        },
      });
    });
  });
});
