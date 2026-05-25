import { Module } from '@nestjs/common';
import { LoansService } from './services/loans.service';
import { FinesService } from './services/fines.service';
import { SanctionsService } from './services/sanctions.service';
import { CronService } from './services/cron.service';
import { LoansController } from './controllers/loans.controller';
import { FinesController } from './controllers/fines.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [PrismaModule, AuditLogModule, AuthModule],
  controllers: [LoansController, FinesController],
  providers: [LoansService, FinesService, SanctionsService, CronService],
  exports: [LoansService, FinesService, SanctionsService],
})
export class LoansModule {}
