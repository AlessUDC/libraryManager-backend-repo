import { CreateAccountDto } from './dto/create-account.dto';
import { ConfirmAccountDto } from './dto/confirm-account.dto';
import { UsersService } from '../modules/users/users.service';
import { ResendTokenDto } from './dto/resend-token.dto';
import { MailService } from '../modules/mail/mail.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetTokenDto } from './dto/verify-reset-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
export declare class AuthService {
    private usersService;
    private mailService;
    private jwtService;
    constructor(usersService: UsersService, mailService: MailService, jwtService: JwtService);
    register(dto: CreateAccountDto): Promise<{
        message: string;
        userId: string;
        code: string;
    }>;
    confirmAccount(dto: ConfirmAccountDto): Promise<{
        message: string;
    }>;
    resendToken(dto: ResendTokenDto): Promise<{
        message: string;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    verifyResetToken(dto: VerifyResetTokenDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        message: string;
        token: string;
        user: {
            id: string;
            role: import("@prisma/client").$Enums.Role;
        };
    }>;
    getUserProfile(userId: string): Promise<{
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
        userId: string;
        code: string;
        userDataId: string;
        role: import("@prisma/client").$Enums.Role;
        isConfirmed: boolean;
        tokenExpiration: Date | null;
        resendCount: number;
        resetPasswordExpires: Date | null;
        resetPasswordResendCount: number;
        lastPasswordReset: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateUserProfile(userId: string, dto: UpdateProfileDto): Promise<({
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
    private requireUserByEmail;
    private assertUnconfirmed;
    private assertTokenValid;
    private assertTokenNotExpired;
    private generateOtp;
}
