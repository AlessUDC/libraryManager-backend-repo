import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateReservationDto,
  RedeemReservationDto,
} from '../dto/reservation.dto';
import { Prisma, ReservationStatus } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SanctionsService } from '../../loans/services/sanctions.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { canReserveLibraryLoan } from '../../../common/business-calendar';

const SYSTEM_ACTOR = 'SYSTEM';

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private sanctionsService: SanctionsService,
    private auditLogService: AuditLogService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    await this.expireOldReservations();
  }

  private async expireOldReservations(): Promise<void> {
    const expiredReservations = await this.prisma.reservation.findMany({
      where: {
        status: ReservationStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
    });

    for (const res of expiredReservations) {
      await this.prisma.$transaction(async (tx) => {
        await this.processExpiredReservation(tx, res.reservationId);
      });
    }
  }

  private getBlockDaysForMissedCount(count: number): number | null {
    if (count >= 7) return 7;
    if (count === 5) return 3;
    if (count === 3) return 1;
    return null;
  }

  private async processExpiredReservation(
    tx: Prisma.TransactionClient,
    reservationId: string,
  ) {
    const reservation = await tx.reservation.findUnique({
      where: { reservationId },
    });

    if (!reservation || reservation.status !== ReservationStatus.PENDING) {
      return;
    }

    if (new Date() <= reservation.expiresAt) {
      return;
    }

    await tx.reservation.update({
      where: { reservationId },
      data: { status: ReservationStatus.EXPIRED },
    });

    await tx.copy.update({
      where: { copyId: reservation.copyId },
      data: { status: 'AVAILABLE' },
    });

    await this.auditLogService.log(
      'EXPIRE_RESERVATION',
      'Reservation',
      reservationId,
      SYSTEM_ACTOR,
      { userId: reservation.userId, copyId: reservation.copyId },
    );

    const user = await tx.user.findUnique({
      where: { userId: reservation.userId },
      include: { student: true },
    });

    if (user?.role !== 'STUDENT' || !user.student) {
      return;
    }

    const updatedStudent = await tx.student.update({
      where: { userId: reservation.userId },
      data: { missedReservationsCount: { increment: 1 } },
    });

    const blockDays = this.getBlockDaysForMissedCount(
      updatedStudent.missedReservationsCount,
    );

    if (!blockDays) {
      return;
    }

    const blockUser = await tx.user.findUnique({
      where: { userId: reservation.userId },
    });

    const now = new Date();
    const currentBlock =
      blockUser?.loanBlockUntil &&
      blockUser.loanBlockUntil > now &&
      blockUser.loanBlockUntil.getFullYear() !== 2099
        ? blockUser.loanBlockUntil
        : now;

    const newBlockUntil = new Date(currentBlock);
    newBlockUntil.setDate(newBlockUntil.getDate() + blockDays);

    await tx.user.update({
      where: { userId: reservation.userId },
      data: { loanBlockUntil: newBlockUntil },
    });

    await this.auditLogService.log(
      'USER_BLOCK_AUTOMATIC',
      'User',
      reservation.userId,
      SYSTEM_ACTOR,
      {
        reason: 'MISSED_RESERVATIONS',
        missedReservationsCount: updatedStudent.missedReservationsCount,
        blockDays,
        loanBlockUntil: newBlockUntil,
      },
    );
  }

  async createReservation(
    userId: string,
    createReservationDto: CreateReservationDto,
  ) {
    await this.expireOldReservations();

    const {
      copyId,
      requestedLoanType,
      requestedDueDate,
      reservationDurationMinutes,
    } = createReservationDto;

    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isBlocked = await this.sanctionsService.isUserBlocked(userId);
    if (isBlocked) {
      throw new BadRequestException(
        'Su cuenta se encuentra bloqueada por sanciones disciplinarias. No puede realizar nuevas reservaciones.',
      );
    }

    const maxMinutes = user.role === 'TEACHER' ? 120 : 60;
    if (reservationDurationMinutes > maxMinutes) {
      throw new BadRequestException(
        `El tiempo máximo de reserva para su rol es de ${maxMinutes} minutos`,
      );
    }

    const maxDays = 5;
    const now = new Date();

    const startOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const calendarDay = (d: Date) => startOfDay(d).getTime();

    let normalizedDueDate: Date;

    if (requestedLoanType === 'LIBRARY') {
      if (!canReserveLibraryLoan(now)) {
        throw new BadRequestException(
          'Los préstamos en sala solo pueden reservarse antes de las 7:00 PM.',
        );
      }
      normalizedDueDate = new Date();
      normalizedDueDate.setHours(19, 0, 0, 0);
    } else {
      const dueDate = new Date(requestedDueDate);

      if (calendarDay(dueDate) < calendarDay(now)) {
        throw new BadRequestException(
          'La fecha de devolución no puede ser en el pasado',
        );
      }

      const maxDueDate = new Date(now);
      maxDueDate.setDate(maxDueDate.getDate() + maxDays);

      if (calendarDay(dueDate) > calendarDay(maxDueDate)) {
        throw new BadRequestException(
          `El tiempo máximo de préstamo para su rol es de ${maxDays} días`,
        );
      }

      normalizedDueDate = dueDate;
    }

    return this.prisma.$transaction(
      async (tx) => {
        const copy = await tx.copy.findUnique({ where: { copyId } });
        if (!copy) throw new NotFoundException('Ejemplar no encontrado');
        if (copy.status !== 'AVAILABLE') {
          throw new ConflictException(
            'El ejemplar no está disponible para reserva',
          );
        }

        const token = Math.floor(100000 + Math.random() * 900000).toString();

        const expiresAt = new Date();
        expiresAt.setMinutes(
          expiresAt.getMinutes() + reservationDurationMinutes,
        );

        const reservation = await tx.reservation.create({
          data: {
            userId,
            copyId,
            token,
            requestedLoanType,
            requestedDueDate: normalizedDueDate,
            expiresAt,
            status: 'PENDING',
          },
        });

        await tx.copy.update({
          where: { copyId },
          data: { status: 'HELD' },
        });

        return reservation;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async getAdminReservations() {
    await this.expireOldReservations();

    return this.prisma.reservation.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { include: { userData: true } },
        copy: { include: { book: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserReservations(userId: string) {
    await this.expireOldReservations();

    return this.prisma.reservation.findMany({
      where: { userId },
      include: {
        copy: { include: { book: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async redeemReservation(
    reservationId: string,
    userId: string,
    redeemDto: RedeemReservationDto,
  ) {
    await this.expireOldReservations();

    const { token } = redeemDto;

    return this.prisma.$transaction(
      async (tx) => {
        const reservation = await tx.reservation.findUnique({
          where: { reservationId },
          include: { copy: true },
        });

        if (!reservation) throw new NotFoundException('Reserva no encontrada');
        if (reservation.userId !== userId)
          throw new ForbiddenException(
            'No tiene permiso para canjear esta reserva',
          );
        if (reservation.status !== 'PENDING')
          throw new BadRequestException('La reserva no está pendiente');

        if (new Date() > reservation.expiresAt) {
          await this.processExpiredReservation(tx, reservationId);
          throw new BadRequestException('La reserva ha expirado');
        }

        if (reservation.token !== token) {
          const failedAttempts = reservation.failedAttempts + 1;
          if (failedAttempts >= 5) {
            await tx.reservation.update({
              where: { reservationId },
              data: { status: 'CANCELLED', failedAttempts },
            });
            await tx.copy.update({
              where: { copyId: reservation.copyId },
              data: { status: 'AVAILABLE' },
            });
            throw new BadRequestException(
              'Demasiados intentos fallidos. Reserva cancelada.',
            );
          }

          await tx.reservation.update({
            where: { reservationId },
            data: { failedAttempts },
          });
          throw new BadRequestException('Token inválido');
        }

        let depositAmount = null;
        if (reservation.requestedLoanType === 'HOME') {
          const copyWithBook = await tx.copy.findUnique({
            where: { copyId: reservation.copyId },
            include: { book: true },
          });
          if (copyWithBook?.book?.cost) {
            depositAmount = copyWithBook.book.cost * 2;
          }
        }

        const loan = await tx.loan.create({
          data: {
            reservationId: reservation.reservationId,
            userId: reservation.userId,
            copyId: reservation.copyId,
            type: reservation.requestedLoanType,
            dueDate: reservation.requestedDueDate,
            status: 'ACTIVE',
            depositAmount,
            depositStatus: depositAmount ? 'HELD' : null,
          },
        });

        await tx.reservation.update({
          where: { reservationId },
          data: { status: 'FULFILLED', redeemedAt: new Date() },
        });

        await tx.copy.update({
          where: { copyId: reservation.copyId },
          data: { status: 'LENT' },
        });

        return loan;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async cancelReservation(reservationId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { reservationId },
      });
      if (!reservation) throw new NotFoundException('Reserva no encontrada');
      if (reservation.userId !== userId)
        throw new ForbiddenException(
          'No tiene permiso para cancelar esta reserva',
        );
      if (reservation.status !== 'PENDING')
        throw new BadRequestException(
          'Solo se pueden cancelar reservas pendientes',
        );

      await tx.reservation.update({
        where: { reservationId },
        data: { status: 'CANCELLED' },
      });

      await tx.copy.update({
        where: { copyId: reservation.copyId },
        data: { status: 'AVAILABLE' },
      });

      return { message: 'Reserva cancelada' };
    });
  }
}
