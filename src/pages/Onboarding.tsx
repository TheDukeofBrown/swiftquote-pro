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
import { Loader2, HardHat, Droplets, Zap, PaintBucket, ArrowRight, ArrowLeft, Plus, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { brands } from "@/config/brands";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type TradeType = Database["public"]["Enums"]["trade_type"];
type PriceItemUnit = "each" | "hour" | "percent" | "metre" | "day";
type PriceItemType = "labour" | "material" | "service" | "uplift";

interface DefaultPriceItem {
  name: string;
  type: PriceItemType;
  unit: PriceItemUnit;
  unit_price: number;
}

const tradeOptions: { id: TradeType; name: string; brandName: string; icon: typeof HardHat; description: string; primaryHue: number }[] = [
  { id: "plumber", name: "Plumber", brandName: brands.plumber.name, icon: Droplets, description: brands.plumber.tagline, primaryHue: brands.plumber.primaryHue },
  { id: "electrician", name: "Electrician", brandName: brands.electrician.name, icon: Zap, description: brands.electrician.tagline, primaryHue: brands.electrician.primaryHue },
  { id: "plasterer", name: "Plasterer", brandName: brands.plasterer.name, icon: PaintBucket, description: brands.plasterer.tagline, primaryHue: brands.plasterer.primaryHue },
  { id: "builder", name: "Builder", brandName: brands.builder.name, icon: HardHat, description: brands.builder.tagline, primaryHue: brands.builder.primaryHue },
];

// Default price items by trade
const tradeDefaultItems: Record<TradeType, DefaultPriceItem[]> = {
  plumber: [
    { name: "Call-out charge", type: "service", unit: "each", unit_price: 60 },
    { name: "Labour rate", type: "labour", unit: "hour", unit_price: 55 },
    { name: "Boiler service", type: "service", unit: "each", unit_price: 120 },
    { name: "Radiator install", type: "service", unit: "each", unit_price: 180 },
    { name: "Emergency uplift", type: "uplift", unit: "percent", unit_price: 50 },
  ],
  electrician: [
    { name: "Call-out charge", type: "service", unit: "each", unit_price: 50 },
    { name: "Labour rate", type: "labour", unit: "hour", unit_price: 50 },
    { name: "Consumer unit upgrade", type: "service", unit: "each", unit_price: 450 },
    { name: "Socket installation", type: "service", unit: "each", unit_price: 85 },
    { name: "Emergency uplift", type: "uplift", unit: "percent", unit_price: 50 },
  ],
  plasterer: [
    { name: "Day rate", type: "labour", unit: "day", unit_price: 200 },
    { name: "Labour rate", type: "labour", unit: "hour", unit_price: 40 },
    { name: "Room plastering (per sqm)", type: "service", unit: "metre", unit_price: 18 },
    { name: "Ceiling skim", type: "service", unit: "each", unit_price: 280 },
    { name: "Weekend uplift", type: "uplift", unit: "percent", unit_price: 25 },
  ],
  builder: [
    { name: "Day rate (labourer)", type: "labour", unit: "day", unit_price: 150 },
    { name: "Day rate (skilled)", type: "labour", unit: "day", unit_price: 220 },
    { name: "Labour rate", type: "labour", unit: "hour", unit_price: 45 },
    { name: "Skip hire", type: "material", unit: "each", unit_price: 250 },
    { name: "Weekend uplift", type: "uplift", unit: "percent", unit_price: 25 },
  ],
};

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
  const [labourRate, setLabourRate] = useState("");
  const [vatRegistered, setVatRegistered] = useState(false);
  const [priceItems, setPriceItems] = useState<DefaultPriceItem[]>([]);

  // Get default labour rate from brand config when trade is selected
  const selectedBrand = selectedTrade ? brands[selectedTrade] : null;

  const handleTradeSelect = (trade: TradeType) => {
    setSelectedTrade(trade);
    setLabourRate(String(brands[trade].defaultLabourRate));
    // Pre-populate price items with trade defaults
    setPriceItems([...tradeDefaultItems[trade]]);
  };

  const updatePriceItem = (index: number, updates: Partial<DefaultPriceItem>) => {
    setPriceItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], ...updates };
      return newItems;
    });
  };

  const removePriceItem = (index: number) => {
    setPriceItems(prev => prev.filter((_, i) => i !== index));
  };

  const addPriceItem = () => {
    setPriceItems(prev => [...prev, {
      name: "",
      type: "service" as PriceItemType,
      unit: "each" as PriceItemUnit,
      unit_price: 0,
    }]);
  };

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
      const defaultRate = selectedBrand?.defaultLabourRate || 45;
      
      // Create company
      const { data: newCompany, error: companyError } = await supabase.from("companies").insert({
        user_id: user.id,
        business_name: businessName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        trade: selectedTrade,
        default_labour_rate: parseFloat(labourRate) || defaultRate,
        vat_registered: vatRegistered,
      }).select().single();

      if (companyError || !newCompany) throw companyError || new Error("Failed to create company");

      // Create price library items
      const validItems = priceItems.filter(item => item.name.trim() && item.unit_price > 0);
      if (validItems.length > 0) {
        const { error: itemsError } = await supabase.from("price_items").insert(
          validItems.map((item, index) => ({
            company_id: newCompany.id,
            name: item.name.trim(),
            type: item.type,
            unit: item.unit,
            unit_price: item.unit_price,
            sort_order: index,
          }))
        );
        if (itemsError) {
          console.error("Error creating price items:", itemsError);
          // Don't fail onboarding, just log the error
        }
      }

      await refetch();
      toast({
        title: "Setup complete!",
        description: `Welcome to ${selectedBrand?.name || "QuoteTrack"}. Let's create your first quote.`,
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

  const getUnitLabel = (unit: PriceItemUnit) => {
    const labels: Record<PriceItemUnit, string> = {
      each: "Fixed",
      hour: "/hour",
      percent: "%",
      metre: "/sqm",
      day: "/day",
    };
    return labels[unit];
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">Set Up Your Business</h1>
          <p className="text-muted-foreground">Quick setup — you'll be quoting in under 60 seconds</p>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "w-10 h-1.5 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-border"
              )}
            />
          ))}
        </div>

        {step === 1 && (
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Select Your Trade</CardTitle>
              <CardDescription>Choose your trade to get a branded experience</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {tradeOptions.map((trade) => {
                  const Icon = trade.icon;
                  const isSelected = selectedTrade === trade.id;
                  return (
                    <button
                      key={trade.id}
                      onClick={() => handleTradeSelect(trade.id)}
                      className={cn(
                        "p-4 rounded-lg border-2 text-left transition-all hover:shadow-md",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/30"
                      )}
                      style={isSelected ? { borderColor: `hsl(${trade.primaryHue} 70% 45%)` } : undefined}
                    >
                      <Icon 
                        className="w-8 h-8 mb-2"
                        style={{ color: isSelected ? `hsl(${trade.primaryHue} 70% 45%)` : undefined }}
                      />
                      <div className="font-bold">{trade.brandName}</div>
                      <div className="text-xs text-muted-foreground mt-1">{trade.description}</div>
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
                  onClick={() => setStep(3)}
                  disabled={!businessName.trim()}
                >
                  Continue <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Set Your Defaults</CardTitle>
              <CardDescription>Pre-fill your common prices — edit, delete, or add more</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {priceItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <Input
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => updatePriceItem(index, { name: e.target.value })}
                      className="border-0 bg-transparent px-0 h-8 text-sm font-medium"
                    />
                  </div>
                  <div className="w-20">
                    <Select
                      value={item.unit}
                      onValueChange={(v) => updatePriceItem(index, { unit: v as PriceItemUnit })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="each">Fixed</SelectItem>
                        <SelectItem value="hour">/hour</SelectItem>
                        <SelectItem value="day">/day</SelectItem>
                        <SelectItem value="metre">/sqm</SelectItem>
                        <SelectItem value="percent">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 flex items-center gap-1">
                    {item.unit !== "percent" && <span className="text-muted-foreground text-sm">£</span>}
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updatePriceItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-sm"
                    />
                    {item.unit === "percent" && <span className="text-muted-foreground text-sm">%</span>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removePriceItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              <Button variant="outline" size="sm" onClick={addPriceItem} className="w-full">
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 w-4 h-4" /> Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleComplete}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 w-4 h-4" />
                      Complete Setup
                    </>
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
