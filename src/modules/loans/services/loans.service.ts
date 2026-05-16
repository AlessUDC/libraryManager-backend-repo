import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLoanDto,
  ReturnLoanDto,
} from '../dto/loan.dto';
import { CopyCondition, LoanType, Prisma } from '@prisma/client';
import { SanctionsService } from './sanctions.service';
import { FinesService } from './fines.service';

@Injectable()
export class LoansService {
  constructor(
    private prisma: PrismaService,
    private sanctionsService: SanctionsService,
    private finesService: FinesService,
  ) {}

  async createLoan(createLoanDto: CreateLoanDto) {
    const { userId, copyId, dueDate } = createLoanDto;

    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const copy = await this.prisma.copy.findUnique({
      where: { copyId },
      include: { book: true },
    });
    if (!copy) throw new NotFoundException('Ejemplar no encontrado');

    if (copy.status !== 'AVAILABLE') {
      throw new ConflictException(
        'El ejemplar no está disponible para préstamo',
      );
    }

    let depositAmount = null;
    if (copy.book?.cost) {
      depositAmount = copy.book.cost * 2;
    }

    return this.prisma.$transaction(async (prisma) => {
      const loan = await prisma.loan.create({
        data: {
          userId,
          copyId,
          dueDate: new Date(dueDate),
          status: 'ACTIVE',
          depositAmount,
          depositStatus: depositAmount ? 'HELD' : null,
        },
        include: { copy: { include: { book: true } } },
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
      include: { copy: { include: { book: true } } },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getAllLoans() {
    return this.prisma.loan.findMany({
      include: {
        user: { include: { userData: true } },
        copy: { include: { book: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async returnLoan(loanId: string, returnDto?: ReturnLoanDto) {
    const loan = await this.prisma.loan.findUnique({
      where: { loanId },
      include: { user: true },
    });
    if (!loan) throw new NotFoundException('Préstamo no encontrado');

    if (loan.status === 'RETURNED') {
      throw new ConflictException('El préstamo ya ha sido devuelto');
    }

    const now = new Date();
    const isLate = now > loan.dueDate;

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Loan
      const loanData: Prisma.LoanUpdateInput = {
        status: 'RETURNED',
        returnDate: now,
        observations: returnDto?.observations || null,
      };

      if (!isLate && loan.type === LoanType.HOME && loan.depositAmount) {
        loanData.depositStatus = 'REFUNDED';
      } else if (isLate && loan.type === LoanType.HOME && loan.depositAmount) {
        // Business Rule: If lost, forfeit. If just late, keep HELD until fines are paid?
        // Flujo says: "Si el estudiante no perdió el libro y lo devuelve: Paga la suma de multas, recupera el monto reembolsable."
        // We'll keep it HELD for now.
      }

      const updatedLoan = await tx.loan.update({
        where: { loanId },
        data: loanData,
        include: { copy: { include: { book: true } } },
      });

      // 2. Update Copy
      await tx.copy.update({
        where: { copyId: loan.copyId },
        data: {
          status: 'AVAILABLE',
          condition: returnDto?.condition
            ? (returnDto.condition as CopyCondition)
            : undefined,
        },
      });

      // 3. Sanctions & Streaks Logic
      if (!isLate) {
        await this.sanctionsService.registerOnTimeDelivery(loan.userId);

        // If they had a Day 1 temporary fine, annul it
        const day1Fine = await tx.fine.findFirst({
          where: { loanId, description: { contains: 'Día 1' } },
        });
        if (day1Fine) {
          await tx.fine.update({
            where: { fineId: day1Fine.fineId },
            data: { status: 'ANNULLED' },
          });
        }
      }

      // 4. Reactivate User if blocked preventively (Day 1 block)
      if (
        loan.user.systemBlockUntil &&
        loan.user.systemBlockUntil.getFullYear() === 2099
      ) {
        await tx.user.update({
          where: { userId: loan.userId },
          data: { systemBlockUntil: null }, // We clear it, but real sanctions might apply later if processed
        });
      }

      return updatedLoan;
    });
  }
}
