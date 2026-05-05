import { IsEmail, IsNotEmpty, Length, Matches } from 'class-validator';

export class ConfirmAccountDto {
  @IsEmail({}, { message: 'El formato del email no es válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @IsNotEmpty({ message: 'El código de confirmación es obligatorio' })
  @Length(6, 6, { message: 'El código debe tener exactamente 6 dígitos' })
  @Matches(/^[0-9]+$/, { message: 'El código solo debe contener números' })
  token: string;
}
