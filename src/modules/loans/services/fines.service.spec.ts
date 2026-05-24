import { Test, TestingModule } from '@nestjs/testing';
import { FinesService } from './fines.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { FineStatus } from '@prisma/client';
import { createPrismaMock, PrismaMock } from '../../../test/helpers/prisma-mock';

describe('FinesService', () => {
  let service: FinesService;
  let prisma: PrismaMock;
  let auditLog: { log: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    auditLog = { log: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLog },
      ],
    }).compile();

    service = module.get(FinesService);
    jest.clearAllMocks();
  });

  describe('createFine', () => {
    it('crea multa en estado PENDING', async () => {
      prisma.fine.create.mockResolvedValue({
        fineId: 'fine-1',
        amount: 2.5,
        status: FineStatus.PENDING,
      });

      const result = await service.createFine(
        'user-1',
        'loan-1',
        2.5,
        'Multa diaria (Día 1)',
      );

      expect(prisma.fine.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          loanId: 'loan-1',
          amount: 2.5,
          description: 'Multa diaria (Día 1)',
          status: FineStatus.PENDING,
        },
      });
      expect(result.status).toBe(FineStatus.PENDING);
    });
  });

  describe('markAsPaid', () => {
    it('marca como PAID y registra auditoría', async () => {
      prisma.fine.update.mockResolvedValue({
        fineId: 'fine-1',
        amount: 5,
        description: 'Multa',
        loanId: 'loan-1',
        loan: { loanId: 'loan-1', status: 'RETURNED', depositAmount: 20, depositStatus: 'HELD', fines: [] },
      });
      prisma.loan.findUnique.mockResolvedValue({
        loanId: 'loan-1',
        status: 'RETURNED',
        depositAmount: 20,
        depositStatus: 'HELD',
        fines: [{ status: FineStatus.PAID }],
      });
      prisma.loan.update.mockResolvedValue({});

      await service.markAsPaid('fine-1', 'admin-1');

      expect(auditLog.log).toHaveBeenCalledWith(
        'PAY_FINE',
        'Fine',
        'fine-1',
        'admin-1',
        expect.any(Object),
      );
    });

    it('reembolsa depósito cuando no quedan multas pendientes y el libro fue devuelto', async () => {
      prisma.fine.update.mockResolvedValue({
        fineId: 'fine-1',
        loanId: 'loan-1',
        loan: {},
      });
      prisma.loan.findUnique.mockResolvedValue({
        loanId: 'loan-1',
        status: 'RETURNED',
        depositAmount: 40,
        depositStatus: 'HELD',
        fines: [{ status: FineStatus.PAID }],
      });
      prisma.loan.update.mockResolvedValue({});

      await service.markAsPaid('fine-1', 'admin-1');

      expect(prisma.loan.update).toHaveBeenCalledWith({
        where: { loanId: 'loan-1' },
        data: { depositStatus: 'REFUNDED' },
      });
      expect(auditLog.log).toHaveBeenCalledWith(
        'REFUND_DEPOSIT_AUTOMATIC',
        'Loan',
        'loan-1',
        'admin-1',
        expect.any(Object),
      );
    });

    it('no reembolsa depósito si aún hay multas PENDING', async () => {
      prisma.fine.update.mockResolvedValue({
        fineId: 'fine-1',
        loanId: 'loan-1',
        loan: {},
      });
      prisma.loan.findUnique.mockResolvedValue({
        loanId: 'loan-1',
        status: 'RETURNED',
        depositAmount: 40,
        depositStatus: 'HELD',
        fines: [
          { status: FineStatus.PAID },
          { status: FineStatus.PENDING },
        ],
      });

      await service.markAsPaid('fine-1', 'admin-1');

      expect(prisma.loan.update).not.toHaveBeenCalled();
    });
  });

  describe('annulFine', () => {
    it('anula multa pero mantiene trazabilidad (ANNULLED)', async () => {
      prisma.fine.update.mockResolvedValue({
        fineId: 'fine-1',
        amount: 2.5,
        description: 'Día 1',
        loanId: 'loan-1',
        loan: {},
      });
      prisma.loan.findUnique.mockResolvedValue({
        loanId: 'loan-1',
        status: 'RETURNED',
        depositAmount: null,
        depositStatus: null,
        fines: [],
      });

      await service.annulFine('fine-1', 'SYSTEM');

      expect(prisma.fine.update).toHaveBeenCalledWith({
        where: { fineId: 'fine-1' },
        data: { status: FineStatus.ANNULLED },
        include: { loan: true },
      });
      expect(auditLog.log).toHaveBeenCalledWith(
        'ANNUL_FINE',
        'Fine',
        'fine-1',
        'SYSTEM',
        expect.any(Object),
      );
    });

    it('no reembolsa depósito si el préstamo sigue ACTIVE', async () => {
      prisma.fine.update.mockResolvedValue({
        fineId: 'fine-1',
        loanId: 'loan-1',
        loan: {},
      });
      prisma.loan.findUnique.mockResolvedValue({
        loanId: 'loan-1',
        status: 'ACTIVE',
        depositAmount: 30,
        depositStatus: 'HELD',
        fines: [],
      });

      await service.annulFine('fine-1', 'SYSTEM');

      expect(prisma.loan.update).not.toHaveBeenCalled();
    });
  });
});
