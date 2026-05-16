import { Module } from '@nestjs/common';
import { ReservationsService } from './services/reservations.service';
import { ReservationsController } from './controllers/reservations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { LoansModule } from '../loans/loans.module';

@Module({
  imports: [PrismaModule, AuthModule, LoansModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
