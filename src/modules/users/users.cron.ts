import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersCron {
  private readonly logger = new Logger(UsersCron.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupUnconfirmedAccounts() {
    this.logger.log('Iniciando limpieza de cuentas no confirmadas...');

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    try {
      // 1. Buscar usuarios no confirmados creados hace más de 24 horas
      const usersToDelete = await this.prisma.user.findMany({
        where: {
          isConfirmed: false,
          createdAt: {
            lt: twentyFourHoursAgo,
          },
        },
        include: {
          userData: {
            include: {
              address: true,
            },
          },
        },
      });

      if (usersToDelete.length === 0) {
        this.logger.log('No hay cuentas para limpiar.');
        return;
      }

      this.logger.log(`Se encontraron ${usersToDelete.length} cuentas para eliminar.`);

      for (const user of usersToDelete) {
        await this.prisma.$transaction(async (tx) => {
          // 2. Eliminar registros especializados (Student, Teacher, etc.)
          // El ID de estos es el userId
          await tx.student.deleteMany({ where: { userId: user.userId } });
          await tx.teacher.deleteMany({ where: { userId: user.userId } });
          await tx.librarian.deleteMany({ where: { userId: user.userId } });
          await tx.administrator.deleteMany({ where: { userId: user.userId } });

          // 3. Eliminar el usuario
          await tx.user.delete({ where: { userId: user.userId } });

          // 4. Eliminar datos personales (UserData)
          if (user.userDataId) {
            await tx.userData.delete({ where: { userDataId: user.userDataId } });
          }

          // 5. Eliminar la dirección si existe
          if (user.userData?.addressId) {
            await tx.address.delete({ where: { addressId: user.userData.addressId } });
          }
        });
        
        this.logger.log(`Cuenta eliminada silenciosamente: ${user.code}`);
      }

      this.logger.log('Limpieza completada exitosamente.');
    } catch (error) {
      this.logger.error('Error durante la limpieza de cuentas:', error);
    }
  }
}
