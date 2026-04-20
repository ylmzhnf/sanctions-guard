import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
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

  @Patch()
  editUser(@GetUser('id') userId: string, @Body() dto: EditUserDto) {
    return this.userService.editUser(userId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  getAllUsers() {
    return this.userService.getAllUsers();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/role')
  updateUserRole(
    @Param('id') id: string,
    @Body('role') role: 'ADMIN' | 'USER' 
  ){
    return this.userService.updateUserRole(id, role);
  }
}
