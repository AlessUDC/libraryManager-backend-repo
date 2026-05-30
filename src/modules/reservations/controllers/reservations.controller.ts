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
import { ReservationsService } from '../services/reservations.service';
import {
  CreateReservationDto,
  RedeemReservationDto,
} from '../dto/reservation.dto';
import { AuthGuard } from '../../../auth/auth.guard';

interface AuthRequest extends Request {
  user: { sub: string; role: string };
}

@Controller('reservations')
@UseGuards(AuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(@Body() createDto: CreateReservationDto, @Request() req: AuthRequest) {
    const userId = req.user.sub;
    return this.reservationsService.createReservation(userId, createDto);
  }

  @Get('admin')
  findAllAdmin() {
    return this.reservationsService.getAdminReservations();
  }

  @Get('my-reservations')
  findMyReservations(@Request() req: AuthRequest) {
    const userId = req.user.sub;
    return this.reservationsService.getUserReservations(userId);
  }

  @Post(':id/redeem')
  redeem(
    @Param('id') id: string,
    @Body() redeemDto: RedeemReservationDto,
    @Request() req: AuthRequest,
  ) {
    const userId = req.user.sub;
    return this.reservationsService.redeemReservation(id, userId, redeemDto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Request() req: AuthRequest) {
    const userId = req.user.sub;
    const userRole = req.user.role;
    return this.reservationsService.cancelReservation(id, userId, userRole);
  }
}
