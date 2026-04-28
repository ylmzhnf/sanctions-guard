'use client';

import { useMemo } from 'react';
import { useAuthStore } from '../lib/store';


export enum PlanRank {
  FREE = 0,
  STARTER = 1,
  BUSINESS = 2,
  ENTERPRISE = 3,
  UNLIMITED = 4,
}

const PLAN_MAP: Record<string, PlanRank> = {
  FREE: PlanRank.FREE,
  STARTER: PlanRank.STARTER,
  BUSINESS: PlanRank.BUSINESS,
  ENTERPRISE: PlanRank.ENTERPRISE,
  UNLIMITED: PlanRank.UNLIMITED,
  SELF_HOSTED: PlanRank.UNLIMITED, 
};

export interface FeatureFlags {
  
  mode: 'saas' | 'enterprise';
  isSaas: boolean;
  isEnterprise: boolean;

  
  stripeEnabled: boolean;       
  manualLicensing: boolean;     
  
  
  osintEnabled: boolean;        
  bulkScreeningEnabled: boolean;
  aiExplanationEnabled: boolean;
  pdfReportsEnabled: boolean;   
  
  
  enforceLimits: boolean;       
  allFeaturesUnlocked: boolean; 

  isLoading: boolean;
}


export function useFeatureFlags(): FeatureFlags {
  const user = useAuthStore(s => s.user);
  const organization = user?.org;

  
  const mode = (process.env.NEXT_PUBLIC_APP_MODE || 'saas') as 'saas' | 'enterprise';
  const isSaas = mode === 'saas';
  const isEnterprise = mode === 'enterprise';

  
  const flags = useMemo((): FeatureFlags => {
    const currentPlan = organization?.plan || 'FREE';
    const rank = isEnterprise ? PlanRank.UNLIMITED : (PLAN_MAP[currentPlan] ?? PlanRank.FREE);
    const isUnlimited = isEnterprise || organization?.isUnlimited || rank >= PlanRank.UNLIMITED;

    return {
      mode,
      isSaas,
      isEnterprise,

      
      stripeEnabled: isSaas, 
      manualLicensing: isEnterprise || rank >= PlanRank.BUSINESS,

      
      aiExplanationEnabled: isUnlimited || rank >= PlanRank.STARTER,
      pdfReportsEnabled: isUnlimited || rank >= PlanRank.STARTER,
      osintEnabled: isUnlimited || rank >= PlanRank.BUSINESS,
      bulkScreeningEnabled: isUnlimited || rank >= PlanRank.BUSINESS,

      
      enforceLimits: isSaas && !isUnlimited,
      allFeaturesUnlocked: isUnlimited,

      isLoading: !user && !!useAuthStore.getState().token,
    };
  }, [mode, isEnterprise, isSaas, organization, user]);

  return flags;
}


export function useAppMode() {
  const { mode, isSaas, isEnterprise, isLoading } = useFeatureFlags();
  return { mode, isSaas, isEnterprise, isLoading };
}