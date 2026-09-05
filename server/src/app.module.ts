import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { ScreeningModule } from './screening/screening.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SanctionsSyncModule } from './sanctions-sync/sanctions-sync.module';
import { AdminModule } from './admin/admin.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: process.env.REDIS_URL
        ? {
            host: new URL(process.env.REDIS_URL).hostname,
            port: Number(new URL(process.env.REDIS_URL).port),
            username: new URL(process.env.REDIS_URL).username,
            password: new URL(process.env.REDIS_URL).password,
            tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
          }
        : {
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: Number(process.env.REDIS_PORT || 6379),
          },
    }),
    PrismaModule,
    ScreeningModule,
    AuthModule,
    UsersModule,
    AuditModule,
    ScheduleModule.forRoot(),
    SanctionsSyncModule,
    AdminModule,
    SettingsModule,
    NotificationsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
