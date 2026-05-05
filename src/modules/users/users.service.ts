import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from '../../auth/dto/create-account.dto';
import { Role } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { UpdateProfileDto } from '../../auth/dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService
  ) {}

  async createAccount(dto: CreateAccountDto, hashedPassword: string) {
    const { 
      email, code, password, documentNumber, documentType, role, schoolId, facultyId, 
      cycle, birthdate, address, provinceId, ...userDataRest 
    } = dto;

    // 1. Validaciones previas
    await this.validateUniqueness(code, email, documentNumber);
    await this.validateReferentialIntegrity(provinceId, userDataRest.districtId, facultyId, schoolId);

    try {
      // 2. Transacción de creación
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
            role: role || Role.STUDENT,
            userDataId: userData.userDataId,
            confirmationToken,
            tokenExpiration,
          }
        });

        await this.createSpecializedRoleRecord(tx, user, schoolId, cycle, facultyId);

        // Envío de correo (simulado/asíncrono)
        await this.mailService.sendConfirmationEmail(email, confirmationToken);

        return {
          message: 'Cuenta creada exitosamente',
          userId: user.userId,
          code: user.code
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      console.error(error);
      throw new InternalServerErrorException('Error al crear la cuenta del usuario');
    }
  }

  // --- Métodos Privados de Apoyo ---

  private async validateUniqueness(code: string, email: string, documentNumber: string) {
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
      throw new ConflictException('El código, email o número de documento ya están registrados');
    }
  }

  private async validateReferentialIntegrity(provinceId?: string, districtId?: string, facultyId?: string, schoolId?: string) {
    if (provinceId) {
      const province = await this.prisma.province.findUnique({ where: { provinceId } });
      if (!province) throw new ConflictException('La provincia indicada no existe');

      if (districtId) {
        const district = await this.prisma.district.findUnique({ where: { districtId } });
        if (!district || district.provinceId !== provinceId) {
          throw new ConflictException('El distrito seleccionado no pertenece a la provincia indicada');
        }
      }
    }

    if (facultyId) {
      const faculty = await this.prisma.faculty.findUnique({ where: { facultyId } });
      if (!faculty) throw new ConflictException('La facultad indicada no existe');

      if (schoolId) {
        const school = await this.prisma.school.findUnique({ where: { schoolId } });
        if (!school || school.facultyId !== facultyId) {
          throw new ConflictException('La escuela seleccionada no pertenece a la facultad indicada');
        }
      }
    }
  }

  private generateConfirmationToken(minutes: number) {
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + minutes);
    return { token, expiration };
  }

  private async createSpecializedRoleRecord(tx: any, user: any, schoolId?: string, cycle?: number, facultyId?: string) {
    if (user.role === Role.STUDENT) {
      if (!schoolId) throw new ConflictException('El schoolId es requerido para estudiantes');
      await tx.student.create({
        data: { userId: user.userId, schoolId, cycle: cycle || 1 }
      });
    } else if (user.role === Role.TEACHER) {
      if (!facultyId) throw new ConflictException('El facultyId es requerido para profesores');
      await tx.teacher.create({
        data: { userId: user.userId, facultyId }
      });
    }
  }

  // --- Métodos de Consulta y Actualización ---

  async findById(userId: string) {
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

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { userData: { email } },
      include: { userData: true }
    });
  }

  async findByCode(code: string) {
    return this.prisma.user.findUnique({
      where: { code },
      include: { userData: true }
    });
  }

  async updateUserData(userId: string, dto: UpdateProfileDto) {
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

  async updatePassword(userId: string, passwordHash: string) {
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

  async confirmAccount(userId: string) {
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

  async renewConfirmationToken(userId: string, token: string, expiration: Date) {
    return this.prisma.user.update({
      where: { userId },
      data: {
        confirmationToken: token,
        tokenExpiration: expiration,
        resendCount: { increment: 1 }
      }
    });
  }

  async setPasswordResetToken(userId: string, token: string, expiration: Date, hasExistingToken: boolean) {
    return this.prisma.user.update({
      where: { userId },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expiration,
        resetPasswordResendCount: hasExistingToken ? { increment: 1 } : 0
      }
    });
  }
}
