import { Test, TestingModule } from '@nestjs/testing';
import { CronService } from './cron.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FinesService } from './fines.service';
import { SanctionsService } from './sanctions.service';
import { LoanStatus, LoanType, SanctionType } from '@prisma/client';
import { createPrismaMock, PrismaMock } from '../../../test/helpers/prisma-mock';

/** Miércoles 20-may-2026 12:00:45 — día hábil fijo para tests del cron */
const FIXED_NOW = new Date(2026, 4, 20, 12, 0, 45);

function dueAtOffsetMinutes(minutes: number): Date {
  return new Date(FIXED_NOW.getTime() - minutes * 60 * 1000);
}

describe('CronService — flujo de préstamos vencidos (flujoPrestamos.txt)', () => {
  let service: CronService;
  let prisma: PrismaMock;
  let finesService: { createFine: jest.Mock };
  let sanctionsService: { applySanction: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);

    prisma = createPrismaMock();
    finesService = { createFine: jest.fn().mockResolvedValue({}) };
    sanctionsService = { applySanction: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronService,
        { provide: PrismaService, useValue: prisma },
        { provide: FinesService, useValue: finesService },
        { provide: SanctionsService, useValue: sanctionsService },
      ],
    }).compile();

    service = module.get(CronService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const makeOverdueLoan = (dueDate: Date, overrides: Record<string, unknown> = {}) => ({
    loanId: 'loan-1',
    userId: 'user-1',
    status: LoanStatus.ACTIVE,
    type: LoanType.HOME,
    dueDate,
    copy: { book: { cost: 10 } },
    ...overrides,
  });

  describe('handleOverdueLoans — domicilio', () => {
    it('no procesa nada si no hay préstamos vencidos', async () => {
      prisma.loan.findMany.mockResolvedValue([]);
      await service.handleOverdueLoans();
      expect(finesService.createFine).not.toHaveBeenCalled();
    });

    it('marca préstamo ACTIVE como OVERDUE aunque sea fin de semana', async () => {
      jest.setSystemTime(new Date(2026, 4, 23, 10, 0, 0)); // sábado
      const dueDate = new Date(2026, 4, 22, 12, 0, 0);

      prisma.loan.findMany.mockResolvedValue([makeOverdueLoan(dueDate)]);
      prisma.fine.findMany.mockResolvedValue([]);
      prisma.loan.update.mockResolvedValue({});

      await service.handleOverdueLoans();

      expect(prisma.loan.update).toHaveBeenCalledWith({
        where: { loanId: 'loan-1' },
        data: { status: LoanStatus.OVERDUE },
      });
      expect(finesService.createFine).not.toHaveBeenCalled();
      expect(sanctionsService.applySanction).not.toHaveBeenCalled();
      jest.setSystemTime(FIXED_NOW);
    });

    it('en sábado no crea multas ni sanciones por día, pero sí marca OVERDUE', async () => {
      jest.setSystemTime(new Date(2026, 4, 23, 15, 0, 0));
      const dueDate = dueAtOffsetMinutes(120);

      prisma.loan.findMany.mockResolvedValue([makeOverdueLoan(dueDate)]);
      prisma.fine.findMany.mockResolvedValue([]);
      prisma.loan.update.mockResolvedValue({});

      await service.handleOverdueLoans();

      expect(prisma.loan.update).toHaveBeenCalled();
      expect(finesService.createFine).not.toHaveBeenCalled();
      jest.setSystemTime(FIXED_NOW);
    });

    it('día 1 hábil: LEVE + bloqueo preventivo loanBlockUntil 2099', async () => {
      const dueDate = dueAtOffsetMinutes(1);

      prisma.loan.findMany.mockResolvedValue([makeOverdueLoan(dueDate)]);
      prisma.fine.findMany.mockResolvedValue([]);
      prisma.loan.update.mockResolvedValue({});

      await service.handleOverdueLoans();

      expect(sanctionsService.applySanction).toHaveBeenCalledWith(
        'user-1',
        'loan-1',
        SanctionType.LEVE,
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { loanBlockUntil: new Date('2099-12-31T23:59:59Z') },
      });
    });

    it('día 1: crea multa diaria (domicilio aplica multas)', async () => {
      prisma.loan.findMany.mockResolvedValue([makeOverdueLoan(dueAtOffsetMinutes(1))]);
      prisma.fine.findMany.mockResolvedValue([]);
      prisma.loan.update.mockResolvedValue({});

      await service.handleOverdueLoans();

      expect(finesService.createFine).toHaveBeenCalledWith(
        'user-1',
        'loan-1',
        expect.any(Number),
        expect.stringMatching(/Día 1/),
      );
    });

    it('no duplica multa para el mismo día de retraso', async () => {
      prisma.loan.findMany.mockResolvedValue([makeOverdueLoan(dueAtOffsetMinutes(1))]);
      prisma.fine.findMany.mockResolvedValue([
        { amount: 2.5, description: 'Multa diaria por retraso (Día 1)', status: 'PENDING' },
      ]);
      prisma.loan.update.mockResolvedValue({});

      await service.handleOverdueLoans();

      expect(finesService.createFine).not.toHaveBeenCalled();
    });

    it('respeta tope máximo de multas (2x costo del libro)', async () => {
      prisma.loan.findMany.mockResolvedValue([
        makeOverdueLoan(dueAtOffsetMinutes(1), { copy: { book: { cost: 10 } } }),
      ]);
      prisma.fine.findMany.mockResolvedValue([
        { amount: 20, description: 'Día 1', status: 'PENDING' },
      ]);
      prisma.loan.update.mockResolvedValue({});

      await service.handleOverdueLoans();

      expect(finesService.createFine).not.toHaveBeenCalled();
    });

    it('día 3 hábil: sanción GRAVE', async () => {
      prisma.loan.findMany.mockResolvedValue([makeOverdueLoan(dueAtOffsetMinutes(3))]);
      prisma.fine.findMany.mockResolvedValue([]);
      prisma.loan.update.mockResolvedValue({});

      await service.handleOverdueLoans();

      expect(sanctionsService.applySanction).toHaveBeenCalledWith(
        'user-1',
        'loan-1',
        SanctionType.GRAVE,
      );
    });

    it('día 9 hábil: MUY_GRAVE + bloqueo de sistema (gestor)', async () => {
      prisma.loan.findMany.mockResolvedValue([makeOverdueLoan(dueAtOffsetMinutes(9))]);
      prisma.fine.findMany.mockResolvedValue([]);
      prisma.loan.update.mockResolvedValue({});

      await service.handleOverdueLoans();

      expect(sanctionsService.applySanction).toHaveBeenCalledWith(
        'user-1',
        'loan-1',
        SanctionType.MUY_GRAVE,
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { systemBlockUntil: new Date('2099-12-31T23:59:59Z') },
      });
    });

    it('préstamo en sala (HOME) no debe procesarse en este cron', async () => {
      prisma.loan.findMany.mockResolvedValue([]);
      await service.handleOverdueLoans();
      expect(prisma.loan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: LoanType.HOME }),
        }),
      );
    });
  });

  describe('handleLibraryOverdueLoans — sala (sin multas, con sanciones)', () => {
    it('marca OVERDUE y aplica LEVE aunque sea fin de semana', async () => {
      jest.setSystemTime(new Date(2026, 4, 24, 20, 0, 0)); // domingo
      const dueDate = new Date(2026, 4, 23, 19, 0, 0);

      prisma.loan.findMany.mockResolvedValue([
        {
          loanId: 'lib-1',
          userId: 'user-1',
          status: LoanStatus.ACTIVE,
          type: LoanType.LIBRARY,
          dueDate,
        },
      ]);
      prisma.loan.update.mockResolvedValue({});

      await service.handleLibraryOverdueLoans();

      expect(prisma.loan.update).toHaveBeenCalled();
      expect(sanctionsService.applySanction).toHaveBeenCalledWith(
        'user-1',
        'lib-1',
        SanctionType.LEVE,
      );
      expect(finesService.createFine).not.toHaveBeenCalled();
      jest.setSystemTime(FIXED_NOW);
    });
  });
});
