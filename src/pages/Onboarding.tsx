import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, HardHat, Droplets, Zap, PaintBucket, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type TradeType = Database["public"]["Enums"]["trade_type"];

const trades: { id: TradeType; name: string; icon: typeof HardHat; description: string }[] = [
  { id: "builder", name: "Builder", icon: HardHat, description: "Construction, extensions, renovations" },
  { id: "plumber", name: "Plumber", icon: Droplets, description: "Plumbing, heating, bathrooms" },
  { id: "electrician", name: "Electrician", icon: Zap, description: "Electrical work, rewiring, testing" },
  { id: "plasterer", name: "Plasterer", icon: PaintBucket, description: "Plastering, rendering, screeding" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refetch } = useCompany();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<TradeType | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [labourRate, setLabourRate] = useState("45");
  const [vatRegistered, setVatRegistered] = useState(false);

  const handleComplete = async () => {
    if (!user || !selectedTrade || !businessName.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("companies").insert({
        user_id: user.id,
        business_name: businessName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        trade: selectedTrade,
        default_labour_rate: parseFloat(labourRate) || 45,
        vat_registered: vatRegistered,
      });

      if (error) throw error;

      await refetch();
      toast({
        title: "Setup complete!",
        description: "Your business is ready. Let's create your first quote.",
      });
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save your details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Set Up Your Business</h1>
          <p className="text-muted-foreground">Quick setup to get you quoting in under a minute</p>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={cn(
                "w-12 h-1.5 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-border"
              )}
            />
          ))}
        </div>

        {step === 1 && (
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>What's your trade?</CardTitle>
              <CardDescription>This helps us customize your quote templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {trades.map((trade) => {
                  const Icon = trade.icon;
                  return (
                    <button
                      key={trade.id}
                      onClick={() => setSelectedTrade(trade.id)}
                      className={cn(
                        "p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50",
                        selectedTrade === trade.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      )}
                    >
                      <Icon className={cn(
                        "w-8 h-8 mb-2",
                        selectedTrade === trade.id ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div className="font-medium">{trade.name}</div>
                      <div className="text-xs text-muted-foreground">{trade.description}</div>
                    </button>
                  );
                })}
              </div>
              <Button
                className="w-full mt-6"
                onClick={() => setStep(2)}
                disabled={!selectedTrade}
              >
                Continue <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
              <CardDescription>This appears on your quotes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  placeholder="e.g. Smith Plumbing Services"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="07123 456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="labourRate">Default Labour Rate (£/hr)</Label>
                  <Input
                    id="labourRate"
                    type="number"
                    min="0"
                    step="0.50"
                    value={labourRate}
                    onChange={(e) => setLabourRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>VAT Registered?</Label>
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant={vatRegistered ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVatRegistered(true)}
                    >
                      Yes
                    </Button>
                    <Button
                      type="button"
                      variant={!vatRegistered ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVatRegistered(false)}
                    >
                      No
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 w-4 h-4" /> Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleComplete}
                  disabled={loading || !businessName.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    "Complete Setup"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
