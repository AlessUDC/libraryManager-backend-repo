import { ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { Role } from '@prisma/client';
export declare class IsDocumentNumberValidConstraint implements ValidatorConstraintInterface {
    validate(text: string, args: ValidationArguments): boolean;
    defaultMessage(args: ValidationArguments): "El DNI debe tener exactamente 8 dígitos numéricos" | "El Carnet de Extranjería debe tener exactamente 9 dígitos numéricos" | "Número de documento inválido";
}
export declare class IsMinBirthDateConstraint implements ValidatorConstraintInterface {
    validate(birthdate: string): boolean;
    defaultMessage(): string;
}
export declare class CreateAccountDto {
    code: string;
    password: string;
    role?: Role;
    name: string;
    paternalSurname: string;
    maternalSurname: string;
    documentType: string;
    documentNumber: string;
    maritalStatus: string;
    gender: string;
    birthdate: string;
    mobilePhone: string;
    landlinePhone: string;
    email: string;
    provinceId: string;
    districtId: string;
    address: string;
    schoolId?: string;
    facultyId?: string;
    cycle?: number;
}
