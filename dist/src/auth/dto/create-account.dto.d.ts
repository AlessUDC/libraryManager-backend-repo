import { Role } from '@prisma/client';
export declare class CreateAccountDto {
    code: string;
    password: string;
    role?: Role;
    name: string;
    paternalSurname: string;
    maternalSurname: string;
    documentNumber: string;
    maritalStatus?: string;
    gender?: string;
    birthdate: string;
    mobilePhone?: string;
    landlinePhone?: string;
    email: string;
    schoolId?: string;
    facultyId?: string;
}
