import { Module } from '@nestjs/common';
import { LoansService } from './services/loans.service';
import { FinesService } from './services/fines.service';
import { SanctionsService } from './services/sanctions.service';
import { CronService } from './services/cron.service';
import { LoansController } from './controllers/loans.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LoansController],
  providers: [LoansService, FinesService, SanctionsService, CronService],
  exports: [LoansService, FinesService, SanctionsService],
})
export class LoansModule {}
