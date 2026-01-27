import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { useBrand } from "@/contexts/BrandContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Library, Loader2, Zap, ArrowRight } from "lucide-react";

interface PriceLibrarySetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSkip: () => void;
  onComplete: () => void;
}

type PriceItemType = "labour" | "material" | "service" | "uplift";
type PriceItemUnit = "each" | "hour" | "percent" | "metre" | "day";

// Trade-specific default items
const tradeDefaults: Record<string, { name: string; type: PriceItemType; unit: PriceItemUnit; price: number }[]> = {
  plumber: [
    { name: "Call-out charge", type: "service", unit: "each", price: 60 },
    { name: "Labour rate", type: "labour", unit: "hour", price: 50 },
    { name: "Boiler service", type: "service", unit: "each", price: 80 },
    { name: "Radiator install", type: "service", unit: "each", price: 150 },
    { name: "Emergency uplift", type: "uplift", unit: "percent", price: 50 },
  ],
  electrician: [
    { name: "Labour rate", type: "labour", unit: "hour", price: 55 },
    { name: "Consumer unit replacement", type: "service", unit: "each", price: 450 },
    { name: "Socket install", type: "service", unit: "each", price: 65 },
    { name: "Lighting point install", type: "service", unit: "each", price: 85 },
    { name: "EICR certificate", type: "service", unit: "each", price: 180 },
  ],
  plasterer: [
    { name: "Labour day rate", type: "labour", unit: "day", price: 200 },
    { name: "Small patch repair", type: "service", unit: "each", price: 80 },
    { name: "Standard room skim", type: "service", unit: "each", price: 350 },
    { name: "Materials allowance", type: "material", unit: "each", price: 50 },
    { name: "Ceiling skim (per sqm)", type: "service", unit: "metre", price: 25 },
  ],
  builder: [
    { name: "Labourer day rate", type: "labour", unit: "day", price: 150 },
    { name: "Skilled rate", type: "labour", unit: "day", price: 220 },
    { name: "Site setup/prelims", type: "service", unit: "each", price: 250 },
    { name: "Materials allowance", type: "material", unit: "each", price: 500 },
    { name: "Contingency (10%)", type: "uplift", unit: "percent", price: 10 },
  ],
  painter: [
    { name: "Labour day rate", type: "labour", unit: "day", price: 180 },
    { name: "Standard room (walls)", type: "service", unit: "each", price: 250 },
    { name: "Ceiling (per room)", type: "service", unit: "each", price: 120 },
    { name: "Materials/paint", type: "material", unit: "each", price: 100 },
    { name: "Exterior work uplift", type: "uplift", unit: "percent", price: 20 },
  ],
  roofer: [
    { name: "Labour day rate", type: "labour", unit: "day", price: 220 },
    { name: "Call-out/inspection", type: "service", unit: "each", price: 75 },
    { name: "Roof repair allowance", type: "service", unit: "each", price: 300 },
    { name: "Scaffolding allowance", type: "material", unit: "each", price: 400 },
    { name: "Leadwork/flashing", type: "service", unit: "each", price: 250 },
  ],
};

export function PriceLibrarySetupModal({
  open,
  onOpenChange,
  onSkip,
  onComplete,
}: PriceLibrarySetupModalProps) {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { brand } = useBrand();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const tradeId = company?.trade || "builder";
  const defaults = tradeDefaults[tradeId] || tradeDefaults.builder;

  const handleAddDefaults = async () => {
    if (!company) return;
    
    setLoading(true);
    try {
      const itemsToInsert = defaults.map((item, index) => ({
        company_id: company.id,
        name: item.name,
        type: item.type,
        unit: item.unit,
        unit_price: item.price,
        sort_order: index,
      }));

      const { error } = await supabase.from("price_items").insert(itemsToInsert);
      if (error) throw error;

      toast({
        title: "Price library set up!",
        description: `Added ${defaults.length} default items`,
      });

      onComplete();
    } catch (err: any) {
      console.error("Setup error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to add defaults",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomize = () => {
    onOpenChange(false);
    navigate("/settings?tab=library");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="w-5 h-5 text-primary" />
            Set up your Price Library
          </DialogTitle>
          <DialogDescription>
            Quote faster by adding your common items and rates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            We'll add these {brand.name || "trade"} defaults to get you started:
          </p>
          
          <div className="space-y-2">
            {defaults.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
              >
                <span>{item.name}</span>
                <span className="text-muted-foreground">
                  {item.unit === "percent" ? `${item.price}%` : `£${item.price}`}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            You can edit these anytime in Settings → Price Library
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={onSkip} disabled={loading}>
            Skip for now
          </Button>
          <Button variant="outline" onClick={handleCustomize} disabled={loading}>
            Customize first
          </Button>
          <Button onClick={handleAddDefaults} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Add Defaults
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}