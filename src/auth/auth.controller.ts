import { Body, Controller, Post, Get, Patch, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { ConfirmAccountDto } from './dto/confirm-account.dto';
import { ResendTokenDto } from './dto/resend-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetTokenDto } from './dto/verify-reset-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthGuard } from './auth.guard';
import type { RequestWithUser } from './interfaces/request-with-user.interface';

// En NestJS, no necesitas escribir explícitamente el / en cada endpoint porque
// el framework lo maneja automáticamente al construir las rutas.

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard)
  @Get('profile')
  async getProfile(@Request() req: RequestWithUser) {
    console.log(req.user);
    return this.authService.getUserProfile(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req: RequestWithUser, @Body() updateProfileDto: UpdateProfileDto) {
    return this.authService.updateUserProfile(req.user.sub, updateProfileDto);
  }

  @Post('register')
  async register(@Body() createAccountDto: CreateAccountDto) {
    return this.authService.register(createAccountDto);
  }

  @Post('confirm')
  async confirm(@Body() confirmAccountDto: ConfirmAccountDto) {
    return this.authService.confirmAccount(confirmAccountDto);
  }

  @Post('resend-token')
  async resendToken(@Body() resendTokenDto: ResendTokenDto) {
    return this.authService.resendToken(resendTokenDto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('verify-reset-token')
  async verifyResetToken(@Body() verifyResetTokenDto: VerifyResetTokenDto) {
    return this.authService.verifyResetToken(verifyResetTokenDto);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
