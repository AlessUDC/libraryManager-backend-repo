import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { LoanStatus, LoanType, SanctionType } from '@prisma/client';
import { FinesService } from './fines.service';
import { SanctionsService } from './sanctions.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private finesService: FinesService,
    private sanctionsService: SanctionsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleOverdueLoans() {
    this.logger.log('Running daily overdue loans check...');

    const now = new Date();

    // Find all active home loans that are overdue
    const overdueLoans = await this.prisma.loan.findMany({
      where: {
        status: LoanStatus.ACTIVE,
        type: LoanType.HOME,
        dueDate: { lt: now },
      },
    });

    for (const loan of overdueLoans) {
      // 1. Mark as OVERDUE if not already
      if (loan.status !== LoanStatus.OVERDUE) {
        await this.prisma.loan.update({
          where: { loanId: loan.loanId },
          data: { status: LoanStatus.OVERDUE },
        });
      }

      // 2. Calculate delay in days
      const diffTime = Math.abs(now.getTime() - loan.dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // 3. Daily fine (e.g., 2.50 per day)
      await this.finesService.createFine(
        loan.userId,
        loan.loanId,
        2.5,
        `Multa diaria por retraso (Día ${diffDays})`,
      );

      // 4. Sanctions logic
      if (diffDays === 1) {
        // Day 1: LEVE + Block system until return
        await this.sanctionsService.applySanction(
          loan.userId,
          loan.loanId,
          SanctionType.LEVE,
        );

        // Block user from making new reservations until they return this book
        // We use a far future date to represent "Blocked until resolved"
        await this.prisma.user.update({
          where: { userId: loan.userId },
          data: { systemBlockUntil: new Date('2099-12-31T23:59:59Z') },
        });
      } else if (diffDays === 3) {
        // Day 3: GRAVE
        await this.sanctionsService.applySanction(
          loan.userId,
          loan.loanId,
          SanctionType.GRAVE,
        );
      } else if (diffDays === 9) {
        // Day 9: MUY GRAVE
        await this.sanctionsService.applySanction(
          loan.userId,
          loan.loanId,
          SanctionType.MUY_GRAVE,
        );
      }
    }

    this.logger.log(`Processed ${overdueLoans.length} overdue loans.`);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleLibraryOverdueLoans() {
    // LIBRARY loans must be returned by 19:00 same day
    const now = new Date();
    if (now.getHours() >= 19) {
      const overdueLibraryLoans = await this.prisma.loan.findMany({
        where: {
          status: LoanStatus.ACTIVE,
          type: LoanType.LIBRARY,
          dueDate: { lt: now },
        },
      });

      for (const loan of overdueLibraryLoans) {
        // Apply immediate sanction LEVE and mark as OVERDUE
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
}
