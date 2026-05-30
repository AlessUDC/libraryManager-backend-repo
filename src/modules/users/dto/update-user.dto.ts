import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  Length,
  Matches,
  Validate,
} from 'class-validator';
import { Role } from '@prisma/client';
import { IsDocumentNumberValidConstraint } from '../../../auth/dto/create-account.dto';

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @Length(10, 10, { message: 'El código debe tener exactamente 10 dígitos' })
  @Matches(/^[0-9]+$/, { message: 'El código solo debe contener números' })
  code?: string;

  @IsOptional()
  @IsBoolean()
  isConfirmed?: boolean;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  paternalSurname?: string;

  @IsOptional()
  @IsString()
  maternalSurname?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  birthdate?: string;

  @IsOptional()
  @IsString({ message: 'El número de documento debe ser una cadena de texto' })
  @Validate(IsDocumentNumberValidConstraint)
  documentNumber?: string;

  @IsOptional()
  @IsBoolean()
  activeState?: boolean;

  @IsOptional()
  @IsString()
  documentType?: string;
  
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString({ message: 'El teléfono móvil debe ser una cadena de texto' })
  @Matches(/^\d{9}$/, {
    message: 'El teléfono móvil debe tener exactamente 9 dígitos',
  })
  mobilePhone?: string;

  @IsOptional()
  @IsString({ message: 'El teléfono fijo debe ser una cadena de texto' })
  @Matches(/^\d{9}$/, {
    message: 'El teléfono fijo debe tener exactamente 9 dígitos',
  })
  landlinePhone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  provinceId?: string;

  @IsOptional()
  @IsString()
  districtId?: string;

  @IsOptional()
  @IsString()
  facultyId?: string;

  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  cycle?: number;
}
