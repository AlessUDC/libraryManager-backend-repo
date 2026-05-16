import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FineStatus } from '@prisma/client';

@Injectable()
export class FinesService {
  constructor(private prisma: PrismaService) {}

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

  async markAsPaid(fineId: string) {
    return this.prisma.fine.update({
      where: { fineId },
      data: {
        status: FineStatus.PAID,
        paidAt: new Date(),
      },
    });
  }

  async annulFine(fineId: string) {
    return this.prisma.fine.update({
      where: { fineId },
      data: {
        status: FineStatus.ANNULLED,
      },
    });
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
}
