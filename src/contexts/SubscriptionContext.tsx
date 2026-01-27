import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./CompanyContext";
import { 
  SubscriptionPlan, 
  SubscriptionStatus, 
  PlanTier,
  PLAN_LIMITS, 
  canUseFeature, 
  isWithinLimit,
  isSubscriptionActive,
  isReadOnlyMode,
  planToTier,
  getTrialDaysRemaining,
  PlanLimits
} from "@/config/plans";

interface Subscription {
  id: string;
  company_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
}

interface UsageRecord {
  quotes_created_this_month: number;
  quotes_sent_this_month: number;
  pdfs_generated_this_month: number;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  usage: UsageRecord | null;
  loading: boolean;
  
  // Plan info
  plan: SubscriptionPlan;
  tier: PlanTier;
  isActive: boolean;
  isReadOnly: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number;
  hasStripeSubscription: boolean;
  
  // Feature checks
  canUse: (feature: keyof PlanLimits["features"]) => boolean;
  canCreateQuote: () => boolean;
  canSendQuote: () => boolean;
  
  // Usage info
  quotesUsed: number;
  quotesLimit: number;
  
  // Actions
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { company } = useCompany();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!company) {
      setSubscription(null);
      setUsage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Fetch subscription
    const { data: subData, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("company_id", company.id)
      .maybeSingle();

    if (subError) {
      console.error("Error fetching subscription:", subError);
    }
    
    if (subData) {
      setSubscription({
        ...subData,
        plan: subData.plan as SubscriptionPlan,
        status: subData.status as SubscriptionStatus,
      });
    } else {
      setSubscription(null);
    }

    // Fetch usage for current month
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
    const { data: usageData, error: usageError } = await supabase
      .from("usage_records")
      .select("*")
      .eq("company_id", company.id)
      .gte("period_start", currentMonth)
      .maybeSingle();

    if (usageError) {
      console.error("Error fetching usage:", usageError);
    }
    setUsage(usageData);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscription();
  }, [company]);

  // Computed values
  const plan = subscription?.plan || "free";
  const tier = planToTier(plan);
  const status = subscription?.status || "trialing";
  const isActive = isSubscriptionActive(status);
  const isReadOnly = isReadOnlyMode(status);
  const isTrialing = status === "trialing";
  const trialDaysRemaining = getTrialDaysRemaining(subscription?.trial_ends_at || null);
  const hasStripeSubscription = !!subscription?.stripe_subscription_id;

  // Usage values
  const quotesUsed = usage?.quotes_created_this_month || 0;
  const limits = PLAN_LIMITS[tier];
  const quotesLimit = limits.quotesPerMonth;

  // Feature check functions
  const canUse = (feature: keyof PlanLimits["features"]) => {
    if (!isActive) return false;
    return canUseFeature(tier, feature);
  };

  const canCreateQuote = () => {
    if (!isActive) return false;
    return isWithinLimit(tier, "quotesPerMonth", quotesUsed);
  };

  const canSendQuote = () => {
    if (!isActive) return false;
    return true; // Sending is unlimited for all plans
  };

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      usage,
      loading,
      plan,
      tier,
      isActive,
      isReadOnly,
      isTrialing,
      trialDaysRemaining,
      hasStripeSubscription,
      canUse,
      canCreateQuote,
      canSendQuote,
      quotesUsed,
      quotesLimit,
      refetch: fetchSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
