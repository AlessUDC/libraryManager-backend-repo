import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { MetadataModule } from './modules/metadata/metadata.module';
import { UsersModule } from './modules/users/users.module';
import { MailModule } from './modules/mail/mail.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { BooksModule } from './modules/books/books.module';
import { LoansModule } from './modules/loans/loans.module';
import { StatsModule } from './modules/stats/stats.module';
import { ReservationsModule } from './modules/reservations/reservations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    MetadataModule,
    UsersModule,
    MailModule,
    BooksModule,
    LoansModule,
    StatsModule,
    ReservationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
