import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { CopyStatus, CopyCondition } from '@prisma/client';

export class CreateCopyDto {
  @IsString({ message: 'El código de barras debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El código de barras es obligatorio' })
  barcode: string;

  @IsString({ message: 'La ubicación debe ser una cadena de texto' })
  @IsOptional()
  location?: string;

  @IsEnum(CopyStatus, { message: 'Estado no válido' })
  @IsOptional()
  status?: CopyStatus;

  @IsEnum(CopyCondition, { message: 'Condición física no válida' })
  @IsOptional()
  condition?: CopyCondition;

  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  @IsOptional()
  activeState?: boolean;

  @IsUUID('all', { message: 'El ID del libro debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del libro es obligatorio' })
  bookId: string;
}

export class UpdateCopyDto {
  @IsString({ message: 'El código de barras debe ser una cadena de texto' })
  @IsOptional()
  barcode?: string;

  @IsString({ message: 'La ubicación debe ser una cadena de texto' })
  @IsOptional()
  location?: string;

  @IsEnum(CopyStatus, { message: 'Estado no válido' })
  @IsOptional()
  status?: CopyStatus;

  @IsEnum(CopyCondition, { message: 'Condición física no válida' })
  @IsOptional()
  condition?: CopyCondition;

  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  @IsOptional()
  activeState?: boolean;

  @IsUUID('all', { message: 'El ID del libro debe ser un UUID válido' })
  @IsOptional()
  bookId?: string;
}
