import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoanDto, UpdateLoanStatusDto } from '../dto/loan.dto';

@Injectable()
export class LoansService {
  constructor(private prisma: PrismaService) {}

  async createLoan(createLoanDto: CreateLoanDto) {
    const { userId, copyId, dueDate } = createLoanDto;

    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Check if copy is available
    const copy = await this.prisma.copy.findUnique({ where: { copyId } });
    if (!copy) {
      throw new NotFoundException('Ejemplar no encontrado');
    }
    if (copy.status !== 'AVAILABLE') {
      throw new ConflictException('El ejemplar no está disponible para préstamo');
    }

    // Create loan and update copy status in a transaction
    return this.prisma.$transaction(async (prisma) => {
      const loan = await prisma.loan.create({
        data: {
          userId,
          copyId,
          dueDate: new Date(dueDate),
          status: 'ACTIVE',
        },
        include: {
          copy: {
            include: { book: true }
          }
        }
      });

      await prisma.copy.update({
        where: { copyId },
        data: { status: 'LENT' },
      });

      return loan;
    });
  }

  async getLoansByUser(userId: string) {
    return this.prisma.loan.findMany({
      where: { userId },
      include: {
        copy: {
          include: { book: true }
        }
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getAllLoans() {
    return this.prisma.loan.findMany({
      include: {
        user: { include: { userData: true } },
        copy: { include: { book: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async returnLoan(loanId: string) {
    const loan = await this.prisma.loan.findUnique({ where: { loanId } });
    if (!loan) {
      throw new NotFoundException('Préstamo no encontrado');
    }

    if (loan.status === 'RETURNED') {
      throw new ConflictException('El préstamo ya ha sido devuelto');
    }

    return this.prisma.$transaction(async (prisma) => {
      const updatedLoan = await prisma.loan.update({
        where: { loanId },
        data: {
          status: 'RETURNED',
          returnDate: new Date(),
        },
        include: {
          copy: { include: { book: true } }
        }
      });

      await prisma.copy.update({
        where: { copyId: loan.copyId },
        data: { status: 'AVAILABLE' },
      });

      return updatedLoan;
    });
  }
}
