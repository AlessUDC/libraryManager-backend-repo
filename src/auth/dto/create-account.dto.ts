import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, IsDateString } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  // Datos personales (UserData)
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  paternalSurname: string;

  @IsString()
  @IsNotEmpty()
  maternalSurname: string;

  @IsString()
  @IsNotEmpty()
  documentNumber: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsDateString()
  @IsNotEmpty()
  birthdate: string;

  @IsOptional()
  @IsString()
  mobilePhone?: string;

  @IsOptional()
  @IsString()
  landlinePhone?: string;

  @IsEmail({}, { message: 'El formato del email no es válido' })
  @IsNotEmpty()
  email: string;

  // Si es estudiante o profesor, se podrían necesitar schoolId o facultyId
  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsString()
  facultyId?: string;
}
