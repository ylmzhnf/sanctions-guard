import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AppConfigModule } from '../config/app-config.module';
import { LicensingModule } from '../licensing/licensing.module';
import { ScreeningModule } from '../screening/screening.module';

@Module({
  imports: [PrismaModule, AppConfigModule, LicensingModule, ScreeningModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
