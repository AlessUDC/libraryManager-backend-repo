import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { LoanType } from '@prisma/client';
export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  copyId: string;

  @IsEnum(LoanType)
  requestedLoanType: LoanType;

  @IsDateString()
  requestedDueDate: string;

  @IsInt()
  @Min(15)
  @Max(120)
  reservationDurationMinutes: number;
}

export class RedeemReservationDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
