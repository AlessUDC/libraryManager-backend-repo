import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { LoanStatus, LoanType, SanctionType, FineStatus } from '@prisma/client';
import { FinesService } from './fines.service';
import { SanctionsService } from './sanctions.service';
import {
  countOverduePenaltyDays,
  shouldApplyDailyPenaltyLogic,
} from '../../../common/business-calendar';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private finesService: FinesService,
    private sanctionsService: SanctionsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleOverdueLoans() {
    this.logger.log('Running daily overdue loans check...');

    const now = new Date();
    const applyDailyPenalties = shouldApplyDailyPenaltyLogic(now);

    const overdueLoans = await this.prisma.loan.findMany({
      where: {
        status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
        type: LoanType.HOME,
        dueDate: { lt: now },
      },
      include: {
        copy: {
          include: {
            book: true,
          },
        },
      },
    });

    for (const loan of overdueLoans) {
      if (loan.status !== LoanStatus.OVERDUE) {
        await this.prisma.loan.update({
          where: { loanId: loan.loanId },
          data: { status: LoanStatus.OVERDUE },
        });
      }

      const diffDays = countOverduePenaltyDays(loan.dueDate, now);

      if (!applyDailyPenalties) {
        continue;
      }

      const bookCost = loan.copy?.book?.cost || 0;
      const maxFineCap = bookCost > 0 ? bookCost * 2 : 50.0;

      const existingFines = await this.prisma.fine.findMany({
        where: {
          loanId: loan.loanId,
          status: { in: [FineStatus.PENDING, FineStatus.PAID] },
        },
      });
      const totalFinesAccumulated = existingFines.reduce(
        (sum, f) => sum + f.amount,
        0,
      );

      const alreadyHasFineForThisDay = existingFines.some((f) =>
        f.description.includes(`Día ${diffDays}`),
      );

      if (totalFinesAccumulated < maxFineCap && !alreadyHasFineForThisDay) {
        let fineAmount = 2.5;
        if (totalFinesAccumulated + fineAmount > maxFineCap) {
          fineAmount = maxFineCap - totalFinesAccumulated;
        }

        if (fineAmount > 0) {
          await this.finesService.createFine(
            loan.userId,
            loan.loanId,
            fineAmount,
            `Multa diaria por retraso (Día ${diffDays})`,
          );
        }
      }

      if (diffDays === 1) {
        await this.sanctionsService.applySanction(
          loan.userId,
          loan.loanId,
          SanctionType.LEVE,
        );

        await this.prisma.user.update({
          where: { userId: loan.userId },
          data: { loanBlockUntil: new Date('2099-12-31T23:59:59Z') },
        });
      } else if (diffDays === 3) {
        await this.sanctionsService.applySanction(
          loan.userId,
          loan.loanId,
          SanctionType.GRAVE,
        );
      } else if (diffDays === 9) {
        await this.sanctionsService.applySanction(
          loan.userId,
          loan.loanId,
          SanctionType.MUY_GRAVE,
        );

        await this.prisma.user.update({
          where: { userId: loan.userId },
          data: { systemBlockUntil: new Date('2099-12-31T23:59:59Z') },
        });
      }
    }

    this.logger.log(`Processed ${overdueLoans.length} overdue loans.`);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleLibraryOverdueLoans() {
    const now = new Date();

    const overdueLibraryLoans = await this.prisma.loan.findMany({
      where: {
        status: LoanStatus.ACTIVE,
        type: LoanType.LIBRARY,
        dueDate: { lt: now },
      },
    });

    for (const loan of overdueLibraryLoans) {
      await this.prisma.loan.update({
        where: { loanId: loan.loanId },
        data: { status: LoanStatus.OVERDUE },
      });

      await this.sanctionsService.applySanction(
        loan.userId,
        loan.loanId,
        SanctionType.LEVE,
      );
    }
  }
}
