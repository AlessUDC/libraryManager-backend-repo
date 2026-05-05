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
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let MailService = MailService_1 = class MailService {
    configService;
    transporter;
    logger = new common_1.Logger(MailService_1.name);
    constructor(configService) {
        this.configService = configService;
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: this.configService.get('EMAIL_USER'),
                pass: this.configService.get('EMAIL_PASS'),
            },
        });
    }
    async sendConfirmationEmail(email, token) {
        try {
            await this.transporter.sendMail({
                from: '"Nexus Platform" <noreply@nexus.com>',
                to: email,
                subject: 'Confirma tu cuenta en Nexus Biblioteca',
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px">
            <h2 style="color: #4F46E5; text-align: center">Bienvenido a Nexus</h2>
            <p>Gracias por registrarte. Para confirmar tu cuenta, ingresa el siguiente código de 6 dígitos en la aplicación:</p>
            <div style="background: #F3F4F6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; margin: 20px 0">
              ${token}
            </div>
            
            
            <p style="font-size: 12px; color: #6B7280; margin-top: 30px; text-align: center">
              Este código expirará pronto. Si no solicitaste este registro, puedes ignorar este correo.
            </p>
          </div>
        `,
            });
            this.logger.log(`Correo de confirmación enviado exitosamente a ${email}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Error enviando correo de confirmación a ${email}`, error);
            return false;
        }
    }
    async sendPasswordResetEmail(email, token) {
        try {
            const resetUrl = `http://localhost:5173/auth/reset-password`;
            await this.transporter.sendMail({
                from: '"Nexus Platform" <noreply@nexus.com>',
                to: email,
                subject: 'Restablece tu contraseña en Nexus Biblioteca',
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px">
            <h2 style="color: #4F46E5; text-align: center">Recuperación de Contraseña</h2>
            <p>Has solicitado restablecer tu contraseña. Ingresa el siguiente código de 6 dígitos en la aplicación:</p>
            <div style="background: #F3F4F6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; margin: 20px 0">
              ${token}
            </div>
            <p style="text-align: center">O haz clic en el siguiente enlace para ir a la página de recuperación:</p>
            <div style="text-align: center">
              <a href="${resetUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block">Restablecer contraseña</a>
            </div>
            <p style="font-size: 12px; color: #6B7280; margin-top: 30px; text-align: center">
              Este código expirará en 10 minutos. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
            </p>
          </div>
        `,
            });
            this.logger.log(`Correo de recuperación enviado exitosamente a ${email}`);
            return true;
        }
        catch (error) {
            this.logger.error(`Error enviando correo de recuperación a ${email}`, error);
            return false;
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map