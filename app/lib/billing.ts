import type { OrgPlan } from '@/app/lib/utils';

/** What a plan includes. The subscription row mirrors these when the plan changes. */
export const PLAN_TERMS: Record<
  OrgPlan,
  { minutes: number; overageCents: number }
> = {
  FREE: { minutes: 100, overageCents: 0 },
  STARTER: { minutes: 500, overageCents: 12 },
  PRO: { minutes: 2000, overageCents: 8 },
  ENTERPRISE: { minutes: 10000, overageCents: 5 },
};

export const CARD_BRANDS = [
  'Visa',
  'Mastercard',
  'American Express',
  'Discover',
] as const;
