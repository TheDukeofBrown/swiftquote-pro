import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useBrand } from "@/contexts/BrandContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { UsageDisplay } from "@/components/UsageDisplay";
import { PLANS, getPlanInfo } from "@/config/plans";
import { ArrowLeft, Loader2, Save, LogOut, Check, Crown, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signOut } = useAuth();
  const { company, refetch } = useCompany();
  const { brand } = useBrand();
  const { plan, isTrialing, trialDaysRemaining } = useSubscription();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "business");
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState(company?.business_name || "");
  const [email, setEmail] = useState(company?.email || "");
  const [phone, setPhone] = useState(company?.phone || "");
  const [address, setAddress] = useState(company?.address || "");
  const [labourRate, setLabourRate] = useState(String(company?.default_labour_rate || 45));
  const [vatRegistered, setVatRegistered] = useState(company?.vat_registered || false);
  const [vatRate, setVatRate] = useState(String(company?.vat_rate || 20));

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const handleSave = async () => {
    if (!company) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          business_name: businessName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
          default_labour_rate: parseFloat(labourRate) || 45,
          vat_registered: vatRegistered,
          vat_rate: parseFloat(vatRate) || 20,
        })
        .eq("id", company.id);

      if (error) throw error;

      await refetch();
      toast({
        title: "Settings saved",
        description: "Your business details have been updated.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const currentPlanInfo = getPlanInfo(plan);
  const PlanIcon = plan === "business" ? Crown : plan === "pro" ? Zap : Clock;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="font-semibold">Settings</h1>
          </div>
          {activeTab === "business" && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
          )}
        </div>
      </header>

      <main className="container py-6 max-w-3xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="billing">Billing & Plan</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          {/* Business Settings Tab */}
          <TabsContent value="business" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Business Details</CardTitle>
                    <CardDescription>This information appears on your quotes</CardDescription>
                  </div>
                  <Badge 
                    variant="outline" 
                    className="text-sm"
                    style={{ 
                      borderColor: `hsl(${brand.primaryHue} 70% 45%)`,
                      color: `hsl(${brand.primaryHue} 70% 45%)`
                    }}
                  >
                    {brand.name}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Your business address"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing Defaults</CardTitle>
                <CardDescription>Default values for new quotes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="labourRate">Default Labour Rate (£/hour)</Label>
                  <Input
                    id="labourRate"
                    type="number"
                    min="0"
                    step="0.50"
                    value={labourRate}
                    onChange={(e) => setLabourRate(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label>VAT Registered</Label>
                    <p className="text-sm text-muted-foreground">Add VAT to your quotes</p>
                  </div>
                  <Switch checked={vatRegistered} onCheckedChange={setVatRegistered} />
                </div>
                {vatRegistered && (
                  <div className="space-y-2">
                    <Label htmlFor="vatRate">VAT Rate (%)</Label>
                    <Input
                      id="vatRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={vatRate}
                      onChange={(e) => setVatRate(e.target.value)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            {/* Current Plan & Usage */}
            <UsageDisplay />

            {/* Plan Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Choose Your Plan</CardTitle>
                <CardDescription>
                  {isTrialing 
                    ? `Your trial ends in ${trialDaysRemaining} days. Upgrade to keep full access.`
                    : "Select a plan that fits your business needs"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {PLANS.map((planOption) => {
                    const isCurrentPlan = planOption.id === plan;
                    const Icon = planOption.id === "business" ? Crown : planOption.id === "pro" ? Zap : Clock;
                    
                    return (
                      <div
                        key={planOption.id}
                        className={cn(
                          "relative p-5 rounded-xl border-2 transition-all",
                          isCurrentPlan 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50",
                          planOption.recommended && !isCurrentPlan && "ring-2 ring-primary/20"
                        )}
                      >
                        {planOption.recommended && (
                          <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs">
                            Recommended
                          </Badge>
                        )}
                        
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className="w-5 h-5 text-primary" />
                          <h3 className="font-bold">{planOption.name}</h3>
                        </div>
                        
                        <div className="mb-4">
                          <span className="text-3xl font-bold">£{planOption.priceMonthly}</span>
                          <span className="text-muted-foreground">/month</span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-4">
                          {planOption.description}
                        </p>
                        
                        <ul className="space-y-2 mb-4 text-sm">
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-success" />
                            {planOption.limits.quotesPerMonth === -1 
                              ? "Unlimited quotes" 
                              : `${planOption.limits.quotesPerMonth} quotes/month`
                            }
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-success" />
                            {planOption.limits.pdfDownloads === -1 
                              ? "Unlimited PDFs" 
                              : `${planOption.limits.pdfDownloads} PDFs/month`
                            }
                          </li>
                          {planOption.limits.features.customBranding && (
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-success" />
                              Custom branding
                            </li>
                          )}
                          {planOption.limits.features.emailSending && (
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-success" />
                              Email sending
                            </li>
                          )}
                          {planOption.limits.features.multiUser && (
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-success" />
                              Multi-user access
                            </li>
                          )}
                        </ul>
                        
                        <Button
                          variant={isCurrentPlan ? "outline" : "default"}
                          className="w-full"
                          disabled={isCurrentPlan || planOption.id === "free"}
                        >
                          {isCurrentPlan ? "Current Plan" : planOption.id === "free" ? "Free Trial" : "Upgrade"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
                
                <p className="text-center text-sm text-muted-foreground mt-6">
                  Stripe integration coming soon. Contact us at support@quotetrack.co.uk to upgrade.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>Manage your account settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
