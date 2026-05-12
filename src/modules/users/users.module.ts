import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersCron } from './users.cron';
import { UsersController } from './users.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '180d' },
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersCron],
  exports: [UsersService],
})
export class UsersModule {}
