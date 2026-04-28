import { Global, Module } from '@nestjs/common';
import { LicensingService } from './licensing.service';
import { LicensingController } from './licensing.controller';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [AuthModule],
  providers: [LicensingService],
  controllers: [LicensingController],
  exports: [LicensingService],
})
export class LicensingModule {}
