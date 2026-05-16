import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { LoanStatus } from '@prisma/client';

export class CreateLoanDto {
  @IsUUID('all', { message: 'El ID del usuario debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El usuario es obligatorio' })
  userId: string;

  @IsUUID('all', { message: 'El ID del ejemplar debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ejemplar es obligatorio' })
  copyId: string;

  @IsDateString(
    {},
    { message: 'La fecha de vencimiento debe ser una fecha válida' },
  )
  @IsNotEmpty({ message: 'La fecha de vencimiento es obligatoria' })
  dueDate: string;
}

export class UpdateLoanStatusDto {
  @IsEnum(LoanStatus, { message: 'Estado no válido' })
  @IsNotEmpty({ message: 'El estado es obligatorio' })
  status: LoanStatus;
}

export class ReturnLoanDto {
  @IsString({ message: 'La condición debe ser un texto' })
  @IsNotEmpty({ message: 'La condición es obligatoria' })
  condition: string;

  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser un texto' })
  observations?: string;
}
