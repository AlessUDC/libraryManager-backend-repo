import { Module } from '@nestjs/common';
import { LoansService } from './services/loans.service';
import { LoansController } from './controllers/loans.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService]
})
export class LoansModule {}
