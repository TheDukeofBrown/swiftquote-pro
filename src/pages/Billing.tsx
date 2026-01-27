import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { useBrand } from "@/contexts/BrandContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UsageDisplay } from "@/components/UsageDisplay";
import { PLANS, getPlanInfo, STRIPE_PRICES } from "@/config/plans";
import BrandLogo from "@/components/BrandLogo";
import { 
  ArrowLeft, 
  Loader2, 
  Check, 
  Crown, 
  Zap, 
  Clock, 
  ExternalLink,
  CreditCard,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Billing() {
  const [searchParams] = useSearchParams();
  const { company } = useCompany();
  const { brand } = useBrand();
  const { 
    plan, 
    tier,
    isTrialing, 
    trialDaysRemaining,
    isActive,
    isReadOnly,
    hasStripeSubscription,
    subscription,
    refetch
  } = useSubscription();
  const { toast } = useToast();

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Handle success/cancel query params
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    
    if (success === "true") {
      toast({
        title: "Subscription activated!",
        description: "Thank you for subscribing. Your plan is now active.",
      });
      refetch();
    } else if (canceled === "true") {
      toast({
        title: "Checkout canceled",
        description: "No changes were made to your subscription.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast, refetch]);

  const handleCheckout = async (priceId: string, planId: string) => {
    if (!company) return;
    
    setCheckoutLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, companyId: company.id },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const currentPlanInfo = getPlanInfo(plan);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container flex items-center h-14 gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="h-6 w-px bg-border" />
          <BrandLogo size="sm" />
          <div className="flex-1" />
        </div>
      </header>

      <main className="container py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription and billing details
          </p>
        </div>

        {/* Status Alerts */}
        {isTrialing && trialDaysRemaining > 0 && (
          <div className="mb-6 p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">You're on a 7-day free trial</p>
              <p className="text-sm text-muted-foreground">
                {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} remaining. 
                Subscribe now to continue using {brand.name} after your trial ends.
              </p>
            </div>
          </div>
        )}

        {isTrialing && trialDaysRemaining === 0 && !hasStripeSubscription && (
          <div className="mb-6 p-4 rounded-lg border border-destructive/20 bg-destructive/5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Trial expired</p>
              <p className="text-sm text-muted-foreground">
                Your free trial has ended. Subscribe to continue creating quotes.
              </p>
            </div>
          </div>
        )}

        {subscription?.status === "past_due" && (
          <div className="mb-6 p-4 rounded-lg border border-warning/20 bg-warning/5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
            <div>
              <p className="font-medium text-warning">Payment failed</p>
              <p className="text-sm text-muted-foreground">
                Your last payment failed. Please update your payment method to avoid service interruption.
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={handleManageSubscription}>
                Update Payment Method
              </Button>
            </div>
          </div>
        )}

        {hasStripeSubscription && isActive && !isTrialing && (
          <div className="mb-6 p-4 rounded-lg border border-success/20 bg-success/5 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-success mt-0.5" />
            <div>
              <p className="font-medium text-success">Subscription active</p>
              <p className="text-sm text-muted-foreground">
                You're on the {currentPlanInfo.name} plan. 
                {subscription?.current_period_end && (
                  <> Next billing date: {new Date(subscription.current_period_end).toLocaleDateString("en-GB")}</>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Current Plan & Usage */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <UsageDisplay />
          
          {hasStripeSubscription && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Manage Subscription</CardTitle>
                <CardDescription>
                  Update payment method, download invoices, or cancel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleManageSubscription} 
                  disabled={portalLoading}
                  className="w-full"
                >
                  {portalLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  Open Billing Portal
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pricing Plans */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Choose Your Plan</CardTitle>
                <CardDescription>
                  Select the plan that best fits your needs
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                <Button
                  variant={billingCycle === "monthly" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setBillingCycle("monthly")}
                >
                  Monthly
                </Button>
                <Button
                  variant={billingCycle === "yearly" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setBillingCycle("yearly")}
                >
                  Yearly
                  <Badge variant="secondary" className="ml-2 text-xs">Save 2 months</Badge>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {PLANS.map((planOption) => {
                const isCurrentPlan = plan === planOption.id;
                const Icon = planOption.tier === "team" ? Crown : planOption.tier === "pro" ? Zap : Clock;
                const price = billingCycle === "yearly" 
                  ? planOption.priceYearly 
                  : planOption.priceMonthly;
                const priceId = billingCycle === "yearly"
                  ? planOption.stripePriceIdYearly
                  : planOption.stripePriceIdMonthly;
                const isLoading = checkoutLoading === planOption.id;

                return (
                  <div
                    key={planOption.id}
                    className={cn(
                      "rounded-xl border p-6 relative transition-all",
                      isCurrentPlan && "border-primary bg-primary/5",
                      planOption.recommended && !isCurrentPlan && "border-primary/50"
                    )}
                  >
                    {planOption.recommended && !isCurrentPlan && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                        Recommended
                      </Badge>
                    )}
                    {isCurrentPlan && (
                      <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2">
                        Current Plan
                      </Badge>
                    )}
                    
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-5 h-5 text-primary" />
                      <h3 className="font-bold">{planOption.name}</h3>
                    </div>
                    
                    <div className="mb-4">
                      <span className="text-3xl font-bold">£{price}</span>
                      <span className="text-muted-foreground">
                        /{billingCycle === "yearly" ? "year" : "month"}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      {planOption.description}
                    </p>
                    
                    <ul className="space-y-2 mb-6 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success" />
                        {planOption.limits.quotesPerMonth === -1 
                          ? "Unlimited quotes" 
                          : `${planOption.limits.quotesPerMonth} quotes/month`
                        }
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success" />
                        Email + PDF generation
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success" />
                        Quote tracking
                      </li>
                      {planOption.limits.features.acceptanceTracking && (
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-success" />
                          Acceptance + viewed tracking
                        </li>
                      )}
                      {planOption.limits.features.priceLibrary && (
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-success" />
                          Price library
                        </li>
                      )}
                      {planOption.limits.features.teamMembers > 1 && (
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-success" />
                          Up to {planOption.limits.features.teamMembers} team members
                        </li>
                      )}
                      {planOption.limits.features.analytics && (
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-success" />
                          Analytics dashboard
                        </li>
                      )}
                    </ul>
                    
                    <Button
                      variant={isCurrentPlan ? "outline" : "default"}
                      className="w-full"
                      disabled={isCurrentPlan || isLoading}
                      onClick={() => handleCheckout(priceId, planOption.id)}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : isCurrentPlan ? (
                        "Current Plan"
                      ) : hasStripeSubscription ? (
                        "Change Plan"
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Subscribe
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
            
            <p className="text-center text-sm text-muted-foreground mt-6">
              All plans include a 7-day free trial. Cancel anytime.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
