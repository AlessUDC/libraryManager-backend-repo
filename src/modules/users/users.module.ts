import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersCron } from './users.cron';

@Module({
  providers: [UsersService, UsersCron],
  exports: [UsersService],
})
export class UsersModule {}
