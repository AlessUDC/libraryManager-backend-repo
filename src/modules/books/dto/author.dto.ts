import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateAuthorDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @IsString({ message: 'La nacionalidad debe ser una cadena de texto' })
  @IsOptional()
  nationality?: string;

  @IsString({ message: 'La biografía debe ser una cadena de texto' })
  @IsOptional()
  biography?: string;

  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  @IsOptional()
  activeState?: boolean;
}

export class UpdateAuthorDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsOptional()
  name?: string;

  @IsString({ message: 'La nacionalidad debe ser una cadena de texto' })
  @IsOptional()
  nationality?: string;

  @IsString({ message: 'La biografía debe ser una cadena de texto' })
  @IsOptional()
  biography?: string;

  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  @IsOptional()
  activeState?: boolean;
}
