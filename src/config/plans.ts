// Subscription plan types - must match database enum
export type SubscriptionPlan = "free" | "pro" | "business";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "expired";

// Display names for plans (UI shows these, DB stores the enum values)
export type PlanTier = "starter" | "pro" | "team";

export interface PlanLimits {
  quotesPerMonth: number;
  pdfDownloads: number;
  features: {
    emailSending: boolean;
    pdfGeneration: boolean;
    quoteTracking: boolean;
    acceptanceTracking: boolean;
    viewedTracking: boolean;
    priceLibrary: boolean;
    teamMembers: number;
    sharedPriceLibrary: boolean;
    analytics: boolean;
  };
}

export interface PlanInfo {
  id: SubscriptionPlan;
  tier: PlanTier;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  limits: PlanLimits;
  recommended?: boolean;
}

// Stripe price IDs - UPDATE THESE with your actual Stripe price IDs
export const STRIPE_PRICES = {
  starter_monthly: "price_starter_monthly", // Replace with actual price ID
  starter_yearly: "price_starter_yearly",   // Replace with actual price ID
  pro_monthly: "price_pro_monthly",         // Replace with actual price ID
  pro_yearly: "price_pro_yearly",           // Replace with actual price ID
  team_monthly: "price_team_monthly",       // Replace with actual price ID
  team_yearly: "price_team_yearly",         // Replace with actual price ID
} as const;

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  starter: {
    quotesPerMonth: 30,
    pdfDownloads: -1, // Unlimited
    features: {
      emailSending: true,
      pdfGeneration: true,
      quoteTracking: true,
      acceptanceTracking: false,
      viewedTracking: false,
      priceLibrary: false,
      teamMembers: 1,
      sharedPriceLibrary: false,
      analytics: false,
    },
  },
  pro: {
    quotesPerMonth: -1, // Unlimited
    pdfDownloads: -1,
    features: {
      emailSending: true,
      pdfGeneration: true,
      quoteTracking: true,
      acceptanceTracking: true,
      viewedTracking: true,
      priceLibrary: true,
      teamMembers: 1,
      sharedPriceLibrary: false,
      analytics: false,
    },
  },
  team: {
    quotesPerMonth: -1,
    pdfDownloads: -1,
    features: {
      emailSending: true,
      pdfGeneration: true,
      quoteTracking: true,
      acceptanceTracking: true,
      viewedTracking: true,
      priceLibrary: true,
      teamMembers: 5,
      sharedPriceLibrary: true,
      analytics: true,
    },
  },
};

// Map DB plan enum to display tier
export function planToTier(plan: SubscriptionPlan): PlanTier {
  switch (plan) {
    case "free": return "starter"; // Trial defaults to starter features
    case "pro": return "pro";
    case "business": return "team";
    default: return "starter";
  }
}

export const PLANS: PlanInfo[] = [
  {
    id: "free",
    tier: "starter",
    name: "Starter",
    description: "For individual tradespeople getting started",
    priceMonthly: 15,
    priceYearly: 150, // 2 months free
    stripePriceIdMonthly: STRIPE_PRICES.starter_monthly,
    stripePriceIdYearly: STRIPE_PRICES.starter_yearly,
    limits: PLAN_LIMITS.starter,
  },
  {
    id: "pro",
    tier: "pro",
    name: "Pro",
    description: "Unlimited quotes with advanced tracking",
    priceMonthly: 39,
    priceYearly: 390, // 2 months free
    stripePriceIdMonthly: STRIPE_PRICES.pro_monthly,
    stripePriceIdYearly: STRIPE_PRICES.pro_yearly,
    limits: PLAN_LIMITS.pro,
    recommended: true,
  },
  {
    id: "business",
    tier: "team",
    name: "Team",
    description: "For growing teams with shared resources",
    priceMonthly: 79,
    priceYearly: 790, // 2 months free
    stripePriceIdMonthly: STRIPE_PRICES.team_monthly,
    stripePriceIdYearly: STRIPE_PRICES.team_yearly,
    limits: PLAN_LIMITS.team,
  },
];

export function getPlanInfo(plan: SubscriptionPlan): PlanInfo {
  return PLANS.find(p => p.id === plan) || PLANS[0];
}

export function getPlanByTier(tier: PlanTier): PlanInfo {
  return PLANS.find(p => p.tier === tier) || PLANS[0];
}

export function canUseFeature(tier: PlanTier, feature: keyof PlanLimits["features"]): boolean {
  const value = PLAN_LIMITS[tier].features[feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

export function isWithinLimit(tier: PlanTier, metric: "quotesPerMonth" | "pdfDownloads", currentUsage: number): boolean {
  const limit = PLAN_LIMITS[tier][metric];
  if (limit === -1) return true; // Unlimited
  return currentUsage < limit;
}

export function getUsagePercentage(tier: PlanTier, metric: "quotesPerMonth" | "pdfDownloads", currentUsage: number): number {
  const limit = PLAN_LIMITS[tier][metric];
  if (limit === -1) return 0; // Unlimited shows as 0%
  return Math.min(100, (currentUsage / limit) * 100);
}

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

export function isReadOnlyMode(status: SubscriptionStatus): boolean {
  return status === "past_due" || status === "canceled" || status === "expired";
}

export function getTrialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const now = new Date();
  const trialEnd = new Date(trialEndsAt);
  const diff = trialEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
