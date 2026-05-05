import { AuthService } from './auth.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { ConfirmAccountDto } from './dto/confirm-account.dto';
import { ResendTokenDto } from './dto/resend-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetTokenDto } from './dto/verify-reset-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { RequestWithUser } from './interfaces/request-with-user.interface';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    getProfile(req: RequestWithUser): Promise<{
        userData: {
            address: {
                addressId: string;
                title: string;
            } | null;
            district: ({
                province: {
                    title: string;
                    provinceId: string;
                };
            } & {
                districtId: string;
                title: string;
                provinceId: string;
            }) | null;
        } & {
            userDataId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
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
            districtId: string | null;
        };
        student: ({
            school: {
                faculty: {
                    title: string;
                    facultyId: string;
                };
            } & {
                title: string;
                schoolId: string;
                facultyId: string;
            };
        } & {
            userId: string;
            cycle: number;
            onTimeDeliveriesCount: number;
            schoolId: string;
        }) | null;
        teacher: ({
            faculty: {
                title: string;
                facultyId: string;
            };
        } & {
            userId: string;
            facultyId: string;
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
    updateProfile(req: RequestWithUser, updateProfileDto: UpdateProfileDto): Promise<({
        userData: {
            address: {
                addressId: string;
                title: string;
            } | null;
            district: ({
                province: {
                    title: string;
                    provinceId: string;
                };
            } & {
                districtId: string;
                title: string;
                provinceId: string;
            }) | null;
        } & {
            userDataId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
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
            districtId: string | null;
        };
        student: ({
            school: {
                faculty: {
                    title: string;
                    facultyId: string;
                };
            } & {
                title: string;
                schoolId: string;
                facultyId: string;
            };
        } & {
            userId: string;
            cycle: number;
            onTimeDeliveriesCount: number;
            schoolId: string;
        }) | null;
        teacher: ({
            faculty: {
                title: string;
                facultyId: string;
            };
        } & {
            userId: string;
            facultyId: string;
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
    register(createAccountDto: CreateAccountDto): Promise<{
        message: string;
        userId: string;
        code: string;
    }>;
    confirm(confirmAccountDto: ConfirmAccountDto): Promise<{
        message: string;
    }>;
    resendToken(resendTokenDto: ResendTokenDto): Promise<{
        message: string;
    }>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    verifyResetToken(verifyResetTokenDto: VerifyResetTokenDto): Promise<{
        message: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        message: string;
        token: string;
        user: {
            id: string;
            role: import("@prisma/client").$Enums.Role;
        };
    }>;
}
