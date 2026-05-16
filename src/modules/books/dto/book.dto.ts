import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateBookDto {
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title: string;

  @IsString({ message: 'El ISBN debe ser una cadena de texto' })
  @IsOptional()
  isbn?: string;

  @IsString({ message: 'La editorial debe ser una cadena de texto' })
  @IsOptional()
  publisher?: string;

  @IsInt({ message: 'El año de publicación debe ser un número entero' })
  @IsOptional()
  publicationYear?: number;

  @IsString({ message: 'La edición debe ser una cadena de texto' })
  @IsOptional()
  edition?: string;

  @IsString({ message: 'El idioma debe ser una cadena de texto' })
  @IsOptional()
  language?: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;

  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  @IsOptional()
  activeState?: boolean;

  @IsArray({ message: 'Las categorías deben ser un arreglo de IDs' })
  @IsUUID('all', {
    each: true,
    message: 'Cada categoría debe ser un UUID válido',
  })
  @IsOptional()
  categoryIds?: string[];

  @IsArray({ message: 'Los autores deben ser un arreglo de IDs' })
  @IsUUID('all', { each: true, message: 'Cada autor debe ser un UUID válido' })
  @IsOptional()
  authorIds?: string[];
}

export class UpdateBookDto {
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsOptional()
  title?: string;

  @IsString({ message: 'El ISBN debe ser una cadena de texto' })
  @IsOptional()
  isbn?: string;

  @IsString({ message: 'La editorial debe ser una cadena de texto' })
  @IsOptional()
  publisher?: string;

  @IsInt({ message: 'El año de publicación debe ser un número entero' })
  @IsOptional()
  publicationYear?: number;

  @IsString({ message: 'La edición debe ser una cadena de texto' })
  @IsOptional()
  edition?: string;

  @IsString({ message: 'El idioma debe ser una cadena de texto' })
  @IsOptional()
  language?: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;

  @IsBoolean({ message: 'El estado debe ser un valor booleano' })
  @IsOptional()
  activeState?: boolean;

  @IsArray({ message: 'Las categorías deben ser un arreglo de IDs' })
  @IsUUID('all', {
    each: true,
    message: 'Cada categoría debe ser un UUID válido',
  })
  @IsOptional()
  categoryIds?: string[];

  @IsArray({ message: 'Los autores deben ser un arreglo de IDs' })
  @IsUUID('all', { each: true, message: 'Cada autor debe ser un UUID válido' })
  @IsOptional()
  authorIds?: string[];
}
