import { Test, TestingModule } from '@nestjs/testing';
import { SanctionsService } from './sanctions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SanctionStatus, SanctionType } from '@prisma/client';
import { createPrismaMock, PrismaMock } from '../../../test/helpers/prisma-mock';

describe('SanctionsService', () => {
  let service: SanctionsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SanctionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SanctionsService);
    jest.clearAllMocks();
  });

  describe('applySanction', () => {
    it('crea sanción PENDING y evalúa umbrales', async () => {
      prisma.sanction.create.mockResolvedValue({ sanctionId: 's1' });
      prisma.sanction.findMany.mockResolvedValue([]);

      await service.applySanction('user-1', 'loan-1', SanctionType.LEVE);

      expect(prisma.sanction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          loanId: 'loan-1',
          type: SanctionType.LEVE,
          status: SanctionStatus.PENDING,
        },
      });
    });

    it('aplica bloqueo de 3 días al acumular 3 sanciones LEVE', async () => {
      const leves = [1, 2, 3].map((i) => ({
        sanctionId: `leve-${i}`,
        type: SanctionType.LEVE,
        status: SanctionStatus.PENDING,
      }));

      prisma.sanction.create.mockResolvedValue({});
      prisma.sanction.findMany.mockResolvedValue(leves);
      prisma.user.findUnique.mockResolvedValue({ loanBlockUntil: null });

      await service.applySanction('user-1', 'loan-1', SanctionType.LEVE);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          data: expect.objectContaining({
            loanBlockUntil: expect.any(Date),
          }),
        }),
      );
      expect(prisma.sanction.updateMany).toHaveBeenCalledWith({
        where: { sanctionId: { in: ['leve-1', 'leve-2', 'leve-3'] } },
        data: { status: SanctionStatus.APPLIED },
      });
    });

    it('aplica bloqueo de 5 días con 2 sanciones GRAVE', async () => {
      const graves = [1, 2].map((i) => ({
        sanctionId: `grave-${i}`,
        type: SanctionType.GRAVE,
        status: SanctionStatus.PENDING,
      }));

      prisma.sanction.create.mockResolvedValue({});
      prisma.sanction.findMany.mockResolvedValue(graves);
      prisma.user.findUnique.mockResolvedValue({ loanBlockUntil: null });

      await service.applySanction('user-1', 'loan-1', SanctionType.GRAVE);

      const updateCall = prisma.user.update.mock.calls[0][0];
      const blockUntil: Date = updateCall.data.loanBlockUntil;
      const diffDays = Math.round(
        (blockUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(4);
      expect(diffDays).toBeLessThanOrEqual(6);
    });

    it('aplica bloqueo de 7 días con 1 sanción MUY_GRAVE', async () => {
      prisma.sanction.create.mockResolvedValue({});
      prisma.sanction.findMany.mockResolvedValue([
        {
          sanctionId: 'mg-1',
          type: SanctionType.MUY_GRAVE,
          status: SanctionStatus.PENDING,
        },
      ]);
      prisma.user.findUnique.mockResolvedValue({ loanBlockUntil: null });

      await service.applySanction('user-1', 'loan-1', SanctionType.MUY_GRAVE);

      const blockUntil: Date =
        prisma.user.update.mock.calls[0][0].data.loanBlockUntil;
      const diffDays = Math.round(
        (blockUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(6);
      expect(diffDays).toBeLessThanOrEqual(8);
    });

    it('extiende bloqueo existente en lugar de sobrescribirlo', async () => {
      const futureBlock = new Date();
      futureBlock.setDate(futureBlock.getDate() + 2);

      prisma.sanction.create.mockResolvedValue({});
      prisma.sanction.findMany.mockResolvedValue(
        [1, 2, 3].map((i) => ({
          sanctionId: `l-${i}`,
          type: SanctionType.LEVE,
          status: SanctionStatus.PENDING,
        })),
      );
      prisma.user.findUnique.mockResolvedValue({
        loanBlockUntil: futureBlock,
      });

      await service.applySanction('user-1', 'loan-1', SanctionType.LEVE);

      const newBlock: Date =
        prisma.user.update.mock.calls[0][0].data.loanBlockUntil;
      expect(newBlock.getTime()).toBeGreaterThan(futureBlock.getTime());
    });

    it('no aplica bloqueo si no se alcanzan umbrales', async () => {
      prisma.sanction.create.mockResolvedValue({});
      prisma.sanction.findMany.mockResolvedValue([
        {
          sanctionId: 'l-1',
          type: SanctionType.LEVE,
          status: SanctionStatus.PENDING,
        },
      ]);

      await service.applySanction('user-1', 'loan-1', SanctionType.LEVE);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('registerOnTimeDelivery', () => {
    it('no hace nada si el usuario no es estudiante', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await service.registerOnTimeDelivery('teacher-1');

      expect(prisma.student.update).not.toHaveBeenCalled();
    });

    it('incrementa onTimeDeliveriesCount', async () => {
      prisma.student.findUnique.mockResolvedValue({
        userId: 'stu-1',
        onTimeDeliveriesCount: 2,
      });
      prisma.student.update.mockResolvedValue({
        onTimeDeliveriesCount: 3,
      });
      prisma.sanction.findFirst.mockResolvedValue(null);

      await service.registerOnTimeDelivery('stu-1');

      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { userId: 'stu-1' },
        data: { onTimeDeliveriesCount: 3 },
      });
    });

    it('redime sanción LEVE al llegar a 3 entregas a tiempo', async () => {
      prisma.student.findUnique.mockResolvedValue({
        userId: 'stu-1',
        onTimeDeliveriesCount: 2,
      });
      prisma.student.update.mockResolvedValue({ onTimeDeliveriesCount: 3 });
      prisma.sanction.findFirst.mockResolvedValue({
        sanctionId: 's-leve',
        type: SanctionType.LEVE,
      });

      await service.registerOnTimeDelivery('stu-1');

      expect(prisma.sanction.update).toHaveBeenCalledWith({
        where: { sanctionId: 's-leve' },
        data: { status: SanctionStatus.REDEEMED },
      });
    });

    it('redime sanción GRAVE al llegar a 5 entregas a tiempo', async () => {
      prisma.student.findUnique.mockResolvedValue({
        userId: 'stu-1',
        onTimeDeliveriesCount: 4,
      });
      prisma.student.update.mockResolvedValue({ onTimeDeliveriesCount: 5 });
      prisma.sanction.findFirst.mockResolvedValue({
        sanctionId: 's-grave',
        type: SanctionType.GRAVE,
      });

      await service.registerOnTimeDelivery('stu-1');

      expect(prisma.sanction.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'stu-1',
          type: SanctionType.GRAVE,
          status: SanctionStatus.PENDING,
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('isUserBlocked', () => {
    it('retorna true con loanBlockUntil futuro', async () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      prisma.user.findUnique.mockResolvedValue({
        loanBlockUntil: future,
        systemBlockUntil: null,
      });
      prisma.loan.count.mockResolvedValue(0);

      expect(await service.isUserBlocked('user-1')).toBe(true);
    });

    it('retorna true con systemBlockUntil futuro', async () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      prisma.user.findUnique.mockResolvedValue({
        loanBlockUntil: null,
        systemBlockUntil: future,
      });
      prisma.loan.count.mockResolvedValue(0);

      expect(await service.isUserBlocked('user-1')).toBe(true);
    });

    it('retorna true si tiene préstamos OVERDUE aunque no tenga bloqueo temporal', async () => {
      prisma.user.findUnique.mockResolvedValue({
        loanBlockUntil: null,
        systemBlockUntil: null,
      });
      prisma.loan.count.mockResolvedValue(2);

      expect(await service.isUserBlocked('user-1')).toBe(true);
    });

    it('retorna false sin bloqueos ni préstamos vencidos', async () => {
      prisma.user.findUnique.mockResolvedValue({
        loanBlockUntil: null,
        systemBlockUntil: null,
      });
      prisma.loan.count.mockResolvedValue(0);

      expect(await service.isUserBlocked('user-1')).toBe(false);
    });

    it('ignora loanBlockUntil en el pasado', async () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      prisma.user.findUnique.mockResolvedValue({
        loanBlockUntil: past,
        systemBlockUntil: null,
      });
      prisma.loan.count.mockResolvedValue(0);

      expect(await service.isUserBlocked('user-1')).toBe(false);
    });
  });
});
