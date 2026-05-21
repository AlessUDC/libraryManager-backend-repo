import { Module } from '@nestjs/common';
import { AppealsService } from './appeals.service';
import { AppealsController } from './appeals.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [PrismaModule, AuditLogModule, AuthModule],
  controllers: [AppealsController],
  providers: [AppealsService],
  exports: [AppealsService],
})
export class AppealsModule {}
