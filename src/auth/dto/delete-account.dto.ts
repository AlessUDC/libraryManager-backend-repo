import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteAccountDto {
  @IsNotEmpty({ message: 'La contraseña es obligatoria para confirmar la acción' })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  password: string;
}
