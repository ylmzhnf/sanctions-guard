import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService implements OnModuleInit {
  private readonly logger = new Logger(AppConfigService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.printStartupBanner();
  }

  getEnv<T = string>(key: string, defaultValue?: T): T {
    return this.configService.get<T>(key, defaultValue as any) as T;
  }

  private printStartupBanner() {
    const divider = '══════════════════════════════════════════';
    this.logger.log(`╔${divider}╗`);
    this.logger.log(`║  SANCTIONS-GUARD MVP                   ║`);
    this.logger.log(`╟${divider}╢`);
    this.logger.log(`║ > All features unlocked                  ║`);
    this.logger.log(`║ > Screening + AI + Audit                 ║`);
    this.logger.log(`╚${divider}╝`);
  }
}
