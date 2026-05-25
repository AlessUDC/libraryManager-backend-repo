import {
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FinesService } from '../services/fines.service';
import { AuthGuard } from '../../../auth/auth.guard';
import { RolesGuard } from '../../../auth/roles.guard';
import { Roles } from '../../../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';

@Controller('loans/fines')
@UseGuards(AuthGuard, RolesGuard)
export class FinesController {
  constructor(private readonly finesService: FinesService) {}

  @Get()
  @Roles(Role.ADMINISTRATOR, Role.LIBRARIAN)
  async getAllFines() {
    return this.finesService.getAllFines();
  }

  @Get('user/:userId')
  async getUserFines(
    @Param('userId') userId: string,
    @Request() req: RequestWithUser,
  ) {
    // Students can only see their own fines, Admins/Librarians can see any
    const reqUser = req.user;
    if (reqUser.role === Role.STUDENT && reqUser.sub !== userId) {
      throw new Error('No tienes permiso para ver las multas de otro usuario');
    }
    return this.finesService.getUserFines(userId);
  }

  @Patch(':id/pay')
  @Roles(Role.ADMINISTRATOR, Role.LIBRARIAN)
  async payFine(@Param('id') id: string, @Request() req: RequestWithUser) {
    const performedBy = req.user.sub;
    return this.finesService.markAsPaid(id, performedBy);
  }

  @Patch(':id/annul')
  @Roles(Role.ADMINISTRATOR, Role.LIBRARIAN)
  async annulFine(@Param('id') id: string, @Request() req: RequestWithUser) {
    const performedBy = req.user.sub;
    return this.finesService.annulFine(id, performedBy);
  }
}
