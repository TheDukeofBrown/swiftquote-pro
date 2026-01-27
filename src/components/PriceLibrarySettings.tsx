import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Library } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type PriceItemType = Database["public"]["Enums"]["price_item_type"];
type PriceItemUnit = Database["public"]["Enums"]["price_item_unit"];
type PriceItem = Database["public"]["Tables"]["price_items"]["Row"];

const typeLabels: Record<PriceItemType, string> = {
  labour: "Labour",
  material: "Material",
  service: "Service",
  uplift: "Uplift %",
};

const unitLabels: Record<PriceItemUnit, string> = {
  each: "Fixed / Each",
  hour: "Per Hour",
  day: "Per Day",
  metre: "Per Sqm",
  percent: "Percentage",
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

export function PriceLibrarySettings() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PriceItemType>("labour");
  const [unit, setUnit] = useState<PriceItemUnit>("each");
  const [unitPrice, setUnitPrice] = useState("");

  useEffect(() => {
    if (company) {
      fetchItems();
    }
  }, [company]);

  const fetchItems = async () => {
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

  const resetForm = () => {
    setName("");
    setDescription("");
    setType("labour");
    setUnit("each");
    setUnitPrice("");
    setEditingItem(null);
  };

  const openEditDialog = (item: PriceItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || "");
    setType(item.type);
    setUnit(item.unit);
    setUnitPrice(String(item.unit_price));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!company || !name.trim() || !unitPrice) return;

    setSaving(true);
    try {
      const itemData = {
        company_id: company.id,
        name: name.trim(),
        description: description.trim() || null,
        type,
        unit: type === "uplift" ? "percent" as PriceItemUnit : unit,
        unit_price: parseFloat(unitPrice) || 0,
        sort_order: editingItem ? editingItem.sort_order : items.length,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("price_items")
          .update(itemData)
          .eq("id", editingItem.id);

        if (error) throw error;

        toast({
          title: "Item updated",
          description: `"${name}" has been updated.`,
        });
      } else {
        const { error } = await supabase
          .from("price_items")
          .insert(itemData);

        if (error) throw error;

        toast({
          title: "Item added",
          description: `"${name}" has been added to your price library.`,
        });
      }

      await fetchItems();
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save item",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: PriceItem) => {
    setDeleting(item.id);
    try {
      const { error } = await supabase
        .from("price_items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "Item deleted",
        description: `"${item.name}" has been removed.`,
      });
      await fetchItems();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete item",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Library className="w-5 h-5" />
                Price Library
              </CardTitle>
              <CardDescription>
                Add your default rates and services to quote faster
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Edit Item" : "Add Price Item"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingItem 
                      ? "Update the details for this price item" 
                      : "Add a reusable item to your price library"}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Labour Rate, Boiler Service"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input
                      id="description"
                      placeholder="Brief description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={type} onValueChange={(v) => setType(v as PriceItemType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(typeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {type !== "uplift" && (
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Select value={unit} onValueChange={(v) => setUnit(v as PriceItemUnit)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(unitLabels)
                              .filter(([k]) => k !== "percent")
                              .map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">
                      {type === "uplift" ? "Percentage (%)" : "Price (£)"}
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step={type === "uplift" ? "1" : "0.01"}
                      placeholder={type === "uplift" ? "e.g. 10" : "e.g. 45.00"}
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving || !name.trim() || !unitPrice}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {editingItem ? "Save Changes" : "Add Item"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
              <Library className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">No items in your price library</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your common rates and services to quote faster
              </p>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Item
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{item.name}</p>
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs shrink-0", getTypeColor(item.type))}
                      >
                        {typeLabels[item.type]}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <div className="text-right">
                      <p className="font-semibold">
                        {item.unit === "percent" 
                          ? `${item.unit_price}%` 
                          : formatCurrency(Number(item.unit_price))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {unitLabels[item.unit]}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(item)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item)}
                      disabled={deleting === item.id}
                      className="text-destructive hover:text-destructive"
                    >
                      {deleting === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
