import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsDateString,
  ValidateIf,
  Min,
  IsIn,
  Length,
  IsInt,
  Max,
  Matches,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Role } from '@prisma/client';

@ValidatorConstraint({ name: 'isDocumentNumberValid', async: false })
export class IsDocumentNumberValidConstraint implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments) {
    if (!text || typeof text !== 'string') return false;
    const object = args.object as any;
    const docType = object.documentType;
    if (docType === 'DNI') {
      return /^[0-9]{8}$/.test(text);
    }
    if (docType === 'CE') {
      return /^[0-9]{9}$/.test(text);
    }
    if (!docType) {
      return /^[0-9]{8}$/.test(text) || /^[0-9]{9}$/.test(text);
    }
    return false;
  }

  defaultMessage(args: ValidationArguments) {
    const object = args.object as any;
    const docType = object.documentType;
    if (docType === 'DNI') {
      return 'El DNI debe tener exactamente 8 dígitos numéricos';
    }
    if (docType === 'CE') {
      return 'El Carnet de Extranjería debe tener exactamente 9 dígitos numéricos';
    }
    return 'El número de documento debe tener 8 dígitos para DNI o 9 dígitos para CE';
  }
}

@ValidatorConstraint({ name: 'isMinBirthDate', async: false })
export class IsMinBirthDateConstraint implements ValidatorConstraintInterface {
  validate(birthdate: string) {
    if (!birthdate) return false;
    const date = new Date(birthdate);
    // Verificar si es una fecha válida y si el año es >= 1940
    return !isNaN(date.getTime()) && date.getFullYear() >= 1940;
  }

  defaultMessage() {
    return 'La fecha de nacimiento debe ser a partir del año 1940';
  }
}

export class CreateAccountDto {
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El código es obligatorio' })
  @Length(10, 10, { message: 'El código debe tener exactamente 10 dígitos' })
  @Matches(/^[0-9]+$/, { message: 'El código solo debe contener números' })
  code: string;

  @IsEnum(Role, { message: 'Rol no válido' })
  @IsOptional()
  role?: Role;

  // Datos personales (UserData)
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @IsString({ message: 'El apellido paterno debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El apellido paterno es obligatorio' })
  paternalSurname: string;

  @IsString({ message: 'El apellido materno debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El apellido materno es obligatorio' })
  maternalSurname: string;

  @IsString({ message: 'El tipo de documento debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El tipo de documento es obligatorio' })
  @IsIn(['DNI', 'CE'], { message: 'El tipo de documento debe ser DNI o CE' })
  documentType: string;

  @IsString({ message: 'El número de documento debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  @Validate(IsDocumentNumberValidConstraint)
  documentNumber: string;

  @IsNotEmpty({ message: 'El estado civil es obligatorio' })
  @IsString({ message: 'El estado civil debe ser una cadena de texto' })
  @IsIn(['S', 'C', 'V', 'D'], {
    message: 'El estado civil debe ser S, C, V o D',
  })
  maritalStatus: string;

  @IsNotEmpty({ message: 'El género es obligatorio' })
  @IsString({ message: 'El género debe ser una cadena de texto' })
  @IsIn(['F', 'M', 'O'], { message: 'El género debe ser F, M o O' })
  gender: string;

  @IsDateString(
    {},
    { message: 'La fecha de nacimiento debe tener un formato válido' },
  )
  @IsNotEmpty({ message: 'La fecha de nacimiento es obligatoria' })
  @Validate(IsMinBirthDateConstraint)
  birthdate: string;

  @IsNotEmpty({ message: 'El teléfono móvil es obligatorio' })
  @IsString({ message: 'El teléfono móvil debe ser una cadena de texto' })
  @Matches(/^\d{9}$/, {
    message: 'El teléfono móvil debe tener exactamente 9 dígitos',
  })
  mobilePhone: string;

  @IsNotEmpty({ message: 'El teléfono fijo es obligatorio' })
  @IsString({ message: 'El teléfono fijo debe ser una cadena de texto' })
  @Matches(/^\d{9}$/, {
    message: 'El teléfono fijo debe tener exactamente 9 dígitos',
  })
  landlinePhone: string;

  @IsEmail({}, { message: 'El formato del email no es válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  // Ubicación
  @IsString({ message: 'La provincia debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La provincia es obligatoria' })
  provinceId: string;

  @IsString({ message: 'El distrito debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El distrito es obligatorio' })
  districtId: string;

  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  address: string;

  // Si es estudiante o profesor, se podrían necesitar schoolId o facultyId
  @ValidateIf((o) => o.role === Role.STUDENT)
  @IsNotEmpty({ message: 'La escuela es obligatoria' })
  @IsString({ message: 'La escuela debe ser una cadena de texto' })
  schoolId?: string;

  @ValidateIf((o) => o.role === Role.TEACHER || o.role === Role.STUDENT)
  @IsNotEmpty({ message: 'La facultad es obligatoria' })
  @IsString({ message: 'La facultad debe ser una cadena de texto' })
  facultyId?: string;

  @ValidateIf((o) => o.role === Role.STUDENT)
  @IsNotEmpty({ message: 'El ciclo es obligatorio para estudiantes' })
  @IsInt({ message: 'El ciclo debe ser un número entero' })
  @Min(1, { message: 'El ciclo mínimo es 1' })
  @Max(10, { message: 'El ciclo máximo es 10' })
  cycle?: number;
}
