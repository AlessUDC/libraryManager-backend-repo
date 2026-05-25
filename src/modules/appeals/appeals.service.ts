import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AppealStatus, FineStatus, SanctionStatus } from '@prisma/client';

@Injectable()
export class AppealsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async submitAppeal(
    userId: string,
    data: { fineId?: string; sanctionId?: string; reason: string },
  ) {
    if (!data.reason || data.reason.trim() === '') {
      throw new BadRequestException('La razón de la apelación es obligatoria');
    }

    if (!data.fineId && !data.sanctionId) {
      throw new BadRequestException(
        'Debes especificar una multa o sanción para apelar',
      );
    }

    if (data.fineId && data.sanctionId) {
      throw new BadRequestException(
        'Solo puedes apelar una multa o una sanción a la vez',
      );
    }

    if (data.fineId) {
      const fine = await this.prisma.fine.findUnique({
        where: { fineId: data.fineId },
      });

      if (!fine) {
        throw new NotFoundException('Multa no encontrada');
      }

      if (fine.userId !== userId) {
        throw new ForbiddenException('Esta multa no te pertenece');
      }

      if (fine.status !== FineStatus.PENDING) {
        throw new BadRequestException(
          'Solo se pueden apelar multas pendientes',
        );
      }

      const existingAppeal = await this.prisma.appeal.findFirst({
        where: {
          fineId: data.fineId,
          status: { in: [AppealStatus.PENDING, AppealStatus.APPROVED] },
        },
      });

      if (existingAppeal) {
        throw new BadRequestException(
          'Ya existe una apelación activa para esta multa',
        );
      }
    }

    if (data.sanctionId) {
      const sanction = await this.prisma.sanction.findUnique({
        where: { sanctionId: data.sanctionId },
      });

      if (!sanction) {
        throw new NotFoundException('Sanción no encontrada');
      }

      if (sanction.userId !== userId) {
        throw new ForbiddenException('Esta sanción no te pertenece');
      }

      if (
        sanction.status !== SanctionStatus.PENDING &&
        sanction.status !== SanctionStatus.APPLIED
      ) {
        throw new BadRequestException(
          'Solo se pueden apelar sanciones pendientes o aplicadas',
        );
      }

      const existingAppeal = await this.prisma.appeal.findFirst({
        where: {
          sanctionId: data.sanctionId,
          status: { in: [AppealStatus.PENDING, AppealStatus.APPROVED] },
        },
      });

      if (existingAppeal) {
        throw new BadRequestException(
          'Ya existe una apelación activa para esta sanción',
        );
      }
    }

    const appeal = await this.prisma.appeal.create({
      data: {
        userId,
        fineId: data.fineId || null,
        sanctionId: data.sanctionId || null,
        reason: data.reason,
        status: AppealStatus.PENDING,
      },
    });

    await this.auditLogService.log(
      'SUBMIT_APPEAL',
      'Appeal',
      appeal.appealId,
      userId,
      { fineId: data.fineId || null, sanctionId: data.sanctionId || null },
    );

    return appeal;
  }

  async getMyAppeals(userId: string) {
    return this.prisma.appeal.findMany({
      where: { userId },
      include: {
        fine: {
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
        },
        sanction: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingAppeals() {
    return this.prisma.appeal.findMany({
      where: { status: AppealStatus.PENDING },
      include: {
        user: {
          include: {
            userData: true,
          },
        },
        fine: {
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
        },
        sanction: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveAppeal(
    appealId: string,
    resolverId: string,
    data: { status: 'APPROVED' | 'REJECTED'; resolution: string },
  ) {
    if (data.status !== 'APPROVED' && data.status !== 'REJECTED') {
      throw new BadRequestException(
        'El estado de resolución debe ser APPROVED o REJECTED',
      );
    }

    const appeal = await this.prisma.appeal.findUnique({
      where: { appealId },
    });

    if (!appeal) {
      throw new NotFoundException('Apelación no encontrada');
    }

    if (appeal.status !== AppealStatus.PENDING) {
      throw new BadRequestException('Esta apelación ya fue resuelta');
    }

    const updatedAppeal = await this.prisma.$transaction(async (tx) => {
      // 1. Update the appeal status and details
      const resolved = await tx.appeal.update({
        where: { appealId },
        data: {
          status: data.status,
          resolverId,
          resolution: data.resolution || null,
          resolvedAt: new Date(),
        },
      });

      // 2. If approved, annul fine or redeem sanction
      if (data.status === 'APPROVED') {
        if (appeal.fineId) {
          const fine = await tx.fine.update({
            where: { fineId: appeal.fineId },
            data: { status: FineStatus.ANNULLED },
          });

          // Check if loan guarantee (deposit) should be refunded
          const loan = await tx.loan.findUnique({
            where: { loanId: fine.loanId },
            include: { fines: true },
          });

          if (
            loan &&
            loan.status === 'RETURNED' &&
            loan.depositAmount &&
            loan.depositStatus === 'HELD'
          ) {
            const hasPendingFines = loan.fines.some(
              (f) =>
                f.fineId !== fine.fineId && f.status === FineStatus.PENDING,
            );

            if (!hasPendingFines) {
              await tx.loan.update({
                where: { loanId: loan.loanId },
                data: { depositStatus: 'REFUNDED' },
              });

              await this.auditLogService.log(
                'REFUND_DEPOSIT_AUTOMATIC',
                'Loan',
                loan.loanId,
                resolverId,
                {
                  reason:
                    'Garantía devuelta automáticamente tras anular la multa apelada.',
                },
              );
            }
          }
        }

        if (appeal.sanctionId) {
          await tx.sanction.update({
            where: { sanctionId: appeal.sanctionId },
            data: { status: SanctionStatus.REDEEMED },
          });
        }
      }

      return resolved;
    });

    // 3. Recalculate user blocking dates if approved
    if (data.status === 'APPROVED') {
      const activeOverdueLoansCount = await this.prisma.loan.count({
        where: { userId: appeal.userId, status: 'OVERDUE' },
      });

      if (activeOverdueLoansCount > 0) {
        // Keep preventive block since user still has overdue loans
        await this.prisma.user.update({
          where: { userId: appeal.userId },
          data: { loanBlockUntil: new Date('2099-12-31') },
        });
      } else {
        const appliedSanctionsCount = await this.prisma.sanction.count({
          where: { userId: appeal.userId, status: SanctionStatus.APPLIED },
        });

        if (appliedSanctionsCount === 0) {
          await this.prisma.user.update({
            where: { userId: appeal.userId },
            data: { loanBlockUntil: null },
          });
        }
      }
    }

    await this.auditLogService.log(
      'RESOLVE_APPEAL',
      'Appeal',
      appealId,
      resolverId,
      { status: data.status, resolution: data.resolution },
    );

    return updatedAppeal;
  }
}
