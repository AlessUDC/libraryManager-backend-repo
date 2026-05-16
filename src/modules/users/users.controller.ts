import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMINISTRATOR, Role.LIBRARIAN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query() queryDto: UserQueryDto) {
    return this.usersService.findAll(queryDto);
  }

  @Post()
  @Roles(Role.ADMINISTRATOR)
  async create(
    @Body()
    createUserDto: {
      email: string;
      code: string;
      documentNumber: string;
      role?: Role;
      birthdate: string;
      documentType?: string;
      schoolId?: string;
      facultyId?: string;
      cycle?: number;
      address?: string;
      provinceId?: string;
      shift?: string;
      [key: string]: unknown;
    },
  ) {
    return this.usersService.createByAdmin(createUserDto);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.usersService.findBySlug(slug);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUserAdmin(id, updateUserDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
