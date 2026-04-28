import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AppMode = 'saas' | 'enterprise';

export interface ModeCapabilities {
  
  stripeEnabled: boolean;
  manualLicenseEnabled: boolean; 
  
  
  enforcePlanLimits: boolean;    
  enforceRateLimits: boolean;    
  
  
  allFeaturesUnlocked: boolean;  
  
  
  multiTenantIsolation: boolean; 
  ssoEnabled: boolean;           
}


const SAAS_CAPABILITIES: ModeCapabilities = {
  stripeEnabled: true,
  manualLicenseEnabled: true,
  enforcePlanLimits: true,
  enforceRateLimits: true,
  allFeaturesUnlocked: false, 
  multiTenantIsolation: true,
  ssoEnabled: false,          
};


const ENTERPRISE_CAPABILITIES: ModeCapabilities = {
  stripeEnabled: false,
  manualLicenseEnabled: true,
  enforcePlanLimits: false,    
  enforceRateLimits: false,
  allFeaturesUnlocked: true,   
  multiTenantIsolation: true,  
  ssoEnabled: true,            
};

@Injectable()
export class AppConfigService implements OnModuleInit {
  private readonly logger = new Logger(AppConfigService.name);
  private readonly _mode: AppMode;
  private readonly _capabilities: ModeCapabilities;

  constructor(private configService: ConfigService) {
    
    const rawMode = this.configService.get<string>('APP_MODE', 'saas').toLowerCase().trim();
    
    this._mode = (rawMode === 'enterprise' ? 'enterprise' : 'saas') as AppMode;
    this._capabilities = this._mode === 'enterprise' ? ENTERPRISE_CAPABILITIES : SAAS_CAPABILITIES;
  }

  
  onModuleInit() {
    this.printModeBanner();
  }

  

  get mode(): AppMode {
    return this._mode;
  }

  get capabilities(): ModeCapabilities {
    return this._capabilities;
  }

  isSaas(): boolean {
    return this._mode === 'saas';
  }

  isEnterprise(): boolean {
    return this._mode === 'enterprise';
  }

  
  can(capability: keyof ModeCapabilities): boolean {
    return !!this._capabilities[capability];
  }

  
  getEnv<T = string>(key: string, defaultValue?: T): T {
    return this.configService.get<T>(key, defaultValue as any) as T;
  }

  private printModeBanner() {
    const divider = '══════════════════════════════════════════';
    this.logger.log(`╔${divider}╗`);
    this.logger.log(`║ 🚀 SYSTEM STARTING IN ${this._mode.toUpperCase().padEnd(19)} ║`);
    this.logger.log(`╟${divider}╢`);
    this.logger.log(`║ > Deployment: ${this.isEnterprise() ? 'Private/On-Prem' : 'Public Cloud (Multi-tenant)'} ║`);
    this.logger.log(`║ > Billing:    ${this.can('stripeEnabled') ? 'Stripe (Active)' : 'Manual/Local License'}    ║`);
    this.logger.log(`║ > Features:   ${this.can('allFeaturesUnlocked') ? 'Fully Unlocked' : 'Gated by Plan'}        ║`);
    this.logger.log(`╚${divider}╝`);
  }
}