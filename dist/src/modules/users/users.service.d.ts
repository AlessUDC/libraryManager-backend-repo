import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from '../../auth/dto/create-account.dto';
import { MailService } from '../mail/mail.service';
import { UpdateProfileDto } from '../../auth/dto/update-profile.dto';
export declare class UsersService {
    private prisma;
    private mailService;
    constructor(prisma: PrismaService, mailService: MailService);
    createAccount(dto: CreateAccountDto, hashedPassword: string): Promise<{
        message: string;
        userId: string;
        code: string;
    }>;
    private validateUniqueness;
    private validateReferentialIntegrity;
    private generateConfirmationToken;
    private createSpecializedRoleRecord;
    findById(userId: string): Promise<({
        userData: {
            district: ({
                province: {
                    title: string;
                    provinceId: string;
                };
            } & {
                title: string;
                provinceId: string;
                districtId: string;
            }) | null;
            address: {
                title: string;
                addressId: string;
            } | null;
        } & {
            name: string;
            districtId: string | null;
            userDataId: string;
            createdAt: Date;
            updatedAt: Date;
            paternalSurname: string;
            maternalSurname: string;
            documentNumber: string;
            maritalStatus: string | null;
            gender: string | null;
            activeState: boolean;
            birthdate: Date;
            mobilePhone: string | null;
            landlinePhone: string | null;
            email: string;
            addressId: string | null;
        };
        student: ({
            school: {
                faculty: {
                    facultyId: string;
                    title: string;
                };
            } & {
                facultyId: string;
                title: string;
                schoolId: string;
            };
        } & {
            schoolId: string;
            userId: string;
            cycle: number;
            onTimeDeliveriesCount: number;
        }) | null;
        teacher: ({
            faculty: {
                facultyId: string;
                title: string;
            };
        } & {
            facultyId: string;
            userId: string;
        }) | null;
    } & {
        userId: string;
        code: string;
        userDataId: string;
        password: string;
        role: import("@prisma/client").$Enums.Role;
        isConfirmed: boolean;
        confirmationToken: string | null;
        tokenExpiration: Date | null;
        resendCount: number;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        resetPasswordResendCount: number;
        lastPasswordReset: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    findByEmail(email: string): Promise<({
        userData: {
            name: string;
            districtId: string | null;
            userDataId: string;
            createdAt: Date;
            updatedAt: Date;
            paternalSurname: string;
            maternalSurname: string;
            documentNumber: string;
            maritalStatus: string | null;
            gender: string | null;
            activeState: boolean;
            birthdate: Date;
            mobilePhone: string | null;
            landlinePhone: string | null;
            email: string;
            addressId: string | null;
        };
    } & {
        userId: string;
        code: string;
        userDataId: string;
        password: string;
        role: import("@prisma/client").$Enums.Role;
        isConfirmed: boolean;
        confirmationToken: string | null;
        tokenExpiration: Date | null;
        resendCount: number;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        resetPasswordResendCount: number;
        lastPasswordReset: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    findByCode(code: string): Promise<({
        userData: {
            name: string;
            districtId: string | null;
            userDataId: string;
            createdAt: Date;
            updatedAt: Date;
            paternalSurname: string;
            maternalSurname: string;
            documentNumber: string;
            maritalStatus: string | null;
            gender: string | null;
            activeState: boolean;
            birthdate: Date;
            mobilePhone: string | null;
            landlinePhone: string | null;
            email: string;
            addressId: string | null;
        };
    } & {
        userId: string;
        code: string;
        userDataId: string;
        password: string;
        role: import("@prisma/client").$Enums.Role;
        isConfirmed: boolean;
        confirmationToken: string | null;
        tokenExpiration: Date | null;
        resendCount: number;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        resetPasswordResendCount: number;
        lastPasswordReset: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    updateUserData(userId: string, dto: UpdateProfileDto): Promise<({
        userData: {
            district: ({
                province: {
                    title: string;
                    provinceId: string;
                };
            } & {
                title: string;
                provinceId: string;
                districtId: string;
            }) | null;
            address: {
                title: string;
                addressId: string;
            } | null;
        } & {
            name: string;
            districtId: string | null;
            userDataId: string;
            createdAt: Date;
            updatedAt: Date;
            paternalSurname: string;
            maternalSurname: string;
            documentNumber: string;
            maritalStatus: string | null;
            gender: string | null;
            activeState: boolean;
            birthdate: Date;
            mobilePhone: string | null;
            landlinePhone: string | null;
            email: string;
            addressId: string | null;
        };
        student: ({
            school: {
                faculty: {
                    facultyId: string;
                    title: string;
                };
            } & {
                facultyId: string;
                title: string;
                schoolId: string;
            };
        } & {
            schoolId: string;
            userId: string;
            cycle: number;
            onTimeDeliveriesCount: number;
        }) | null;
        teacher: ({
            faculty: {
                facultyId: string;
                title: string;
            };
        } & {
            facultyId: string;
            userId: string;
        }) | null;
    } & {
        userId: string;
        code: string;
        userDataId: string;
        password: string;
        role: import("@prisma/client").$Enums.Role;
        isConfirmed: boolean;
        confirmationToken: string | null;
        tokenExpiration: Date | null;
        resendCount: number;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        resetPasswordResendCount: number;
        lastPasswordReset: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    updatePassword(userId: string, passwordHash: string): Promise<{
        userId: string;
        code: string;
        userDataId: string;
        password: string;
        role: import("@prisma/client").$Enums.Role;
        isConfirmed: boolean;
        confirmationToken: string | null;
        tokenExpiration: Date | null;
        resendCount: number;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        resetPasswordResendCount: number;
        lastPasswordReset: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    confirmAccount(userId: string): Promise<{
        userId: string;
        code: string;
        userDataId: string;
        password: string;
        role: import("@prisma/client").$Enums.Role;
        isConfirmed: boolean;
        confirmationToken: string | null;
        tokenExpiration: Date | null;
        resendCount: number;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        resetPasswordResendCount: number;
        lastPasswordReset: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    renewConfirmationToken(userId: string, token: string, expiration: Date): Promise<{
        userId: string;
        code: string;
        userDataId: string;
        password: string;
        role: import("@prisma/client").$Enums.Role;
        isConfirmed: boolean;
        confirmationToken: string | null;
        tokenExpiration: Date | null;
        resendCount: number;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        resetPasswordResendCount: number;
        lastPasswordReset: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    setPasswordResetToken(userId: string, token: string, expiration: Date, hasExistingToken: boolean): Promise<{
        userId: string;
        code: string;
        userDataId: string;
        password: string;
        role: import("@prisma/client").$Enums.Role;
        isConfirmed: boolean;
        confirmationToken: string | null;
        tokenExpiration: Date | null;
        resendCount: number;
        resetPasswordToken: string | null;
        resetPasswordExpires: Date | null;
        resetPasswordResendCount: number;
        lastPasswordReset: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
