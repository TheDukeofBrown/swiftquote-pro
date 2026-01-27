import type { Database } from "@/integrations/supabase/types";

export type SubscriptionPlan = "free" | "pro" | "business";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "expired";

export interface PlanLimits {
  quotesPerMonth: number;
  pdfDownloads: number;
  features: {
    customBranding: boolean;
    emailSending: boolean;
    analytics: boolean;
    multiUser: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
  };
}

export interface PlanInfo {
  id: SubscriptionPlan;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  limits: PlanLimits;
  recommended?: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    quotesPerMonth: 5,
    pdfDownloads: 3,
    features: {
      customBranding: false,
      emailSending: false,
      analytics: false,
      multiUser: false,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  pro: {
    quotesPerMonth: 50,
    pdfDownloads: 50,
    features: {
      customBranding: true,
      emailSending: true,
      analytics: true,
      multiUser: false,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  business: {
    quotesPerMonth: -1, // Unlimited
    pdfDownloads: -1, // Unlimited
    features: {
      customBranding: true,
      emailSending: true,
      analytics: true,
      multiUser: true,
      prioritySupport: true,
      apiAccess: true,
    },
  },
};

export const PLANS: PlanInfo[] = [
  {
    id: "free",
    name: "Free Trial",
    description: "Try before you buy",
    priceMonthly: 0,
    priceYearly: 0,
    limits: PLAN_LIMITS.free,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For individual tradespeople",
    priceMonthly: 19,
    priceYearly: 190,
    limits: PLAN_LIMITS.pro,
    recommended: true,
  },
  {
    id: "business",
    name: "Business",
    description: "For growing teams",
    priceMonthly: 49,
    priceYearly: 490,
    limits: PLAN_LIMITS.business,
  },
];

export function getPlanInfo(plan: SubscriptionPlan): PlanInfo {
  return PLANS.find(p => p.id === plan) || PLANS[0];
}

export function canUseFeature(plan: SubscriptionPlan, feature: keyof PlanLimits["features"]): boolean {
  return PLAN_LIMITS[plan].features[feature];
}

export function isWithinLimit(plan: SubscriptionPlan, metric: "quotesPerMonth" | "pdfDownloads", currentUsage: number): boolean {
  const limit = PLAN_LIMITS[plan][metric];
  if (limit === -1) return true; // Unlimited
  return currentUsage < limit;
}

export function getUsagePercentage(plan: SubscriptionPlan, metric: "quotesPerMonth" | "pdfDownloads", currentUsage: number): number {
  const limit = PLAN_LIMITS[plan][metric];
  if (limit === -1) return 0; // Unlimited shows as 0%
  return Math.min(100, (currentUsage / limit) * 100);
}

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

export function isReadOnlyMode(status: SubscriptionStatus): boolean {
  return status === "past_due" || status === "canceled" || status === "expired";
}
