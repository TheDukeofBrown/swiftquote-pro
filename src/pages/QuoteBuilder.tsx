import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { useBrand } from "@/contexts/BrandContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { PriceLibraryPanel } from "@/components/PriceLibraryPanel";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Save,
  Send,
  ChevronDown,
  Zap,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type QuoteItem = {
  id?: string;
  description: string;
  item_type: "labour" | "materials";
  quantity: number;
  unit_price: number;
  markup_percent: number;
  line_total: number;
  sort_order: number;
  is_uplift?: boolean;
  uplift_percent?: number;
};

export default function QuoteBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { company } = useCompany();
  const { brand } = useBrand();
  const { toast } = useToast();
  
  const isEditing = !!id;
  const [isQuickMode, setIsQuickMode] = useState(!isEditing);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [jobAddress, setJobAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [quoteId, setQuoteId] = useState<string | null>(id || null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate totals
  const regularItems = items.filter(item => !item.is_uplift);
  const upliftItems = items.filter(item => item.is_uplift);
  
  const subtotal = regularItems.reduce((sum, item) => sum + item.line_total, 0);
  
  // Calculate uplift amount
  const upliftAmount = upliftItems.reduce((sum, item) => {
    return sum + (subtotal * (item.uplift_percent || 0) / 100);
  }, 0);
  
  const subtotalWithUplift = subtotal + upliftAmount;
  const vatRate = company?.vat_registered ? Number(company.vat_rate) : 0;
  const vatAmount = subtotalWithUplift * (vatRate / 100);
  const total = subtotalWithUplift + vatAmount;

  // Load existing quote if editing
  useEffect(() => {
    if (id) {
      loadQuote(id);
      setIsQuickMode(false);
    } else {
      // Start with empty item for new quotes
      setItems([createEmptyItem(0)]);
    }
  }, [id, company]);

  const loadQuote = async (quoteId: string) => {
    setLoading(true);
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      toast({ title: "Error", description: "Quote not found", variant: "destructive" });
      navigate("/dashboard");
      return;
    }

    setCustomerName(quote.customer_name);
    setCustomerEmail(quote.customer_email || "");
    setJobAddress(quote.job_address || "");
    setNotes(quote.notes || "");

    const { data: quoteItems } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("sort_order");

    if (quoteItems && quoteItems.length > 0) {
      setItems(quoteItems.map(item => ({
        id: item.id,
        description: item.description,
        item_type: item.item_type as "labour" | "materials",
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        markup_percent: Number(item.markup_percent) || 0,
        line_total: Number(item.line_total),
        sort_order: item.sort_order,
      })));
    } else {
      setItems([createEmptyItem(0)]);
    }

    setLoading(false);
  };

  const createEmptyItem = (sortOrder: number): QuoteItem => ({
    description: "",
    item_type: "labour",
    quantity: 1,
    unit_price: Number(company?.default_labour_rate) || 45,
    markup_percent: 0,
    line_total: Number(company?.default_labour_rate) || 45,
    sort_order: sortOrder,
  });

  const updateItem = (index: number, updates: Partial<QuoteItem>) => {
    setItems(prev => {
      const newItems = [...prev];
      const item = { ...newItems[index], ...updates };
      
      // Recalculate line total (skip for uplift items)
      if (!item.is_uplift) {
        const baseTotal = item.quantity * item.unit_price;
        const markup = baseTotal * (item.markup_percent / 100);
        item.line_total = baseTotal + markup;
      }
      
      newItems[index] = item;
      return newItems;
    });
  };

  const addItem = () => {
    setItems(prev => [...prev, createEmptyItem(prev.length)]);
  };

  const addFromLibrary = (libraryItem: {
    description: string;
    item_type: "labour" | "materials";
    quantity: number;
    unit_price: number;
    is_uplift?: boolean;
    uplift_percent?: number;
  }) => {
    const newItem: QuoteItem = {
      description: libraryItem.description,
      item_type: libraryItem.item_type,
      quantity: libraryItem.quantity,
      unit_price: libraryItem.unit_price,
      markup_percent: 0,
      line_total: libraryItem.quantity * libraryItem.unit_price,
      sort_order: items.length,
      is_uplift: libraryItem.is_uplift,
      uplift_percent: libraryItem.uplift_percent,
    };
    setItems(prev => [...prev, newItem]);
    toast({
      title: "Item added",
      description: libraryItem.description,
    });
  };

  const removeItem = (index: number) => {
    if (items.length === 1 && !items[0].is_uplift) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const saveQuote = async (sendAfterSave = false) => {
    if (!company || !customerName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a customer name",
        variant: "destructive",
      });
      return;
    }

    const validItems = items.filter(item => item.description.trim() || item.is_uplift);
    if (validItems.length === 0) {
      toast({
        title: "Missing items",
        description: "Please add at least one line item",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      let currentQuoteId = quoteId;

      // Prepare totals including uplift
      const finalSubtotal = subtotalWithUplift;
      const finalVat = vatAmount;
      const finalTotal = total;

      if (currentQuoteId) {
        // Update existing quote
        const { error } = await supabase
          .from("quotes")
          .update({
            customer_name: customerName.trim(),
            customer_email: customerEmail.trim() || null,
            job_address: jobAddress.trim() || null,
            notes: notes.trim() || null,
            subtotal: finalSubtotal,
            vat_amount: finalVat,
            total: finalTotal,
            status: sendAfterSave ? "sent" : "draft",
            sent_at: sendAfterSave ? new Date().toISOString() : null,
          })
          .eq("id", currentQuoteId);

        if (error) throw error;

        // Delete existing items and insert new ones
        await supabase.from("quote_items").delete().eq("quote_id", currentQuoteId);
      } else {
        // Create new quote
        const { data: newQuote, error } = await supabase
          .from("quotes")
          .insert({
            company_id: company.id,
            customer_name: customerName.trim(),
            customer_email: customerEmail.trim() || null,
            job_address: jobAddress.trim() || null,
            notes: notes.trim() || null,
            subtotal: finalSubtotal,
            vat_amount: finalVat,
            total: finalTotal,
            reference: "", // Will be auto-generated by trigger
            status: sendAfterSave ? "sent" : "draft",
            sent_at: sendAfterSave ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (error || !newQuote) throw error || new Error("Failed to create quote");
        currentQuoteId = newQuote.id;
        setQuoteId(currentQuoteId);
      }

      // Insert items (convert uplift items to regular line items with calculated amount)
      const itemsToInsert = validItems.map((item, index) => {
        if (item.is_uplift) {
          const calculatedAmount = subtotal * (item.uplift_percent || 0) / 100;
          return {
            quote_id: currentQuoteId!,
            description: item.description,
            item_type: "labour",
            quantity: 1,
            unit_price: calculatedAmount,
            markup_percent: 0,
            line_total: calculatedAmount,
            sort_order: index,
          };
        }
        return {
          quote_id: currentQuoteId!,
          description: item.description.trim(),
          item_type: item.item_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          markup_percent: item.markup_percent,
          line_total: item.line_total,
          sort_order: index,
        };
      });

      const { error: itemsError } = await supabase.from("quote_items").insert(itemsToInsert);
      if (itemsError) throw itemsError;

      toast({
        title: sendAfterSave ? "Quote sent!" : "Quote saved!",
        description: sendAfterSave 
          ? "Your quote has been marked as sent"
          : "Your quote has been saved as a draft",
      });

      if (sendAfterSave) {
        navigate(`/quotes/${currentQuoteId}`);
      }
    } catch (err: any) {
      console.error("Save error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save quote",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <div>
              <h1 className="font-semibold text-sm sm:text-base">
                {isEditing ? "Edit Quote" : "New Quote"}
              </h1>
              {isQuickMode && (
                <span className="text-xs text-primary flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Quick mode
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PriceLibraryPanel onAddItem={addFromLibrary} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveQuote(false)}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              <span className="hidden sm:inline">Save</span>
            </Button>
            <Button
              size="sm"
              onClick={() => saveQuote(true)}
              disabled={saving}
            >
              <Send className="w-4 h-4 mr-1" />
              Send
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-4 max-w-3xl">
        {/* Customer Details - Compact */}
        <Card className="animate-fade-in">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="customerName" className="text-xs">Customer Name *</Label>
                <Input
                  id="customerName"
                  placeholder="e.g. John Smith"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="customerEmail" className="text-xs">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  placeholder="customer@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
            </div>
            
            {/* Collapsible advanced fields */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                  <span>{showAdvanced ? "Hide" : "Show"} address & notes</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="jobAddress" className="text-xs">Job Address</Label>
                  <Input
                    id="jobAddress"
                    placeholder="e.g. 123 High Street, London, SW1A 1AA"
                    value={jobAddress}
                    onChange={(e) => setJobAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="notes" className="text-xs">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes or terms..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="pb-3 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Items</CardTitle>
              <PriceLibraryPanel onAddItem={addFromLibrary} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="quote-item-row grid-cols-1 sm:grid-cols-12">
                <div className="sm:col-span-5 space-y-1">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Input
                    placeholder="What's the work?"
                    value={item.description}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                    disabled={item.is_uplift}
                  />
                </div>
                {!item.is_uplift && (
                  <>
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">Type</Label>
                      <Select
                        value={item.item_type}
                        onValueChange={(v) => updateItem(index, { item_type: v as "labour" | "materials" })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="labour">Labour</SelectItem>
                          <SelectItem value="materials">Materials</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-[1fr_1.5fr_1.5fr] gap-2 sm:col-span-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Qty</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">£/unit</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="min-w-[100px]"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Total</Label>
                        <div className="h-9 px-3 flex items-center bg-muted rounded-md font-medium text-sm whitespace-nowrap">
                          {formatCurrency(item.line_total)}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {item.is_uplift && (
                  <div className="sm:col-span-6 flex items-end">
                    <div className="h-9 px-3 flex items-center bg-purple-100 text-purple-800 rounded-md font-medium text-sm">
                      +{item.uplift_percent}% on subtotal = {formatCurrency(subtotal * (item.uplift_percent || 0) / 100)}
                    </div>
                  </div>
                )}
                <div className="sm:col-span-1 flex items-end justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1 && !item.is_uplift}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem} className="mt-2">
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </Button>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <CardContent className="pt-4 pb-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {upliftAmount > 0 && (
                <div className="flex justify-between text-sm text-purple-700">
                  <span>Uplift</span>
                  <span>+{formatCurrency(upliftAmount)}</span>
                </div>
              )}
              {company?.vat_registered && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT ({vatRate}%)</span>
                  <span>{formatCurrency(vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Send Button - Mobile */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border">
          <Button
            size="lg"
            className="w-full"
            onClick={() => saveQuote(true)}
            disabled={saving || !customerName.trim()}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send Quote ({formatCurrency(total)})
          </Button>
        </div>
        
        {/* Spacer for fixed bottom button on mobile */}
        <div className="h-20 sm:hidden" />
      </main>
    </div>
  );
}
