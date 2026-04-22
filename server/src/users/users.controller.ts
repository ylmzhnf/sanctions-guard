import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  Post,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { UsersService } from './users.service';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { EditUserDto } from './dto/edit-user.dto';
import { Roles } from 'src/auth/decorator/roles.decorator';

@UseGuards(JwtGuard)
@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Get('me')
  getCurrentUser(@GetUser() user: User) {
    return this.userService.getUser(user.id);
  }

  @Patch('me')
  editUser(@GetUser('id') userId: string, @Body() dto: EditUserDto) {
    return this.userService.editUser(userId, dto);
  }

  @Patch('change-password')
  changePassword(
    @GetUser('id') userId: string,
    @Body('password') newPassword: string,
  ) {
    return this.userService.changePassword(userId, newPassword);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('org-members')
  getOrgUsers(@GetUser('orgId') orgId: string) {
    return this.userService.getAllUsersInOrg(orgId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/role')
  updateUserRole(
    @GetUser('orgId') adminOrgId: string,
    @Param('id') targetUserId: string,
    @Body('role') role: Role,
  ) {
    return this.userService.updateUserRole(adminOrgId, targetUserId, role);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('org-members')
  addUserToOrg(@GetUser('orgId') orgId: string, @Body() dto: EditUserDto) {
    return this.userService.addUserToOrg(orgId, dto);
  }
}
