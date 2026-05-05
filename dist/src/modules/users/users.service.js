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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const mail_service_1 = require("../mail/mail.service");
let UsersService = class UsersService {
    prisma;
    mailService;
    constructor(prisma, mailService) {
        this.prisma = prisma;
        this.mailService = mailService;
    }
    async createAccount(dto, hashedPassword) {
        const { email, code, password, documentNumber, documentType, role, schoolId, facultyId, cycle, birthdate, address, provinceId, ...userDataRest } = dto;
        await this.validateUniqueness(code, email, documentNumber);
        await this.validateReferentialIntegrity(provinceId, userDataRest.districtId, facultyId, schoolId);
        try {
            return await this.prisma.$transaction(async (tx) => {
                const addressRecord = await tx.address.create({ data: { title: address } });
                const userData = await tx.userData.create({
                    data: {
                        ...userDataRest,
                        email,
                        documentNumber,
                        birthdate: new Date(birthdate),
                        addressId: addressRecord.addressId,
                    }
                });
                const { token: confirmationToken, expiration: tokenExpiration } = this.generateConfirmationToken(15);
                const user = await tx.user.create({
                    data: {
                        code,
                        password: hashedPassword,
                        role: role || client_1.Role.STUDENT,
                        userDataId: userData.userDataId,
                        confirmationToken,
                        tokenExpiration,
                    }
                });
                await this.createSpecializedRoleRecord(tx, user, schoolId, cycle, facultyId);
                await this.mailService.sendConfirmationEmail(email, confirmationToken);
                return {
                    message: 'Cuenta creada exitosamente',
                    userId: user.userId,
                    code: user.code
                };
            });
        }
        catch (error) {
            if (error instanceof common_1.ConflictException)
                throw error;
            console.error(error);
            throw new common_1.InternalServerErrorException('Error al crear la cuenta del usuario');
        }
    }
    async validateUniqueness(code, email, documentNumber) {
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { code },
                    { userData: { email } },
                    { userData: { documentNumber } }
                ]
            }
        });
        if (existingUser) {
            throw new common_1.ConflictException('El código, email o número de documento ya están registrados');
        }
    }
    async validateReferentialIntegrity(provinceId, districtId, facultyId, schoolId) {
        if (provinceId) {
            const province = await this.prisma.province.findUnique({ where: { provinceId } });
            if (!province)
                throw new common_1.ConflictException('La provincia indicada no existe');
            if (districtId) {
                const district = await this.prisma.district.findUnique({ where: { districtId } });
                if (!district || district.provinceId !== provinceId) {
                    throw new common_1.ConflictException('El distrito seleccionado no pertenece a la provincia indicada');
                }
            }
        }
        if (facultyId) {
            const faculty = await this.prisma.faculty.findUnique({ where: { facultyId } });
            if (!faculty)
                throw new common_1.ConflictException('La facultad indicada no existe');
            if (schoolId) {
                const school = await this.prisma.school.findUnique({ where: { schoolId } });
                if (!school || school.facultyId !== facultyId) {
                    throw new common_1.ConflictException('La escuela seleccionada no pertenece a la facultad indicada');
                }
            }
        }
    }
    generateConfirmationToken(minutes) {
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const expiration = new Date();
        expiration.setMinutes(expiration.getMinutes() + minutes);
        return { token, expiration };
    }
    async createSpecializedRoleRecord(tx, user, schoolId, cycle, facultyId) {
        if (user.role === client_1.Role.STUDENT) {
            if (!schoolId)
                throw new common_1.ConflictException('El schoolId es requerido para estudiantes');
            await tx.student.create({
                data: { userId: user.userId, schoolId, cycle: cycle || 1 }
            });
        }
        else if (user.role === client_1.Role.TEACHER) {
            if (!facultyId)
                throw new common_1.ConflictException('El facultyId es requerido para profesores');
            await tx.teacher.create({
                data: { userId: user.userId, facultyId }
            });
        }
    }
    async findById(userId) {
        return this.prisma.user.findUnique({
            where: { userId },
            include: {
                userData: {
                    include: {
                        address: true,
                        district: { include: { province: true } }
                    }
                },
                student: {
                    include: {
                        school: { include: { faculty: true } }
                    }
                },
                teacher: {
                    include: { faculty: true }
                }
            }
        });
    }
    async findByEmail(email) {
        return this.prisma.user.findFirst({
            where: { userData: { email } },
            include: { userData: true }
        });
    }
    async findByCode(code) {
        return this.prisma.user.findUnique({
            where: { code },
            include: { userData: true }
        });
    }
    async updateUserData(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { userId },
            include: { userData: true }
        });
        const { address, ...userDataDto } = dto;
        return await this.prisma.$transaction(async (tx) => {
            if (address && user?.userData?.addressId) {
                await tx.address.update({
                    where: { addressId: user.userData.addressId },
                    data: { title: address }
                });
            }
            await tx.userData.update({
                where: { userDataId: user?.userDataId },
                data: { ...userDataDto }
            });
            return this.findById(userId);
        });
    }
    async updatePassword(userId, passwordHash) {
        return this.prisma.user.update({
            where: { userId },
            data: {
                password: passwordHash,
                resetPasswordToken: null,
                resetPasswordExpires: null,
                resetPasswordResendCount: 0,
                lastPasswordReset: new Date()
            }
        });
    }
    async confirmAccount(userId) {
        return this.prisma.user.update({
            where: { userId },
            data: {
                isConfirmed: true,
                confirmationToken: null,
                tokenExpiration: null,
                resendCount: 0
            }
        });
    }
    async renewConfirmationToken(userId, token, expiration) {
        return this.prisma.user.update({
            where: { userId },
            data: {
                confirmationToken: token,
                tokenExpiration: expiration,
                resendCount: { increment: 1 }
            }
        });
    }
    async setPasswordResetToken(userId, token, expiration, hasExistingToken) {
        return this.prisma.user.update({
            where: { userId },
            data: {
                resetPasswordToken: token,
                resetPasswordExpires: expiration,
                resetPasswordResendCount: hasExistingToken ? { increment: 1 } : 0
            }
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService])
], UsersService);
//# sourceMappingURL=users.service.js.map