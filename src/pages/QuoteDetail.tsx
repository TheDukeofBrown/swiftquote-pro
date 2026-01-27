import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Edit,
  Send,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Mail,
  MapPin,
  Loader2,
  Trash2,
  FileText,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type Quote = Database["public"]["Tables"]["quotes"]["Row"];
type QuoteItem = Database["public"]["Tables"]["quote_items"]["Row"];
type QuoteStatus = Database["public"]["Enums"]["quote_status"];

const statusConfig: Record<QuoteStatus, { label: string; class: string; icon: typeof Clock }> = {
  draft: { label: "Draft", class: "status-draft", icon: Clock },
  sent: { label: "Sent", class: "status-sent", icon: Send },
  viewed: { label: "Viewed", class: "status-viewed", icon: Eye },
  accepted: { label: "Accepted", class: "status-accepted", icon: CheckCircle2 },
  declined: { label: "Declined", class: "status-declined", icon: XCircle },
};

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company } = useCompany();
  const { isActive, refetch: refetchSubscription } = useSubscription();
  const { toast } = useToast();
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchQuote();
    }
  }, [id]);

  const fetchQuote = async () => {
    if (!id) return;
    
    setLoading(true);
    const { data: quoteData, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", id)
      .single();

    if (quoteError || !quoteData) {
      toast({ title: "Error", description: "Quote not found", variant: "destructive" });
      navigate("/dashboard");
      return;
    }

    setQuote(quoteData);

    const { data: itemsData } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", id)
      .order("sort_order");

    setItems(itemsData || []);
    setLoading(false);
  };

  const updateStatus = async (newStatus: QuoteStatus) => {
    if (!quote) return;
    
    setActionLoading(newStatus);
    const updates: Partial<Quote> = { status: newStatus };
    
    if (newStatus === "sent") updates.sent_at = new Date().toISOString();
    if (newStatus === "accepted") updates.accepted_at = new Date().toISOString();
    if (newStatus === "declined") updates.declined_at = new Date().toISOString();

    const { error } = await supabase
      .from("quotes")
      .update(updates)
      .eq("id", quote.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } else {
      setQuote({ ...quote, ...updates });
      toast({ title: "Status updated", description: `Quote marked as ${newStatus}` });
    }
    setActionLoading(null);
  };

  const deleteQuote = async () => {
    if (!quote) return;
    
    setActionLoading("delete");
    const { error } = await supabase.from("quotes").delete().eq("id", quote.id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete quote", variant: "destructive" });
      setActionLoading(null);
    } else {
      toast({ title: "Quote deleted" });
      navigate("/dashboard");
    }
  };

  const downloadPdf = async () => {
    if (!quote) return;
    
    if (!isActive) {
      toast({
        title: "Subscription required",
        description: "Please subscribe to download PDFs.",
        variant: "destructive",
      });
      return;
    }

    setPdfLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("generate-pdf", {
        body: { quoteId: quote.id },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate PDF");
      }

      // The response data is already the PDF blob
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quote.reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Refresh usage count
      await refetchSubscription();
      
      toast({
        title: "PDF downloaded",
        description: `${quote.reference}.pdf saved to your device`,
      });
    } catch (error: any) {
      console.error("PDF download error:", error);
      toast({
        title: "Download failed",
        description: error.message || "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPdfLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="bg-card border-b border-border h-14" />
        <main className="container py-6 max-w-3xl space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!quote) return null;

  const config = statusConfig[quote.status];
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link to="/quotes">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold">{quote.reference}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPdf}
              disabled={pdfLoading}
            >
              {pdfLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-1" />
              )}
              <span className="hidden sm:inline">Download PDF</span>
            </Button>
            {quote.status === "draft" && (
              <Link to={`/quotes/${quote.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </Link>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Quote?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the quote.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteQuote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {actionLoading === "delete" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="container py-6 max-w-3xl space-y-6">
        {/* Status and Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`${config.class} text-sm px-3 py-1`}>
                  <StatusIcon className="w-4 h-4 mr-1" />
                  {config.label}
                </Badge>
                <span className="text-muted-foreground text-sm">
                  Created {formatDate(quote.created_at)}
                </span>
              </div>
              <div className="flex gap-2">
                {quote.status === "draft" && (
                  <Button
                    size="sm"
                    onClick={() => updateStatus("sent")}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === "sent" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-1" />
                    )}
                    Mark as Sent
                  </Button>
                )}
                {quote.status === "sent" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus("viewed")}
                      disabled={!!actionLoading}
                    >
                      <Eye className="w-4 h-4 mr-1" /> Viewed
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateStatus("accepted")}
                      disabled={!!actionLoading}
                      className="bg-success hover:bg-success/90"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Accepted
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus("declined")}
                      disabled={!!actionLoading}
                      className="text-destructive"
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Declined
                    </Button>
                  </>
                )}
                {quote.status === "viewed" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => updateStatus("accepted")}
                      disabled={!!actionLoading}
                      className="bg-success hover:bg-success/90"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Accepted
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus("declined")}
                      disabled={!!actionLoading}
                      className="text-destructive"
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Declined
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium text-lg">{quote.customer_name}</p>
            {quote.customer_email && (
              <p className="text-muted-foreground flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {quote.customer_email}
              </p>
            )}
            {quote.job_address && (
              <p className="text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {quote.job_address}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quote Items */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-start py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} × {formatCurrency(Number(item.unit_price))}
                      {Number(item.markup_percent) > 0 && (
                        <span> (+{item.markup_percent}% markup)</span>
                      )}
                    </p>
                  </div>
                  <p className="font-medium">{formatCurrency(Number(item.line_total))}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(Number(quote.subtotal))}</span>
              </div>
              {Number(quote.vat_amount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT</span>
                  <span>{formatCurrency(Number(quote.vat_amount))}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2">
                <span>Total</span>
                <span>{formatCurrency(Number(quote.total))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
