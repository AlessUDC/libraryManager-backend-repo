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
      this.logger.error(
        `Error enviando correo de confirmación a ${email}`,
        error,
      );
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
      this.logger.error(
        `Error enviando correo de recuperación a ${email}`,
        error,
      );
      return false;
    }
  }
  async sendActivationEmail(
    email: string,
    name: string,
    code: string,
    token: string,
  ) {
    try {
      const activationUrl = `http://localhost:5173/auth/activate/${token}`;

      await this.transporter.sendMail({
        from: '"LibManager Platform" <noreply@libmanager.com>',
        to: email,
        subject: 'Activa tu cuenta en LibManager',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin-bottom: 10px;">¡Bienvenido, ${name}!</h1>
              <p style="font-size: 16px; color: #64748b;">Tu cuenta de LibManager ha sido creada por el administrador.</p>
            </div>
            
            <div style="background-color: #f8fafc; padding: 25px; border-radius: 15px; border: 1px solid #f1f5f9; margin-bottom: 30px; text-align: center;">
              <p style="margin-top: 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px;">Tu código de usuario:</p>
              <span style="color: #0f172a; font-weight: bold; font-size: 24px;">${code}</span>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #475569; text-align: center;">
              Para completar la configuración de tu cuenta y establecer tu contraseña, por favor haz clic en el siguiente botón.
              <strong>Este enlace expirará en 24 horas.</strong>
            </p>

            <div style="text-align: center; margin-top: 40px;">
              <a href="${activationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Activar mi cuenta</a>
            </div>

            <p style="font-size: 12px; color: #94a3b8; margin-top: 30px; text-align: center;">
              Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br>
              <a href="${activationUrl}" style="color: #2563eb;">${activationUrl}</a>
            </p>

            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8;">
                Este es un correo automático, por favor no respondas. <br>
                &copy; 2026 LibManager System. Todos los derechos reservados.
              </p>
            </div>
          </div>
        `,
      });

      this.logger.log(`Correo de activación enviado exitosamente a ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Error enviando correo de activación a ${email}`,
        error,
      );
      return false;
    }
  }
}
