import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  Post,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { UsersService } from './users.service';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { Role } from '@prisma/client';
import { EditUserDto } from './dto/edit-user.dto';
import { Roles } from '../auth/decorator/roles.decorator';

@UseGuards(JwtGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('me')
  async getCurrentUser(@GetUser('id') userId: string) {
    return this.userService.getUser(userId);
  }

  @Patch('me')
  async editMe(@GetUser('id') userId: string, @Body() dto: EditUserDto) {
    return this.userService.editUser(userId, dto);
  }

  @Patch('change-password')
  async changePassword(
    @GetUser('id') userId: string,
    @Body('password') newPassword: string,
  ) {
    return this.userService.changePassword(userId, newPassword);
  }

  @Get('org-members')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getOrgUsers(@GetUser('orgId') orgId: string) {
    return this.userService.getAllUsersInOrg(orgId);
  }

  @Post('org-members')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async addUserToOrg(
    @GetUser('orgId') orgId: string,
    @Body() dto: EditUserDto,
  ) {
    return this.userService.addUserToOrg(orgId, dto);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async updateUserRole(
    @GetUser('orgId') adminOrgId: string,
    @Param('id') targetUserId: string,
    @Body('role') role: Role,
  ) {
    return this.userService.updateUserRole(adminOrgId, targetUserId, role);
  }
}
