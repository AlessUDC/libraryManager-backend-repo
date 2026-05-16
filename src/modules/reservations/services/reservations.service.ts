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

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private sanctionsService: SanctionsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const expiredReservations = await this.prisma.reservation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
    });

    for (const res of expiredReservations) {
      await this.prisma.$transaction(async (tx) => {
        await this.expireReservation(tx, res.reservationId);
      });
    }
  }

  async createReservation(
    userId: string,
    createReservationDto: CreateReservationDto,
  ) {
    const {
      copyId,
      requestedLoanType,
      requestedDueDate,
      reservationDurationMinutes,
    } = createReservationDto;

    // Validate user role and duration
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

    // Validate requestedDueDate
    const maxDays = 5;
    const now = new Date();
    const dueDate = new Date(requestedDueDate);

    // Check if date is in the past
    if (dueDate < now && dueDate.toDateString() !== now.toDateString()) {
      throw new BadRequestException(
        'La fecha de devolución no puede ser en el pasado',
      );
    }

    if (requestedLoanType === 'LIBRARY') {
      if (dueDate.toDateString() !== now.toDateString()) {
        throw new BadRequestException(
          'Los préstamos en sala deben devolverse el mismo día',
        );
      }
    } else {
      const maxDueDate = new Date();
      maxDueDate.setDate(maxDueDate.getDate() + maxDays);
      maxDueDate.setHours(23, 59, 59, 999);

      if (dueDate > maxDueDate) {
        throw new BadRequestException(
          `El tiempo máximo de préstamo para su rol es de ${maxDays} días`,
        );
      }
    }

    // Transaction with SERIALIZABLE isolation to prevent concurrent reservations of the same copy
    return this.prisma.$transaction(
      async (tx) => {
        const copy = await tx.copy.findUnique({ where: { copyId } });
        if (!copy) throw new NotFoundException('Ejemplar no encontrado');
        if (copy.status !== 'AVAILABLE') {
          throw new ConflictException(
            'El ejemplar no está disponible para reserva',
          );
        }

        // Generate 6-digit token
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
            requestedDueDate: new Date(requestedDueDate),
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
    return this.prisma.reservation.findMany({
      where: { userId, status: 'PENDING' },
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
          await this.expireReservation(tx, reservationId);
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

        // Success: Create Loan
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

  private async expireReservation(
    tx: Prisma.TransactionClient,
    reservationId: string,
  ) {
    const reservation = await tx.reservation.update({
      where: { reservationId },
      data: { status: 'EXPIRED' },
    });
    await tx.copy.update({
      where: { copyId: reservation.copyId },
      data: { status: 'AVAILABLE' },
    });
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
