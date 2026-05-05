import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class VerifyResetTokenDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @IsNotEmpty({ message: 'El token es obligatorio' })
  @Length(6, 6, { message: 'El token debe tener 6 dígitos' })
  token: string;
}
