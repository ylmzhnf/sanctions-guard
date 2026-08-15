import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtGuard } from '../auth/guard/jwt.guard';
import type { Request } from 'express';

@Controller('notifications')
@UseGuards(JwtGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@Req() req: Request) {
    const userId = req.user?.['id'];
    return this.notificationsService.getUserNotifications(userId);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.['id'];
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post('mark-all-read')
  async markAllAsRead(@Req() req: Request) {
    const userId = req.user?.['id'];
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.['id'];
    return this.notificationsService.deleteNotification(id, userId);
  }

  @Post('test')
  async createTestNotification(@Req() req: Request) {
    const userId = req.user?.['id'];
    return this.notificationsService.createNotification({
      userId,
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working.',
      type: 'info'
    });
  }
}