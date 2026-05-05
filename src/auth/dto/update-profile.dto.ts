import { IsString, IsOptional, Matches, IsNotEmpty, IsIn, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsString()
  @Matches(/^\d{9}$/, { message: 'El teléfono móvil debe tener exactamente 9 dígitos' })
  mobilePhone?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsString()
  @Matches(/^\d{9}$/, { message: 'El teléfono fijo debe tener exactamente 9 dígitos' })
  landlinePhone?: string;

  @IsNotEmpty({ message: 'El estado civil es obligatorio' })
  @IsString({ message: 'El estado civil debe ser una cadena de texto' })
  @IsIn(['S', 'C', 'V', 'D'], { message: 'El estado civil debe ser S, C, V o D' })
  maritalStatus: string;

  @IsString({ message: 'El distrito debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El distrito es obligatorio' })
  districtId: string;

  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  address: string;
}
