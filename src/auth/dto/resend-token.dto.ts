import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendTokenDto {
  @IsEmail({}, { message: 'El formato del email no es válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;
}
