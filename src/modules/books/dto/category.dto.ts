import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title: string;

  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  @IsOptional()
  activeState?: boolean;
}

export class UpdateCategoryDto {
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsOptional()
  title?: string;

  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  @IsOptional()
  activeState?: boolean;
}
