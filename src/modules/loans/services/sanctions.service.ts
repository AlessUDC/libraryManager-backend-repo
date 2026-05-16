import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SanctionType, SanctionStatus } from '@prisma/client';

@Injectable()
export class SanctionsService {
  constructor(private prisma: PrismaService) {}

  async applySanction(userId: string, loanId: string, type: SanctionType) {
    // 1. Create the sanction record
    await this.prisma.sanction.create({
      data: {
        userId,
        loanId,
        type,
        status: SanctionStatus.PENDING,
      },
    });

    // 2. Check for thresholds and apply blocks
    await this.processPendingSanctions(userId);
  }

  private async processPendingSanctions(userId: string) {
    const pending = await this.prisma.sanction.findMany({
      where: { userId, status: SanctionStatus.PENDING },
    });

    const leves = pending.filter((s) => s.type === SanctionType.LEVE);
    const graves = pending.filter((s) => s.type === SanctionType.GRAVE);
    const muyGraves = pending.filter((s) => s.type === SanctionType.MUY_GRAVE);

    let totalDaysToBlock = 0;
    const sanctionsToApply: string[] = [];

    // Rule: 3 LEVE -> 3 days
    if (leves.length >= 3) {
      totalDaysToBlock += 3;
      sanctionsToApply.push(...leves.slice(0, 3).map((s) => s.sanctionId));
    }

    // Rule: 2 GRAVE -> 5 days
    if (graves.length >= 2) {
      totalDaysToBlock += 5;
      sanctionsToApply.push(...graves.slice(0, 2).map((s) => s.sanctionId));
    }

    // Rule: 1 MUY GRAVE -> 7 days
    if (muyGraves.length >= 1) {
      totalDaysToBlock += 7;
      sanctionsToApply.push(...muyGraves.slice(0, 1).map((s) => s.sanctionId));
    }

    if (totalDaysToBlock > 0) {
      // Apply block to user
      const user = await this.prisma.user.findUnique({ where: { userId } });
      const currentBlock =
        user?.systemBlockUntil && user.systemBlockUntil > new Date()
          ? user.systemBlockUntil
          : new Date();

      const newBlockUntil = new Date(currentBlock);
      newBlockUntil.setDate(newBlockUntil.getDate() + totalDaysToBlock);

      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { userId },
          data: { systemBlockUntil: newBlockUntil },
        }),
        this.prisma.sanction.updateMany({
          where: { sanctionId: { in: sanctionsToApply } },
          data: { status: SanctionStatus.APPLIED },
        }),
      ]);
    }
  }

  async registerOnTimeDelivery(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) return;

    const newCount = student.onTimeDeliveriesCount + 1;

    await this.prisma.student.update({
      where: { userId },
      data: { onTimeDeliveriesCount: newCount },
    });

    // Check if we can redeem sanctions
    // -1 if returns 3 times consecutive LEVE
    if (newCount % 3 === 0) {
      await this.redeemSanction(userId, SanctionType.LEVE);
    }
    // -1 if returns 5 times consecutive GRAVE
    if (newCount % 5 === 0) {
      await this.redeemSanction(userId, SanctionType.GRAVE);
    }
    // -1 if returns 7 times consecutive MUY_GRAVE
    if (newCount % 7 === 0) {
      await this.redeemSanction(userId, SanctionType.MUY_GRAVE);
    }
  }

  private async redeemSanction(userId: string, type: SanctionType) {
    const oldestPending = await this.prisma.sanction.findFirst({
      where: { userId, type, status: SanctionStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });

    if (oldestPending) {
      await this.prisma.sanction.update({
        where: { sanctionId: oldestPending.sanctionId },
        data: { status: SanctionStatus.REDEEMED },
      });
    }
  }

  async isUserBlocked(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { systemBlockUntil: true },
    });
    return !!(user?.systemBlockUntil && user.systemBlockUntil > new Date());
  }
}
