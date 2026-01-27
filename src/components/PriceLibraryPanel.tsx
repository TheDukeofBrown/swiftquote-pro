import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Library, Search, Plus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type PriceItemUnit = "each" | "hour" | "percent" | "metre" | "day";
type PriceItemType = "labour" | "material" | "service" | "uplift";

interface PriceItem {
  id: string;
  name: string;
  description: string | null;
  type: PriceItemType;
  unit: PriceItemUnit;
  unit_price: number;
}

interface PriceLibraryPanelProps {
  onAddItem: (item: {
    description: string;
    item_type: "labour" | "materials";
    quantity: number;
    unit_price: number;
    is_uplift?: boolean;
    uplift_percent?: number;
  }) => void;
}

export function PriceLibraryPanel({ onAddItem }: PriceLibraryPanelProps) {
  const { company } = useCompany();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open && company) {
      fetchPriceItems();
    }
  }, [open, company]);

  const fetchPriceItems = async () => {
    if (!company) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from("price_items")
      .select("*")
      .eq("company_id", company.id)
      .order("sort_order");

    if (error) {
      console.error("Error fetching price items:", error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectItem = (item: PriceItem) => {
    if (item.type === "uplift") {
      // Handle uplift as a percentage item
      onAddItem({
        description: `${item.name} (${item.unit_price}%)`,
        item_type: "labour",
        quantity: 1,
        unit_price: 0, // Will be calculated based on subtotal
        is_uplift: true,
        uplift_percent: item.unit_price,
      });
    } else {
      onAddItem({
        description: item.name,
        item_type: item.type === "material" ? "materials" : "labour",
        quantity: 1,
        unit_price: item.unit_price,
      });
    }
    setOpen(false);
    setSearch("");
  };

  const getUnitLabel = (unit: PriceItemUnit) => {
    const labels: Record<PriceItemUnit, string> = {
      each: "fixed",
      hour: "/hr",
      percent: "%",
      metre: "/sqm",
      day: "/day",
    };
    return labels[unit];
  };

  const getTypeColor = (type: PriceItemType) => {
    const colors: Record<PriceItemType, string> = {
      labour: "bg-blue-100 text-blue-800",
      material: "bg-amber-100 text-amber-800",
      service: "bg-green-100 text-green-800",
      uplift: "bg-purple-100 text-purple-800",
    };
    return colors[type];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Library className="w-4 h-4" />
          <span className="hidden sm:inline">Price Library</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Library className="w-5 h-5" />
            Price Library
          </SheetTitle>
          <SheetDescription>
            Tap an item to add it to your quote instantly
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={() => setSearch("")}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Items list */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8">
                <Library className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {items.length === 0 
                    ? "No items in your price library yet" 
                    : "No items match your search"}
                </p>
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Add defaults in Settings → Price Library
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className="w-full text-left p-3 rounded-lg border border-border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {item.description}
                          </p>
                        )}
                        <Badge 
                          variant="secondary" 
                          className={cn("mt-1.5 text-xs", getTypeColor(item.type))}
                        >
                          {item.type}
                        </Badge>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-sm">
                          {item.unit === "percent" 
                            ? `${item.unit_price}%` 
                            : formatCurrency(item.unit_price)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getUnitLabel(item.unit)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-primary flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add to quote
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
