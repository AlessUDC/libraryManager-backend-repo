import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async register(dto: CreateAccountDto) {
    const { password, email, code, documentNumber, role, schoolId, facultyId, ...userDataRest } = dto;

    // 1. Verificar si ya existe un usuario con ese código o email
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { code: code },
          { userData: { email: email } },
          { userData: { documentNumber: documentNumber } }
        ]
      }
    });

    if (existingUser) {
      throw new ConflictException('El código, email o número de documento ya están registrados');
    }

    // 2. Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // 3. Crear el usuario y sus datos en una transacción
      return await this.prisma.$transaction(async (tx) => {
        // Crear datos personales
        const userData = await tx.userData.create({
          data: {
            ...userDataRest,
            email,
            documentNumber,
            birthdate: new Date(dto.birthdate),
          }
        });

        // Crear el usuario
        const user = await tx.user.create({
          data: {
            code,
            password: hashedPassword,
            role: role || Role.STUDENT,
            userDataId: userData.userDataId,
          }
        });

        // 4. Crear registro especializado según el rol
        if (user.role === Role.STUDENT) {
          if (!schoolId) throw new ConflictException('El schoolId es requerido para estudiantes');
          await tx.student.create({
            data: {
              userId: user.userId,
              schoolId: schoolId,
              cycle: 1, 
            }
          });
        } else if (user.role === Role.TEACHER) {
          if (!facultyId) throw new ConflictException('El facultyId es requerido para profesores');
          await tx.teacher.create({
            data: {
              userId: user.userId,
              facultyId: facultyId,
            }
          });
        }

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
}
