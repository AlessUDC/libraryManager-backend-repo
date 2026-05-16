import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LoansService } from '../services/loans.service';
import { CreateLoanDto, ReturnLoanDto } from '../dto/loan.dto';

@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  create(@Body() createLoanDto: CreateLoanDto) {
    return this.loansService.createLoan(createLoanDto);
  }

  @Get()
  findAll() {
    return this.loansService.getAllLoans();
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.loansService.getLoansByUser(userId);
  }

  @Patch(':id/return')
  returnLoan(@Param('id') id: string, @Body() returnDto: ReturnLoanDto) {
    return this.loansService.returnLoan(id, returnDto);
  }
}
