import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ScreeningModule } from './screening/screening.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SanctionsSyncModule } from './sanctions-sync/sanctions-sync.module';

@Module({
  imports: [
    PrismaModule,
    ScreeningModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    AuditModule,
    ScheduleModule.forRoot(),
    SanctionsSyncModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
