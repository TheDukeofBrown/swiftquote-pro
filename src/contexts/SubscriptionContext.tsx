import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./CompanyContext";
import { 
  SubscriptionPlan, 
  SubscriptionStatus, 
  PLAN_LIMITS, 
  canUseFeature, 
  isWithinLimit,
  isSubscriptionActive,
  isReadOnlyMode,
  PlanLimits
} from "@/config/plans";

interface Subscription {
  id: string;
  company_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
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
  isActive: boolean;
  isReadOnly: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number;
  
  // Feature checks
  canUse: (feature: keyof PlanLimits["features"]) => boolean;
  canCreateQuote: () => boolean;
  canDownloadPdf: () => boolean;
  
  // Usage info
  quotesUsed: number;
  quotesLimit: number;
  pdfsUsed: number;
  pdfsLimit: number;
  
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
    
    // Cast the data to our expected type
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
  const status = subscription?.status || "trialing";
  const isActive = isSubscriptionActive(status);
  const isReadOnly = isReadOnlyMode(status);
  const isTrialing = status === "trialing";
  
  // Calculate trial days remaining
  const trialDaysRemaining = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Usage values
  const quotesUsed = usage?.quotes_created_this_month || 0;
  const pdfsUsed = usage?.pdfs_generated_this_month || 0;
  const limits = PLAN_LIMITS[plan];
  const quotesLimit = limits.quotesPerMonth;
  const pdfsLimit = limits.pdfDownloads;

  // Feature check functions
  const canUse = (feature: keyof PlanLimits["features"]) => {
    if (!isActive) return false;
    return canUseFeature(plan, feature);
  };

  const canCreateQuote = () => {
    if (!isActive) return false;
    return isWithinLimit(plan, "quotesPerMonth", quotesUsed);
  };

  const canDownloadPdf = () => {
    if (!isActive) return false;
    return isWithinLimit(plan, "pdfDownloads", pdfsUsed);
  };

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      usage,
      loading,
      plan,
      isActive,
      isReadOnly,
      isTrialing,
      trialDaysRemaining,
      canUse,
      canCreateQuote,
      canDownloadPdf,
      quotesUsed,
      quotesLimit,
      pdfsUsed,
      pdfsLimit,
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
