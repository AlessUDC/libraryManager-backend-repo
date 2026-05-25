/**
 * Tests de flujo integrado (módulos acoplados con mocks compartidos)
 * Cubre escenarios end-to-end de la lógica disciplinaria sin base de datos real.
 */
import { SanctionsService } from './sanctions.service';
import { FinesService } from './fines.service';
import { CronService } from './cron.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { SanctionStatus, SanctionType, FineStatus, LoanStatus, LoanType } from '@prisma/client';
import { createPrismaMock, PrismaMock } from '../../../test/helpers/prisma-mock';

describe('Flujo integrado: préstamos vencidos → multas + sanciones + bloqueos', () => {
  let prisma: PrismaMock;
  let sanctionsService: SanctionsService;
  let finesService: FinesService;
  let cronService: CronService;

  beforeEach(() => {
    prisma = createPrismaMock();
    const auditLog = { log: jest.fn().mockResolvedValue({}) };
    sanctionsService = new SanctionsService(prisma as unknown as PrismaService);
    finesService = new FinesService(
      prisma as unknown as PrismaService,
      auditLog as unknown as AuditLogService,
    );
    cronService = new CronService(
      prisma as unknown as PrismaService,
      finesService,
      sanctionsService,
    );
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 4, 20, 12, 0, 45));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('escenario día 1: multa + LEVE + bloqueo preventivo; la sanción persiste si se anula la multa', async () => {
    const dueDate = new Date(2026, 4, 20, 12, 0, 0);

    prisma.loan.findMany.mockResolvedValue([
      {
        loanId: 'loan-1',
        userId: 'stu-1',
        status: LoanStatus.ACTIVE,
        type: LoanType.HOME,
        dueDate,
        copy: { book: { cost: 10 } },
      },
    ]);
    prisma.fine.findMany.mockResolvedValue([]);
    prisma.loan.update.mockResolvedValue({});
    prisma.sanction.create.mockResolvedValue({ sanctionId: 's1' });
    prisma.sanction.findMany.mockResolvedValue([
      {
        sanctionId: 's1',
        type: SanctionType.LEVE,
        status: SanctionStatus.PENDING,
      },
    ]);
    prisma.user.findUnique.mockResolvedValue({ loanBlockUntil: null });
    prisma.fine.create.mockResolvedValue({ fineId: 'f1' });

    await cronService.handleOverdueLoans();

    expect(prisma.fine.create).toHaveBeenCalled();
    expect(prisma.sanction.create).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { loanBlockUntil: new Date('2099-12-31T23:59:59Z') },
      }),
    );

    prisma.fine.update.mockResolvedValue({
      fineId: 'f1',
      loanId: 'loan-1',
      loan: { loanId: 'loan-1', status: 'RETURNED', depositAmount: 20, depositStatus: 'HELD', fines: [] },
    });
    prisma.loan.findUnique.mockResolvedValue({
      loanId: 'loan-1',
      status: 'RETURNED',
      depositAmount: 20,
      depositStatus: 'HELD',
      fines: [{ status: FineStatus.ANNULLED }],
    });

    await finesService.annulFine('f1', 'SYSTEM');

    expect(prisma.sanction.create).toHaveBeenCalled();
    expect(prisma.fine.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: FineStatus.ANNULLED },
      }),
    );
  });

  it('escenario acumulación: 3 LEVE disparan bloqueo disciplinario adicional', async () => {
    const pendingLeves = [1, 2, 3].map((i) => ({
      sanctionId: `s${i}`,
      type: SanctionType.LEVE,
      status: SanctionStatus.PENDING,
      userId: 'stu-1',
      loanId: `loan-${i}`,
    }));

    prisma.sanction.create.mockResolvedValue({});
    prisma.sanction.findMany.mockResolvedValue(pendingLeves);
    prisma.user.findUnique.mockResolvedValue({ loanBlockUntil: null });

    await sanctionsService.applySanction('stu-1', 'loan-3', SanctionType.LEVE);

    expect(prisma.sanction.updateMany).toHaveBeenCalledWith({
      where: { sanctionId: { in: ['s1', 's2', 's3'] } },
      data: { status: SanctionStatus.APPLIED },
    });
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('escenario: usuario bloqueado por loanBlockUntil no puede reservar (vía isUserBlocked)', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    prisma.user.findUnique.mockResolvedValue({
      loanBlockUntil: future,
      systemBlockUntil: null,
    });
    prisma.loan.count.mockResolvedValue(0);

    const blocked = await sanctionsService.isUserBlocked('stu-1');
    expect(blocked).toBe(true);
  });

  it('escenario: préstamo OVERDUE bloquea aunque loanBlockUntil haya expirado', async () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    prisma.user.findUnique.mockResolvedValue({
      loanBlockUntil: past,
      systemBlockUntil: null,
    });
    prisma.loan.count.mockResolvedValue(1);

    expect(await sanctionsService.isUserBlocked('stu-1')).toBe(true);
  });
});
