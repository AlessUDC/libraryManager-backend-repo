"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UsersCron_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersCron = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersCron = UsersCron_1 = class UsersCron {
    prisma;
    logger = new common_1.Logger(UsersCron_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async cleanupUnconfirmedAccounts() {
        this.logger.log('Iniciando limpieza de cuentas no confirmadas...');
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        try {
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
                    await tx.student.deleteMany({ where: { userId: user.userId } });
                    await tx.teacher.deleteMany({ where: { userId: user.userId } });
                    await tx.librarian.deleteMany({ where: { userId: user.userId } });
                    await tx.administrator.deleteMany({ where: { userId: user.userId } });
                    await tx.user.delete({ where: { userId: user.userId } });
                    if (user.userDataId) {
                        await tx.userData.delete({ where: { userDataId: user.userDataId } });
                    }
                    if (user.userData?.addressId) {
                        await tx.address.delete({ where: { addressId: user.userData.addressId } });
                    }
                });
                this.logger.log(`Cuenta eliminada silenciosamente: ${user.code}`);
            }
            this.logger.log('Limpieza completada exitosamente.');
        }
        catch (error) {
            this.logger.error('Error durante la limpieza de cuentas:', error);
        }
    }
};
exports.UsersCron = UsersCron;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersCron.prototype, "cleanupUnconfirmedAccounts", null);
exports.UsersCron = UsersCron = UsersCron_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersCron);
//# sourceMappingURL=users.cron.js.map