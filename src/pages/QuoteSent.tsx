import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BrandLogo from "@/components/BrandLogo";
import { CheckCircle2, Plus, Eye, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function QuoteSent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company } = useCompany();
  const { toast } = useToast();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchQuote();
    }
  }, [id]);

  const fetchQuote = async () => {
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      navigate("/dashboard");
      return;
    }

    setQuote(data);
    setLoading(false);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  const customerViewUrl = `${window.location.origin}/q/${id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(customerViewUrl);
      toast({
        title: "Link copied!",
        description: "Share this link with your customer",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container flex items-center justify-center h-16">
          <Link to="/dashboard">
            <BrandLogo size="sm" />
          </Link>
        </div>
      </header>

      <main className="container py-12 max-w-lg">
        <Card className="text-center">
          <CardContent className="pt-8 pb-8 space-y-6">
            {/* Success animation */}
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto animate-fade-in">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>

            <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <h1 className="text-2xl font-bold text-foreground">Quote Sent!</h1>
              <p className="text-muted-foreground">
                {quote?.reference} to {quote?.customer_name}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(Number(quote?.total || 0))}
              </p>
              {quote?.customer_email && (
                <p className="text-sm text-muted-foreground mt-1">
                  Sent to {quote.customer_email}
                </p>
              )}
            </div>

            {/* Customer link */}
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <p className="text-sm text-muted-foreground">Share with your customer:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={customerViewUrl}
                  className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md truncate"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <Link to={`/quotes/${id}`} className="flex-1">
                <Button variant="outline" className="w-full">
                  <Eye className="w-4 h-4 mr-2" />
                  View Quote
                </Button>
              </Link>
              <Link to="/quotes/new" className="flex-1">
                <Button className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Another
                </Button>
              </Link>
            </div>

            <Link to="/dashboard">
              <Button variant="link" className="text-muted-foreground">
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}