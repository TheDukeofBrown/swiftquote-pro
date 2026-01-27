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
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Save,
  Send,
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
};

// Removed - now using brand config for default items

export default function QuoteBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { company } = useCompany();
  const { brand } = useBrand();
  const { toast } = useToast();
  
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [jobAddress, setJobAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [quoteId, setQuoteId] = useState<string | null>(id || null);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const vatRate = company?.vat_registered ? Number(company.vat_rate) : 0;
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  // Load existing quote if editing
  useEffect(() => {
    if (id) {
      loadQuote(id);
    } else if (company && brand.id) {
      // Set default items based on brand config
      const defaultItems = brand.defaultItems.slice(0, 1).map((item, index) => ({
        description: item.description,
        item_type: item.itemType === "labour" ? "labour" as const : "materials" as const,
        quantity: 1,
        unit_price: Number(company.default_labour_rate) || item.unitPrice,
        markup_percent: 0,
        line_total: Number(company.default_labour_rate) || item.unitPrice,
        sort_order: index,
      }));
      setItems(defaultItems.length > 0 ? defaultItems : [createEmptyItem(0)]);
    }
  }, [id, company, brand]);

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
      
      // Recalculate line total
      const baseTotal = item.quantity * item.unit_price;
      const markup = baseTotal * (item.markup_percent / 100);
      item.line_total = baseTotal + markup;
      
      newItems[index] = item;
      return newItems;
    });
  };

  const addItem = () => {
    setItems(prev => [...prev, createEmptyItem(prev.length)]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
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

    if (items.every(item => !item.description.trim())) {
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

      if (currentQuoteId) {
        // Update existing quote
        const { error } = await supabase
          .from("quotes")
          .update({
            customer_name: customerName.trim(),
            customer_email: customerEmail.trim() || null,
            job_address: jobAddress.trim() || null,
            notes: notes.trim() || null,
            subtotal,
            vat_amount: vatAmount,
            total,
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
            subtotal,
            vat_amount: vatAmount,
            total,
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

      // Insert items
      const validItems = items.filter(item => item.description.trim());
      if (validItems.length > 0) {
        const { error: itemsError } = await supabase.from("quote_items").insert(
          validItems.map((item, index) => ({
            quote_id: currentQuoteId!,
            description: item.description.trim(),
            item_type: item.item_type,
            quantity: item.quantity,
            unit_price: item.unit_price,
            markup_percent: item.markup_percent,
            line_total: item.line_total,
            sort_order: index,
          }))
        );
        if (itemsError) throw itemsError;
      }

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
            <h1 className="font-semibold">
              {isEditing ? "Edit Quote" : "New Quote"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveQuote(false)}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              <span className="hidden sm:inline">Save Draft</span>
            </Button>
            <Button
              size="sm"
              onClick={() => saveQuote(true)}
              disabled={saving}
            >
              <Send className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Save &</span> Send
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6 max-w-3xl">
        {/* Customer Details */}
        <Card className="animate-fade-in">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  placeholder="e.g. John Smith"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Customer Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  placeholder="customer@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobAddress">Job Address</Label>
              <Input
                id="jobAddress"
                placeholder="e.g. 123 High Street, London, SW1A 1AA"
                value={jobAddress}
                onChange={(e) => setJobAddress(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Quote Items</CardTitle>
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
                  />
                </div>
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
                <div className="grid grid-cols-3 gap-2 sm:col-span-4">
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
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Total</Label>
                    <div className="h-9 px-3 flex items-center bg-muted rounded-md font-medium text-sm">
                      {formatCurrency(item.line_total)}
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-1 flex items-end justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
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

        {/* Notes */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any additional notes or terms..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Totals */}
        <Card className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
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
      </main>
    </div>
  );
}
