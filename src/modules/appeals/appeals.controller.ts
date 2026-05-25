import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AppealsService } from './appeals.service';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';

@Controller('appeals')
@UseGuards(AuthGuard, RolesGuard)
export class AppealsController {
  constructor(private readonly appealsService: AppealsService) {}

  @Post()
  async submitAppeal(
    @Request() req: RequestWithUser,
    @Body() body: { fineId?: string; sanctionId?: string; reason: string },
  ) {
    const userId = req.user.sub;
    return this.appealsService.submitAppeal(userId, body);
  }

  @Get('my')
  async getMyAppeals(@Request() req: RequestWithUser) {
    const userId = req.user.sub;
    return this.appealsService.getMyAppeals(userId);
  }

  @Get('pending')
  @Roles(Role.ADMINISTRATOR, Role.LIBRARIAN)
  async getPendingAppeals() {
    return this.appealsService.getPendingAppeals();
  }

  @Patch(':id/resolve')
  @Roles(Role.ADMINISTRATOR, Role.LIBRARIAN)
  async resolveAppeal(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; resolution: string },
  ) {
    const resolverId = req.user.sub;
    return this.appealsService.resolveAppeal(id, resolverId, body);
  }
}
