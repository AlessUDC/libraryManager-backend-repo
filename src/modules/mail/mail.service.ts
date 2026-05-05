import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  async sendConfirmationEmail(email: string, token: string) {
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
    } catch (error) {
      this.logger.error(`Error enviando correo de confirmación a ${email}`, error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
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
    } catch (error) {
      this.logger.error(`Error enviando correo de recuperación a ${email}`, error);
      return false;
    }
  }
}
