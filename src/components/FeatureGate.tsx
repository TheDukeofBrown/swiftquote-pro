import { useSubscription } from "@/contexts/SubscriptionContext";
import { PlanLimits } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

interface FeatureGateProps {
  feature: keyof PlanLimits["features"];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only if the current plan includes the feature.
 * Otherwise shows an upgrade prompt.
 */
export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { canUse, plan } = useSubscription();
  
  if (canUse(feature)) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center">
        <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-3">
          This feature requires an upgrade
        </p>
        <Link to="/settings?tab=billing">
          <Button size="sm" variant="outline">
            Upgrade Plan
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

interface UsageLimitGateProps {
  type: "quote" | "pdf";
  children: React.ReactNode;
  onLimitReached?: () => void;
}

/**
 * Renders children only if within usage limits.
 * Shows limit reached message otherwise.
 */
export function UsageLimitGate({ type, children, onLimitReached }: UsageLimitGateProps) {
  const { canCreateQuote, canDownloadPdf, quotesUsed, quotesLimit, pdfsUsed, pdfsLimit, plan } = useSubscription();
  
  const canProceed = type === "quote" ? canCreateQuote() : canDownloadPdf();
  const used = type === "quote" ? quotesUsed : pdfsUsed;
  const limit = type === "quote" ? quotesLimit : pdfsLimit;
  const label = type === "quote" ? "quotes" : "PDF downloads";
  
  if (canProceed) {
    return <>{children}</>;
  }
  
  return (
    <Card className="border-warning bg-warning/5">
      <CardContent className="py-6 text-center">
        <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-3" />
        <p className="font-medium mb-1">Monthly limit reached</p>
        <p className="text-sm text-muted-foreground mb-4">
          You've used {used} of {limit} {label} this month
        </p>
        <Link to="/settings?tab=billing">
          <Button size="sm">
            Upgrade for More
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

interface ReadOnlyGuardProps {
  children: React.ReactNode;
}

/**
 * Shows a read-only warning banner when subscription is lapsed.
 */
export function ReadOnlyGuard({ children }: ReadOnlyGuardProps) {
  const { isReadOnly, subscription } = useSubscription();
  
  if (!isReadOnly) {
    return <>{children}</>;
  }
  
  return (
    <div>
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
        <div className="container flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">
              Your subscription has {subscription?.status === "past_due" ? "payment issues" : "expired"}. 
              Your account is in read-only mode.
            </span>
          </div>
          <Link to="/settings?tab=billing">
            <Button size="sm" variant="destructive">
              Update Billing
            </Button>
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
