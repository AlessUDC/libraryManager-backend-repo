import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ActivateAccountDto {
  @IsNotEmpty({ message: 'El token es obligatorio' })
  @IsString()
  token: string;

  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsNotEmpty({ message: 'La confirmación de contraseña es obligatoria' })
  @IsString()
  passwordConfirmation: string;
}
