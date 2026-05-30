import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from '../../auth/dto/create-account.dto';
import { Prisma, Role } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { UpdateProfileDto } from '../../auth/dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { generateSlug } from '../../common/utils/slug';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async findAll(queryDto: {
    search?: string;
    filterBy?: string;
    role?: Role;
    page?: number;
    limit?: number;
  }) {
    const { search, filterBy = 'all', role, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (role) {
      where.role = role;
    }

    if (search) {
      if (filterBy === 'name') {
        where.OR = [
          { userData: { name: { contains: search, mode: 'insensitive' } } },
          {
            userData: {
              paternalSurname: { contains: search, mode: 'insensitive' },
            },
          },
          {
            userData: {
              maternalSurname: { contains: search, mode: 'insensitive' },
            },
          },
        ];
      } else if (filterBy === 'email') {
        where.userData = { email: { contains: search, mode: 'insensitive' } };
      } else if (filterBy === 'code') {
        where.OR = [
          { code: { contains: search, mode: 'insensitive' } },
          {
            userData: {
              documentNumber: { contains: search, mode: 'insensitive' },
            },
          },
        ];
      } else if (filterBy === 'role') {
        // Si se busca por rol pero como texto libre
        // Esto puede ser más complejo porque Role es enum,
        // pero para simplificar, si no coincide con los valores exactos, ignoramos
        const validRoles = Object.values(Role);
        const upperSearch = String(search).toUpperCase();
        const matchedRoles = validRoles.filter((r) => r.includes(upperSearch));
        if (matchedRoles.length > 0) {
          where.role = { in: matchedRoles };
        }
      } else {
        // 'all' o fallback
        where.OR = [
          { code: { contains: search, mode: 'insensitive' } },
          { userData: { name: { contains: search, mode: 'insensitive' } } },
          {
            userData: {
              paternalSurname: { contains: search, mode: 'insensitive' },
            },
          },
          {
            userData: {
              maternalSurname: { contains: search, mode: 'insensitive' },
            },
          },
          { userData: { email: { contains: search, mode: 'insensitive' } } },
          {
            userData: {
              documentNumber: { contains: search, mode: 'insensitive' },
            },
          },
        ];
      }
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          userData: {
            include: {
              address: true,
              district: { include: { province: true } },
            },
          },
          student: {
            include: {
              school: { include: { faculty: true } },
            },
          },
          teacher: {
            include: { faculty: true },
          },
          librarian: true,
          administrator: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.user.findUnique({
        where: { slug },
      });

      if (!existing) return slug;

      slug = `${baseSlug}-${counter}`;
      counter++;

      if (counter > 10) {
        slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
        return slug;
      }
    }
  }

  async createByAdmin(dto: {
    email: string;
    code: string;
    documentNumber: string;
    role?: Role;
    birthdate: string;
    documentType?: string;
    schoolId?: string;
    facultyId?: string;
    cycle?: number;
    address?: string;
    provinceId?: string;
    shift?: string;
    [key: string]: unknown;
  }) {
    const {
      email,
      code,
      documentNumber,
      role,
      birthdate,
      documentType,
      schoolId,
      facultyId,
      cycle,
      address,
      provinceId,
      shift,
      ...userDataRest
    } = dto;

    // 1. Validaciones previas
    await this.validateUniqueness(code, email, documentNumber);

    // Placeholder password that will be overwritten during activation
    const placeholderPassword = await bcrypt.hash(uuid(), 10);

    // Activation token valid for 1 hour
    const activationToken = uuid();
    const tokenExpiration = new Date();
    tokenExpiration.setHours(tokenExpiration.getHours() + 24);

    const slug = await this.generateUniqueSlug(
      `${userDataRest.name} ${userDataRest.paternalSurname} ${code}`,
    );

    try {
      // 2. Transacción de creación
      return await this.prisma.$transaction(async (tx) => {
        let addressId = undefined;
        if (address) {
          const addressRecord = await tx.address.create({
            data: { title: address },
          });
          addressId = addressRecord.addressId;
        }

        const userData = await tx.userData.create({
          data: {
            ...userDataRest,
            email,
            documentNumber,
            birthdate: new Date(birthdate),
            activeState: true,
            ...(addressId && { addressId }),
          } as Prisma.UserDataUncheckedCreateInput,
        });

        const user = await tx.user.create({
          data: {
            code,
            slug,
            password: placeholderPassword,
            role: role || Role.STUDENT,
            userDataId: userData.userDataId,
            isConfirmed: false, // Must be activated by the user
            confirmationToken: activationToken,
            tokenExpiration: tokenExpiration,
          },
        });

        // Specialized role record
        if (role === Role.STUDENT) {
          let schoolId = dto.schoolId;
          if (!schoolId) {
            const defaultSchool = await tx.school.findFirst();
            schoolId = defaultSchool?.schoolId || '';
          }
          await tx.student.create({
            data: { userId: user.userId, schoolId, cycle: dto.cycle || 1 },
          });
        } else if (role === Role.TEACHER) {
          let facultyId = dto.facultyId;
          if (!facultyId) {
            const defaultFaculty = await tx.faculty.findFirst();
            facultyId = defaultFaculty?.facultyId || '';
          }
          await tx.teacher.create({ data: { userId: user.userId, facultyId } });
        } else if (role === Role.LIBRARIAN) {
          await tx.librarian.create({
            data: { userId: user.userId, shift: dto.shift || 'MAÑANA' },
          });
        } else if (role === Role.ADMINISTRATOR) {
          await tx.administrator.create({ data: { userId: user.userId } });
        }

        // Envío de correo de activación
        await this.mailService.sendActivationEmail(
          email,
          userData.name,
          code,
          activationToken,
        );

        return {
          message:
            'Usuario creado exitosamente. Se ha enviado un enlace de activación.',
          userId: user.userId,
          slug: user.slug,
          code: user.code,
          activationToken: activationToken,
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      console.error(error);
      throw new InternalServerErrorException(
        'Error al crear el usuario desde administración',
      );
    }
  }

  async createAccount(dto: CreateAccountDto) {
    const {
      email,
      code,
      documentNumber,
      documentType,
      role,
      schoolId,
      facultyId,
      cycle,
      birthdate,
      address,
      provinceId,
      ...userDataRest
    } = dto;

    // 1. Validaciones previas
    await this.validateUniqueness(code, email, documentNumber);
    await this.validateReferentialIntegrity(
      provinceId,
      userDataRest.districtId,
      facultyId,
      schoolId,
    );

    try {
      // 2. Transacción de creación
      return await this.prisma.$transaction(async (tx) => {
        const addressRecord = await tx.address.create({
          data: { title: address },
        });

        const userData = await tx.userData.create({
          data: {
            ...userDataRest,
            email,
            documentNumber,
            birthdate: new Date(birthdate),
            addressId: addressRecord.addressId,
          },
        });

        const placeholderPassword = await bcrypt.hash(uuid(), 10);
        const { token: confirmationToken, expiration: tokenExpiration } =
          this.generateConfirmationToken(24);

        const slug = await this.generateUniqueSlug(
          `${userDataRest.name} ${userDataRest.paternalSurname} ${code}`,
        );

        const user = await tx.user.create({
          data: {
            code,
            slug,
            password: placeholderPassword,
            role: role || Role.STUDENT,
            userDataId: userData.userDataId,
            confirmationToken,
            tokenExpiration,
          },
        });

        await this.createSpecializedRoleRecord(
          tx,
          user,
          schoolId,
          cycle,
          facultyId,
        );

        // Envío de correo de activación
        await this.mailService.sendActivationEmail(
          email,
          userData.name,
          code,
          confirmationToken,
        );

        return {
          message: 'Cuenta creada exitosamente',
          userId: user.userId,
          code: user.code,
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      console.error(error);
      throw new InternalServerErrorException(
        'Error al crear la cuenta del usuario',
      );
    }
  }

  // --- Métodos Privados de Apoyo ---

  private async validateUniqueness(
    code: string,
    email: string,
    documentNumber: string,
  ) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { code },
          { userData: { email } },
          { userData: { documentNumber } },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'El código, email o número de documento ya están registrados',
      );
    }
  }

  private async validateReferentialIntegrity(
    provinceId?: string,
    districtId?: string,
    facultyId?: string,
    schoolId?: string,
  ) {
    if (provinceId) {
      const province = await this.prisma.province.findUnique({
        where: { provinceId },
      });
      if (!province)
        throw new ConflictException('La provincia indicada no existe');

      if (districtId) {
        const district = await this.prisma.district.findUnique({
          where: { districtId },
        });
        if (!district || district.provinceId !== provinceId) {
          throw new ConflictException(
            'El distrito seleccionado no pertenece a la provincia indicada',
          );
        }
      }
    }

    if (facultyId) {
      const faculty = await this.prisma.faculty.findUnique({
        where: { facultyId },
      });
      if (!faculty)
        throw new ConflictException('La facultad indicada no existe');

      if (schoolId) {
        const school = await this.prisma.school.findUnique({
          where: { schoolId },
        });
        if (!school || school.facultyId !== facultyId) {
          throw new ConflictException(
            'La escuela seleccionada no pertenece a la facultad indicada',
          );
        }
      }
    }
  }

  private generateConfirmationToken(hours: number) {
    const token = uuid();
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + hours);
    return { token, expiration };
  }

  private async createSpecializedRoleRecord(
    tx: Prisma.TransactionClient,
    user: { userId: string; role: Role },
    schoolId?: string,
    cycle?: number,
    facultyId?: string,
  ) {
    if (user.role === Role.STUDENT) {
      if (!schoolId)
        throw new ConflictException(
          'El schoolId es requerido para estudiantes',
        );
      await tx.student.create({
        data: { userId: user.userId, schoolId, cycle: cycle || 1 },
      });
    } else if (user.role === Role.TEACHER) {
      if (!facultyId)
        throw new ConflictException(
          'El facultyId es requerido para profesores',
        );
      await tx.teacher.create({
        data: { userId: user.userId, facultyId },
      });
    }
  }

  // --- Métodos de Consulta y Actualización ---

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: {
        userData: {
          include: {
            address: true,
            district: { include: { province: true } },
          },
        },
        student: {
          include: {
            school: { include: { faculty: true } },
          },
        },
        teacher: {
          include: { faculty: true },
        },
      },
    });
    if (!user || user.deletedAt) return null;
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { userData: { email } },
      include: { userData: true },
    });
  }

  async findByCode(code: string) {
    const user = await this.prisma.user.findUnique({
      where: { code },
      include: { userData: true },
    });
    if (!user || user.deletedAt) return null;
    return user;
  }

  async findBySlug(slug: string) {
    const user = await this.prisma.user.findUnique({
      where: { slug },
      include: {
        userData: {
          include: {
            address: true,
            district: { include: { province: true } },
          },
        },
        student: {
          include: {
            school: { include: { faculty: true } },
          },
        },
        teacher: {
          include: { faculty: true },
        },
        librarian: true,
        administrator: true,
      },
    });
    if (!user || user.deletedAt) return null;
    return user;
  }

  async updateUserData(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: { userData: true },
    });

    const { address, ...userDataDto } = dto;

    return await this.prisma.$transaction(async (tx) => {
      if (address && user?.userData?.addressId) {
        await tx.address.update({
          where: { addressId: user.userData.addressId },
          data: { title: address },
        });
      }

      await tx.userData.update({
        where: { userDataId: user?.userDataId },
        data: { ...userDataDto },
      });

      return this.findById(userId);
    });
  }

  async updateUserAdmin(userId: string, dto: UpdateUserDto) {
    const {
      role,
      isConfirmed,
      name,
      paternalSurname,
      maternalSurname,
      email,
      code,
      ...rest
    } = dto;

    const userToUpdate = await this.prisma.user.findUnique({
      where: { userId },
      include: { userData: true },
    });

    if (!userToUpdate) {
      throw new ConflictException('Usuario no encontrado');
    }

    // Validar unicidad si cambian campos críticos
    if (code || email || dto.documentNumber) {
      const orConditions: Prisma.UserWhereInput[] = [];
      if (code && code !== userToUpdate.code) orConditions.push({ code });
      if (email && email !== userToUpdate.userData.email)
        orConditions.push({ userData: { email } });
      if (
        dto.documentNumber &&
        dto.documentNumber !== userToUpdate.userData.documentNumber
      ) {
        orConditions.push({ userData: { documentNumber: dto.documentNumber } });
      }

      if (orConditions.length > 0) {
        const existing = await this.prisma.user.findFirst({
          where: {
            userId: { not: userId },
            OR: orConditions,
          },
        });
        if (existing) {
          throw new ConflictException(
            'El código, email o número de documento ya están en uso por otro usuario',
          );
        }
      }
    }

    const currentName = name || userToUpdate.userData?.name || '';
    const currentPaternal =
      paternalSurname || userToUpdate.userData?.paternalSurname || '';
    const currentCode = code || userToUpdate.code;

    let newSlug = undefined;
    if (name || paternalSurname || code) {
      newSlug = await this.generateUniqueSlug(
        `${currentName} ${currentPaternal} ${currentCode}`,
      );
    }

    const {
      birthdate,
      schoolId,
      facultyId,
      cycle,
      address,
      provinceId,
      documentType,
      ...userDataRest
    } = rest;
    const userDataUpdate: Record<string, unknown> = {
      ...userDataRest,
      name,
      paternalSurname,
      maternalSurname,
      email,
    };

    if (birthdate) {
      userDataUpdate.birthdate = new Date(birthdate);
    }

    return await this.prisma.$transaction(async (tx) => {
      let addressId = userToUpdate.userData.addressId;
      if (address) {
        if (addressId) {
          await tx.address.update({
            where: { addressId },
            data: { title: address },
          });
        } else {
          const newAddress = await tx.address.create({
            data: { title: address },
          });
          addressId = newAddress.addressId;
        }
      }
      if (addressId) {
        userDataUpdate.addressId = addressId;
      }

      // Update User fields
      await tx.user.update({
        where: { userId },
        data: {
          code,
          role,
          isConfirmed,
          slug: newSlug,
        },
      });

      // Update UserData fields
      await tx.userData.update({
        where: { userDataId: userToUpdate.userDataId },
        data: userDataUpdate,
      });

      // Update Specialized roles
      if (role === Role.STUDENT || userToUpdate.role === Role.STUDENT) {
        const studentData: Record<string, unknown> = {};
        if (schoolId) studentData.schoolId = schoolId;
        if (cycle) studentData.cycle = cycle;

        if (Object.keys(studentData).length > 0) {
          await tx.student.upsert({
            where: { userId },
            create: { userId, schoolId: schoolId || '', cycle: cycle || 1 },
            update: studentData,
          });
        }
      }

      if (role === Role.TEACHER || userToUpdate.role === Role.TEACHER) {
        if (facultyId) {
          await tx.teacher.upsert({
            where: { userId },
            create: { userId, facultyId: facultyId },
            update: { facultyId: facultyId },
          });
        }
      }

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
        lastPasswordReset: new Date(),
      },
    });
  }

  async confirmAccount(userId: string) {
    return this.prisma.user.update({
      where: { userId },
      data: {
        isConfirmed: true,
        confirmationToken: null,
        tokenExpiration: null,
        resendCount: 0,
      },
    });
  }

  async renewConfirmationToken(
    userId: string,
    token: string,
    expiration: Date,
  ) {
    return this.prisma.user.update({
      where: { userId },
      data: {
        confirmationToken: token,
        tokenExpiration: expiration,
        resendCount: { increment: 1 },
      },
    });
  }

  async setPasswordResetToken(
    userId: string,
    token: string,
    expiration: Date,
    hasExistingToken: boolean,
  ) {
    return this.prisma.user.update({
      where: { userId },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expiration,
        resetPasswordResendCount: hasExistingToken ? { increment: 1 } : 0,
      },
    });
  }

  async deleteUser(userId: string, adminPassword?: string, adminUserId?: string) {
    if (adminUserId && adminPassword) {
      const admin = await this.prisma.user.findUnique({
        where: { userId: adminUserId },
      });
      if (!admin) {
        throw new ForbiddenException('Administrador no encontrado');
      }
      const isPasswordValid = await bcrypt.compare(adminPassword, admin.password);
      if (!isPasswordValid) {
        throw new ForbiddenException('Contraseña de administrador incorrecta');
      }
    } else if (adminUserId) {
      throw new ForbiddenException('La contraseña de administrador es requerida');
    }

    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: { userData: true },
    });

    if (!user || user.deletedAt) {
      throw new ConflictException('Usuario no encontrado');
    }

    return this.prisma.user.update({
      where: { userId },
      data: {
        deletedAt: new Date(),
        userData: {
          update: {
            activeState: false,
          },
        },
      },
    });
  }

  async findByConfirmationToken(token: string) {
    return this.prisma.user.findFirst({
      where: { confirmationToken: token },
    });
  }
}
