import { useAuthStore } from '@/lib/store';

export interface FeatureFlags {
  mode: 'saas' | 'enterprise';
  isSaas: boolean;
  isEnterprise: boolean;
  allFeaturesUnlocked: boolean;
  osintEnabled: boolean;
  aiEnabled: boolean;
  bulkEnabled: boolean;
}

export const PLAN_RANK = { FREE: 0, STARTER: 1, BUSINESS: 2, ENTERPRISE: 3, UNLIMITED: 4, SELF_HOSTED: 5 };

export function useFeatureFlags() {
  const { user } = useAuthStore();
  const organization = user?.org;
  const mode = (process.env.NEXT_PUBLIC_APP_MODE || 'saas') as 'saas' | 'enterprise';

  const isEnterprise = mode === 'enterprise';
  const currentPlan = (organization?.plan || 'FREE') as keyof typeof PLAN_RANK;
  const planRank = PLAN_RANK[currentPlan] || 0;

  return {
    mode,
    isSaas: mode === 'saas',
    isEnterprise: isEnterprise,
    allFeaturesUnlocked: isEnterprise || organization?.isUnlimited || organization?.queriesLimit === -1,
    planRank,
    currentPlan,
    osintEnabled: isEnterprise || planRank >= PLAN_RANK.BUSINESS,
    aiEnabled: isEnterprise || planRank >= PLAN_RANK.BUSINESS,
    bulkEnabled: isEnterprise || planRank >= PLAN_RANK.BUSINESS,
    isLoading: false,
  };
}