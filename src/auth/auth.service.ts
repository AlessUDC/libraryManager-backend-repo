import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { ConfirmAccountDto } from './dto/confirm-account.dto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../modules/users/users.service';
import { ResendTokenDto } from './dto/resend-token.dto';
import { MailService } from '../modules/mail/mail.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetTokenDto } from './dto/verify-reset-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private mailService: MailService,
    private jwtService: JwtService,
  ) {}

  async register(dto: CreateAccountDto) {
    return this.usersService.createAccount(dto);
  }

  async confirmAccount(dto: ConfirmAccountDto) {
    const { email, token } = dto;
    const user = await this.requireUserByEmail(email);

    this.assertUnconfirmed(user);
    this.assertTokenValid(
      user.confirmationToken,
      token,
      'El código de confirmación es incorrecto',
    );
    this.assertTokenNotExpired(
      user.tokenExpiration,
      'El código de confirmación ha expirado',
    );

    await this.usersService.confirmAccount(user.userId);
    return { message: 'Cuenta confirmada correctamente' };
  }

  async activateAccount(dto: ActivateAccountDto) {
    const { token, password, passwordConfirmation } = dto;

    if (password !== passwordConfirmation) {
      throw new ForbiddenException('Las contraseñas no coinciden');
    }

    const user = await this.usersService.findByConfirmationToken(token);
    if (!user) {
      throw new UnauthorizedException('El enlace de activación es inválido');
    }

    this.assertTokenNotExpired(
      user.tokenExpiration,
      'El enlace de activación ha expirado',
    );

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.usersService.updatePassword(user.userId, hashedPassword);
    await this.usersService.confirmAccount(user.userId);

    return {
      message: 'Cuenta activada correctamente. Ya puedes iniciar sesión.',
    };
  }

  async resendToken(dto: ResendTokenDto) {
    const { email } = dto;
    const user = await this.requireUserByEmail(email);

    this.assertUnconfirmed(user);

    if (user.resendCount >= 1) {
      throw new ForbiddenException('Límite de peticiones de reenvío superado');
    }

    const { token, expiration } = this.generateOtp(7);
    await this.usersService.renewConfirmationToken(
      user.userId,
      token,
      expiration,
    );
    await this.mailService.sendConfirmationEmail(email, token);

    return { message: 'Se ha enviado un nuevo código a tu correo' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;
    const user = await this.requireUserByEmail(email);

    if (!user.isConfirmed) {
      throw new ForbiddenException(
        'Debes confirmar tu cuenta antes de poder reestablecer tu contraseña',
      );
    }

    if (user.lastPasswordReset) {
      const twelveHoursAgo = new Date();
      twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
      if (user.lastPasswordReset > twelveHoursAgo) {
        throw new ForbiddenException(
          'Solo puedes reestablecer tu contraseña una vez cada 12 horas',
        );
      }
    }

    if (user.resetPasswordToken && user.resetPasswordResendCount >= 1) {
      throw new ForbiddenException('Límite de peticiones de reenvío superado');
    }

    const { token, expiration } = this.generateOtp(10);
    await this.usersService.setPasswordResetToken(
      user.userId,
      token,
      expiration,
      !!user.resetPasswordToken,
    );
    await this.mailService.sendPasswordResetEmail(email, token);

    return { message: 'Se han enviado las instrucciones a tu correo' };
  }

  async verifyResetToken(dto: VerifyResetTokenDto) {
    const { email, token } = dto;
    const user = await this.requireUserByEmail(email);

    this.assertTokenValid(
      user.resetPasswordToken,
      token,
      'El código de recuperación es incorrecto para este correo',
    );
    this.assertTokenNotExpired(
      user.resetPasswordExpires,
      'El código de recuperación ha expirado',
    );

    return { message: 'Código verificado correctamente' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { email, token, password, passwordConfirmation } = dto;

    if (password !== passwordConfirmation) {
      throw new ForbiddenException('Las contraseñas no coinciden');
    }

    const user = await this.requireUserByEmail(email);

    this.assertTokenValid(
      user.resetPasswordToken,
      token,
      'El código de recuperación es incorrecto para este correo',
    );
    this.assertTokenNotExpired(
      user.resetPasswordExpires,
      'El código de recuperación ha expirado',
    );

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.usersService.updatePassword(user.userId, hashedPassword);

    return { message: 'Tu contraseña ha sido restablecida correctamente' };
  }

  async login(dto: LoginDto) {
    const { code, password } = dto;
    const user = await this.usersService.findByCode(code);

    if (!user) {
      throw new UnauthorizedException(
        'El código de usuario o la contraseña son incorrectos',
      );
    }

    if (!user.isConfirmed) {
      throw new ForbiddenException(
        'Debes confirmar tu cuenta antes de poder iniciar sesión',
      );
    }

    if (user.userData.activeState === false) {
      throw new ForbiddenException(
        'Tu cuenta está desactivada. Por favor, contacta con el administrador.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'El código de usuario o la contraseña son incorrectos',
      );
    }

    const token = this.jwtService.sign({ sub: user.userId, role: user.role });
    return {
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.userId,
        userId: user.userId,
        role: user.role,
        name: user.userData.name,
      },
    };
  }

  async getUserProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const { password, confirmationToken, resetPasswordToken, ...userProfile } =
      user;
    return userProfile;
  }

  async updateUserProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    return this.usersService.updateUserData(userId, dto);
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('La contraseña es incorrecta');
    }

    return this.usersService.deleteUser(userId);
  }

  // --- Helpers Privados ---

  private async requireUserByEmail(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user)
      throw new UnauthorizedException(
        'El correo electrónico no está registrado',
      );
    return user;
  }

  private assertUnconfirmed(user: { isConfirmed: boolean }) {
    if (user.isConfirmed) {
      throw new UnauthorizedException('Esta cuenta ya ha sido confirmada');
    }
  }

  private assertTokenValid(
    stored: string | null | undefined,
    received: string,
    message: string,
  ) {
    if (!stored || stored !== received) {
      throw new UnauthorizedException(message);
    }
  }

  private assertTokenNotExpired(
    expiration: Date | null | undefined,
    message: string,
  ) {
    if (expiration && new Date() > expiration) {
      throw new UnauthorizedException(message);
    }
  }

  private generateOtp(expirationMinutes: number) {
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + expirationMinutes);
    return { token, expiration };
  }
}
