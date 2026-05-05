"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const users_service_1 = require("../modules/users/users.service");
const mail_service_1 = require("../modules/mail/mail.service");
const jwt_1 = require("@nestjs/jwt");
let AuthService = class AuthService {
    usersService;
    mailService;
    jwtService;
    constructor(usersService, mailService, jwtService) {
        this.usersService = usersService;
        this.mailService = mailService;
        this.jwtService = jwtService;
    }
    async register(dto) {
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        return this.usersService.createAccount(dto, hashedPassword);
    }
    async confirmAccount(dto) {
        const { email, token } = dto;
        const user = await this.requireUserByEmail(email);
        this.assertUnconfirmed(user);
        this.assertTokenValid(user.confirmationToken, token, 'El código de confirmación es incorrecto');
        this.assertTokenNotExpired(user.tokenExpiration, 'El código de confirmación ha expirado');
        await this.usersService.confirmAccount(user.userId);
        return { message: 'Cuenta confirmada correctamente' };
    }
    async resendToken(dto) {
        const { email } = dto;
        const user = await this.requireUserByEmail(email);
        this.assertUnconfirmed(user);
        if (user.resendCount >= 1) {
            throw new common_1.ForbiddenException('Límite de peticiones de reenvío superado');
        }
        const { token, expiration } = this.generateOtp(7);
        await this.usersService.renewConfirmationToken(user.userId, token, expiration);
        await this.mailService.sendConfirmationEmail(email, token);
        return { message: 'Se ha enviado un nuevo código a tu correo' };
    }
    async forgotPassword(dto) {
        const { email } = dto;
        const user = await this.requireUserByEmail(email);
        if (!user.isConfirmed) {
            throw new common_1.ForbiddenException('Debes confirmar tu cuenta antes de poder reestablecer tu contraseña');
        }
        if (user.lastPasswordReset) {
            const twelveHoursAgo = new Date();
            twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
            if (user.lastPasswordReset > twelveHoursAgo) {
                throw new common_1.ForbiddenException('Solo puedes reestablecer tu contraseña una vez cada 12 horas');
            }
        }
        if (user.resetPasswordToken && user.resetPasswordResendCount >= 1) {
            throw new common_1.ForbiddenException('Límite de peticiones de reenvío superado');
        }
        const { token, expiration } = this.generateOtp(10);
        await this.usersService.setPasswordResetToken(user.userId, token, expiration, !!user.resetPasswordToken);
        await this.mailService.sendPasswordResetEmail(email, token);
        return { message: 'Se han enviado las instrucciones a tu correo' };
    }
    async verifyResetToken(dto) {
        const { email, token } = dto;
        const user = await this.requireUserByEmail(email);
        this.assertTokenValid(user.resetPasswordToken, token, 'El código de recuperación es incorrecto para este correo');
        this.assertTokenNotExpired(user.resetPasswordExpires, 'El código de recuperación ha expirado');
        return { message: 'Código verificado correctamente' };
    }
    async resetPassword(dto) {
        const { email, token, password, passwordConfirmation } = dto;
        if (password !== passwordConfirmation) {
            throw new common_1.ForbiddenException('Las contraseñas no coinciden');
        }
        const user = await this.requireUserByEmail(email);
        this.assertTokenValid(user.resetPasswordToken, token, 'El código de recuperación es incorrecto para este correo');
        this.assertTokenNotExpired(user.resetPasswordExpires, 'El código de recuperación ha expirado');
        const hashedPassword = await bcrypt.hash(password, 10);
        await this.usersService.updatePassword(user.userId, hashedPassword);
        return { message: 'Tu contraseña ha sido restablecida correctamente' };
    }
    async login(dto) {
        const { code, password } = dto;
        const user = await this.usersService.findByCode(code);
        if (!user) {
            throw new common_1.UnauthorizedException('El código de usuario o la contraseña son incorrectos');
        }
        if (!user.isConfirmed) {
            throw new common_1.ForbiddenException('Debes confirmar tu cuenta antes de poder iniciar sesión');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('El código de usuario o la contraseña son incorrectos');
        }
        const token = this.jwtService.sign({ sub: user.userId, role: user.role });
        return {
            message: 'Inicio de sesión exitoso',
            token,
            user: { id: user.userId, role: user.role }
        };
    }
    async getUserProfile(userId) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException('Usuario no encontrado');
        const { password, confirmationToken, resetPasswordToken, ...userProfile } = user;
        return userProfile;
    }
    async updateUserProfile(userId, dto) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException('Usuario no encontrado');
        return this.usersService.updateUserData(userId, dto);
    }
    async requireUserByEmail(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user)
            throw new common_1.UnauthorizedException('El correo electrónico no está registrado');
        return user;
    }
    assertUnconfirmed(user) {
        if (user.isConfirmed) {
            throw new common_1.UnauthorizedException('Esta cuenta ya ha sido confirmada');
        }
    }
    assertTokenValid(stored, received, message) {
        if (!stored || stored !== received) {
            throw new common_1.UnauthorizedException(message);
        }
    }
    assertTokenNotExpired(expiration, message) {
        if (expiration && new Date() > expiration) {
            throw new common_1.UnauthorizedException(message);
        }
    }
    generateOtp(expirationMinutes) {
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const expiration = new Date();
        expiration.setMinutes(expiration.getMinutes() + expirationMinutes);
        return { token, expiration };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        mail_service_1.MailService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map