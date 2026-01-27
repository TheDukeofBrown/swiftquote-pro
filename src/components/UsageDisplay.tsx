import { useSubscription } from "@/contexts/SubscriptionContext";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Clock, Zap, Crown, FileText } from "lucide-react";
import { getPlanInfo } from "@/config/plans";
import { cn } from "@/lib/utils";

interface UsageDisplayProps {
  compact?: boolean;
}

export function UsageDisplay({ compact = false }: UsageDisplayProps) {
  const { 
    plan,
    tier,
    quotesUsed, 
    quotesLimit, 
    isTrialing,
    trialDaysRemaining 
  } = useSubscription();
  
  const planInfo = getPlanInfo(plan);
  const quotesPercentage = quotesLimit === -1 ? 0 : (quotesUsed / quotesLimit) * 100;
  
  const PlanIcon = tier === "team" ? Crown : tier === "pro" ? Zap : Clock;
  
  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Badge variant="outline" className="gap-1">
          <PlanIcon className="w-3 h-3" />
          {planInfo.name}
        </Badge>
        {isTrialing && trialDaysRemaining > 0 && (
          <span className="text-muted-foreground">
            {trialDaysRemaining} days left
          </span>
        )}
        <span className="text-muted-foreground">
          {quotesUsed}/{quotesLimit === -1 ? "∞" : quotesLimit} quotes
        </span>
      </div>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PlanIcon className="w-4 h-4" />
            {planInfo.name} Plan
          </CardTitle>
          {tier !== "team" && (
            <Link to="/billing">
              <Button variant="outline" size="sm">Upgrade</Button>
            </Link>
          )}
        </div>
        {isTrialing && trialDaysRemaining > 0 && (
          <p className="text-sm text-muted-foreground">
            Trial ends in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quotes usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <FileText className="w-4 h-4" />
              Quotes this month
            </span>
            <span className="font-medium">
              {quotesUsed} / {quotesLimit === -1 ? "Unlimited" : quotesLimit}
            </span>
          </div>
          {quotesLimit !== -1 && (
            <Progress 
              value={quotesPercentage} 
              className={cn(
                "h-2",
                quotesPercentage > 80 && "bg-warning/20",
                quotesPercentage >= 100 && "bg-destructive/20"
              )}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
