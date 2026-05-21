import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { LoanStatus, LoanType, SanctionType, FineStatus } from '@prisma/client';
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

  @Cron(CronExpression.EVERY_MINUTE)
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
      include: {
        copy: {
          include: {
            book: true,
          },
        },
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

      // 2. Calculate delay in minutes for simulation (or days in production)
      const diffTime = Math.abs(now.getTime() - loan.dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60)); // minutes represent days in this simulation

      // 3. Daily fine logic with Fine Cap
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

      // Check if we already created a fine for this specific diffDays day/minute to avoid duplicates
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

      // 4. Sanctions logic
      if (diffDays === 1) {
        // Day 1: LEVE + Block system until return
        await this.sanctionsService.applySanction(
          loan.userId,
          loan.loanId,
          SanctionType.LEVE,
        );

        // Block user from making new reservations/loans until they return this book
        // We use a far future date to represent "Blocked until resolved" in loanBlockUntil
        await this.prisma.user.update({
          where: { userId: loan.userId },
          data: { loanBlockUntil: new Date('2099-12-31T23:59:59Z') },
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
    const now = new Date();
    // LIBRARY loans must be returned by 19:00 same day
    // Validate if currently past 19:00, or if it is already past dueDate (which includes specific hour)
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
