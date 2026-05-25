import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoanDto, ReturnLoanDto } from '../dto/loan.dto';
import { CopyCondition, LoanType, Prisma } from '@prisma/client';
import { SanctionsService } from './sanctions.service';
import { FinesService } from './fines.service';
import { AuditLogService } from '../../audit-log/audit-log.service';

@Injectable()
export class LoansService {
  constructor(
    private prisma: PrismaService,
    private sanctionsService: SanctionsService,
    private finesService: FinesService,
    private auditLogService: AuditLogService,
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

      await this.auditLogService.log(
        'CREATE_LOAN',
        'Loan',
        loan.loanId,
        userId,
        { copyId, dueDate },
      );

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
    
    // Periodo de gracia de 24h para el Día 1
    const msIn24h = 24 * 60 * 60 * 1000;
    const isWithin24hGrace = isLate && (now.getTime() - loan.dueDate.getTime() <= msIn24h);
    const isEffectivelyOnTimeOrGrace = !isLate || isWithin24hGrace;

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Loan
      const loanData: Prisma.LoanUpdateInput = {
        status: 'RETURNED',
        returnDate: now,
        observations: returnDto?.observations || null,
      };

      if (loan.type === LoanType.HOME && loan.depositAmount) {
        if (returnDto?.condition === CopyCondition.LOST) {
          loanData.depositStatus = 'FORFEITED';
        } else {
          loanData.depositStatus = 'REFUNDED';
        }
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
        // Solo las devoluciones estrictamente a tiempo cuentan para la racha de reducción de sanciones
        await this.sanctionsService.registerOnTimeDelivery(loan.userId);
      }

      if (isEffectivelyOnTimeOrGrace) {
        // If they had a Day 1 temporary fine, annul it
        const day1Fine = await tx.fine.findFirst({
          where: { loanId, description: { contains: 'Día 1' } },
        });
        if (day1Fine) {
          // Annul the fine through FinesService to log audit and handle refund automatically if needed
          await this.finesService.annulFine(day1Fine.fineId, 'SYSTEM');
        }
      }

      // 4. Reactivate User if blocked preventively (Day 1 block) on loanBlockUntil
      const userWithBlock = await tx.user.findUnique({
        where: { userId: loan.userId },
      });

      if (
        userWithBlock?.loanBlockUntil &&
        userWithBlock.loanBlockUntil.getFullYear() === 2099
      ) {
        // Verify if they have other active overdue loans
        const remainingOverdueLoansCount = await tx.loan.count({
          where: {
            userId: loan.userId,
            status: 'OVERDUE',
            loanId: { not: loanId },
          },
        });

        if (remainingOverdueLoansCount === 0) {
          await tx.user.update({
            where: { userId: loan.userId },
            data: { loanBlockUntil: null },
          });

          await this.auditLogService.log(
            'CLEAR_PREVENTIVE_BLOCK',
            'User',
            loan.userId,
            'SYSTEM',
            { reason: 'Todos los libros vencidos han sido devueltos.' },
          );
        }
      }

      await this.auditLogService.log(
        'RETURN_LOAN',
        'Loan',
        loanId,
        loan.userId,
        {
          condition: returnDto?.condition,
          observations: returnDto?.observations,
        },
      );

      return updatedLoan;
    });
  }
}
