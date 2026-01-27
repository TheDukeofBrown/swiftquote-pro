import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Zap, Send, Loader2, Plus, X, Library } from "lucide-react";
import { cn } from "@/lib/utils";

type PriceItemType = "labour" | "material" | "service" | "uplift";

interface PriceItem {
  id: string;
  name: string;
  description: string | null;
  type: PriceItemType;
  unit_price: number;
}

interface QuickQuoteItem {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface QuickQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickQuoteModal({ open, onOpenChange }: QuickQuoteModalProps) {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { toast } = useToast();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [items, setItems] = useState<QuickQuoteItem[]>([]);
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open && company) {
      fetchPriceItems();
    }
  }, [open, company]);

  const fetchPriceItems = async () => {
    if (!company) return;
    setLoading(true);
    const { data } = await supabase
      .from("price_items")
      .select("*")
      .eq("company_id", company.id)
      .neq("type", "uplift")
      .order("sort_order")
      .limit(10);
    setPriceItems(data || []);
    setLoading(false);
  };

  const addItemFromLibrary = (item: PriceItem) => {
    if (items.length >= 3) {
      toast({
        title: "Max 3 items",
        description: "Quick Quote is limited to 3 items. Use full quote builder for more.",
        variant: "destructive",
      });
      return;
    }
    setItems(prev => [
      ...prev,
      {
        description: item.name,
        quantity: 1,
        unit_price: item.unit_price,
        line_total: item.unit_price,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + item.line_total, 0);
  const vatRate = company?.vat_registered ? Number(company.vat_rate) : 0;
  const vatAmount = total * (vatRate / 100);
  const grandTotal = total + vatAmount;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  const handleSend = async () => {
    if (!company || !customerName.trim()) {
      toast({
        title: "Missing info",
        description: "Please enter customer name",
        variant: "destructive",
      });
      return;
    }
    if (items.length === 0) {
      toast({
        title: "No items",
        description: "Please add at least one item",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // Create quote
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          company_id: company.id,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim() || null,
          subtotal: total,
          vat_amount: vatAmount,
          total: grandTotal,
          reference: "",
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (quoteError || !quote) throw quoteError || new Error("Failed to create quote");

      // Add items
      const itemsToInsert = items.map((item, index) => ({
        quote_id: quote.id,
        description: item.description,
        item_type: "labour",
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        sort_order: index,
      }));

      await supabase.from("quote_items").insert(itemsToInsert);

      // Reset form
      setCustomerName("");
      setCustomerEmail("");
      setItems([]);
      onOpenChange(false);

      // Navigate to success
      navigate(`/quotes/${quote.id}/sent`);
    } catch (err: any) {
      console.error("Quick quote error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to send quote",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleOpenFullBuilder = () => {
    onOpenChange(false);
    navigate("/quotes/new");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Quick Quote
          </DialogTitle>
          <DialogDescription>
            Send a quote in under 60 seconds
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Customer Name *</Label>
              <Input
                placeholder="John Smith"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Price library items */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Library className="w-3 h-3" />
              Tap to add (max 3 items)
            </Label>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : priceItems.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No items in library.{" "}
                <button
                  onClick={handleOpenFullBuilder}
                  className="text-primary underline"
                >
                  Use full builder
                </button>
              </div>
            ) : (
              <ScrollArea className="h-32">
                <div className="flex flex-wrap gap-2">
                  {priceItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addItemFromLibrary(item)}
                      disabled={items.length >= 3}
                      className="px-3 py-1.5 rounded-full border border-border bg-card hover:bg-primary/5 hover:border-primary/50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {item.name} <span className="text-muted-foreground">({formatCurrency(item.unit_price)})</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Selected items */}
          {items.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <Label className="text-xs">Quote Items</Label>
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-sm font-medium">{item.description}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{formatCurrency(item.line_total)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeItem(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total */}
          {items.length > 0 && (
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {company?.vat_registered && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT ({vatRate}%)</span>
                  <span>{formatCurrency(vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleOpenFullBuilder}
            >
              Full Builder
            </Button>
            <Button
              className="flex-1"
              onClick={handleSend}
              disabled={sending || !customerName.trim() || items.length === 0}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Quote
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}