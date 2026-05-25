import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FineStatus } from '@prisma/client';
import { AuditLogService } from '../../audit-log/audit-log.service';

@Injectable()
export class FinesService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async createFine(
    userId: string,
    loanId: string,
    amount: number,
    description: string,
  ) {
    return this.prisma.fine.create({
      data: {
        userId,
        loanId,
        amount,
        description,
        status: FineStatus.PENDING,
      },
    });
  }

  async markAsPaid(fineId: string, performedBy: string) {
    const updatedFine = await this.prisma.fine.update({
      where: { fineId },
      data: {
        status: FineStatus.PAID,
        paidAt: new Date(),
      },
      include: { loan: true },
    });

    await this.auditLogService.log('PAY_FINE', 'Fine', fineId, performedBy, {
      amount: updatedFine.amount,
      description: updatedFine.description,
    });

    await this.checkAndRefundDeposit(updatedFine.loanId, performedBy);

    return updatedFine;
  }

  async annulFine(fineId: string, performedBy: string) {
    const updatedFine = await this.prisma.fine.update({
      where: { fineId },
      data: {
        status: FineStatus.ANNULLED,
      },
      include: { loan: true },
    });

    await this.auditLogService.log('ANNUL_FINE', 'Fine', fineId, performedBy, {
      amount: updatedFine.amount,
      description: updatedFine.description,
    });

    await this.checkAndRefundDeposit(updatedFine.loanId, performedBy);

    return updatedFine;
  }

  private async checkAndRefundDeposit(loanId: string, performedBy: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { loanId },
      include: { fines: true },
    });

    if (!loan) return;

    const hasPendingFines = loan.fines.some(
      (f) => f.status === FineStatus.PENDING,
    );

    if (
      !hasPendingFines &&
      loan.status === 'RETURNED' &&
      loan.depositAmount &&
      loan.depositStatus === 'HELD'
    ) {
      await this.prisma.loan.update({
        where: { loanId },
        data: { depositStatus: 'REFUNDED' },
      });

      await this.auditLogService.log(
        'REFUND_DEPOSIT_AUTOMATIC',
        'Loan',
        loanId,
        performedBy,
        {
          reason:
            'Todas las multas han sido pagadas/anuladas y el libro devuelto.',
        },
      );
    }
  }

  async getUserFines(userId: string) {
    return this.prisma.fine.findMany({
      where: { userId },
      include: {
        loan: {
          include: {
            copy: {
              include: {
                book: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAllFines() {
    return this.prisma.fine.findMany({
      include: {
        user: { include: { userData: true } },
        loan: { include: { copy: { include: { book: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
