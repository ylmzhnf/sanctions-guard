import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface CreateNotificationDto {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  metadata?: any;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createNotification(data: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        metadata: data.metadata,
        isRead: false,
        createdAt: new Date(),
      },
    });
  }

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Son 50 bildirim
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { 
        id: notificationId,
        userId 
      },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { 
        userId,
        isRead: false 
      },
      data: { isRead: true },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { 
        id: notificationId,
        userId 
      },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { 
        userId,
        isRead: false 
      },
    });
  }

  // Sistem bildirimleri için yardımcı metodlar
  async createSystemNotification(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    return this.createNotification({
      userId,
      title,
      message,
      type,
    });
  }

  async createBulkNotification(userIds: string[], title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const notifications = userIds.map(userId => ({
      userId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date(),
    }));

    return this.prisma.notification.createMany({
      data: notifications,
    });
  }
}