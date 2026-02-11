import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Check, X, Loader2, FileText, Calendar, MapPin, 
  Phone, Mail, Building2, AlertCircle, CheckCircle2, XCircle, Clock 
} from "lucide-react";

interface QuoteItem {
  description: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface Company {
  business_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  trade: string;
  logo_url: string | null;
  vat_registered: boolean | null;
  vat_rate: number | null;
}

interface QuoteData {
  reference: string;
  customer_name: string;
  job_address: string | null;
  notes: string | null;
  subtotal: number;
  vat_amount: number;
  total: number;
  valid_until: string | null;
  created_at: string;
  status: string;
  accepted_at: string | null;
  declined_at: string | null;
  company: Company | null;
  items: QuoteItem[];
}

// Trade brand colors
const tradeColors: Record<string, string> = {
  plumber: "199 89% 48%",
  electrician: "217 91% 60%",
  plasterer: "215 16% 47%",
  builder: "215 25% 27%",
  painter: "168 76% 42%",
  roofer: "215 14% 34%",
};

const tradeNames: Record<string, string> = {
  plumber: "PlumbQuote",
  electrician: "SparkQuote",
  plasterer: "PlasterQuote",
  builder: "BuildQuote",
  painter: "PaintQuote",
  roofer: "RoofQuote",
};

export default function QuoteView() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [expiredCompanyName, setExpiredCompanyName] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    fetchQuote();
  }, [quoteId]);

  const fetchQuote = async () => {
    if (!quoteId) return;

    try {
      // Use token-based lookup (quoteId is actually the token in the URL)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quote-public?token=${quoteId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to load quote");
        setErrorCode(result.code || null);
        if (result.company_name) setExpiredCompanyName(result.company_name);
        return;
      }

      setQuote(result);
    } catch (err: any) {
      console.error("Quote fetch error:", err);
      setError("Failed to load quote");
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (action: "accept" | "decline") => {
    if (!quoteId) return;

    setResponding(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quote-public?token=${quoteId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to update quote");
        return;
      }

      setQuote((prev) =>
        prev
          ? {
              ...prev,
              status: result.status,
              accepted_at: action === "accept" ? new Date().toISOString() : prev.accepted_at,
              declined_at: action === "decline" ? new Date().toISOString() : prev.declined_at,
            }
          : null
      );
    } catch (err: any) {
      console.error("Quote response error:", err);
      setError("Failed to respond to quote");
    } finally {
      setResponding(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Expired/revoked token error - friendly message
  if (errorCode === "TOKEN_EXPIRED" || errorCode === "TOKEN_REVOKED") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">
              {errorCode === "TOKEN_EXPIRED" ? "Quote Link Expired" : "Quote Link Revoked"}
            </h1>
            <p className="text-muted-foreground mb-4">
              {errorCode === "TOKEN_EXPIRED"
                ? `This quote link has expired. Please contact ${expiredCompanyName || "the business"} to request a new link.`
                : "This quote link is no longer valid. Please contact the business for a new link."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Quote Not Available</h1>
            <p className="text-muted-foreground">{error || "This quote could not be found."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const brandHue = quote.company?.trade ? tradeColors[quote.company.trade] : "215 16% 47%";
  const brandName = quote.company?.trade ? tradeNames[quote.company.trade] : "WorkQuote";
  const isResolved = quote.status === "accepted" || quote.status === "declined";

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header with branding */}
        <div
          className="rounded-xl p-6 text-white"
          style={{ backgroundColor: `hsl(${brandHue})` }}
        >
          <div className="flex items-center gap-4">
            {quote.company?.logo_url ? (
              <div className="w-16 h-16 rounded-lg bg-white/20 p-2 flex items-center justify-center">
                <img
                  src={quote.company.logo_url}
                  alt={quote.company.business_name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-white/20 flex items-center justify-center">
                <Building2 className="w-8 h-8" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{quote.company?.business_name || "Quote"}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-white/80 text-sm mt-1">
                {quote.company?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {quote.company.phone}
                  </span>
                )}
                {quote.company?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {quote.company.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quote info */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="font-mono text-lg font-semibold">{quote.reference}</span>
              </div>
              <Badge
                variant={
                  quote.status === "accepted"
                    ? "default"
                    : quote.status === "declined"
                    ? "destructive"
                    : "secondary"
                }
                className="capitalize"
              >
                {quote.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Prepared for</p>
                <p className="font-medium">{quote.customer_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(quote.created_at)}
                </p>
              </div>
              {quote.job_address && (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground">Job Address</p>
                  <p className="font-medium flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {quote.job_address}
                  </p>
                </div>
              )}
              {quote.valid_until && (
                <div>
                  <p className="text-muted-foreground">Valid Until</p>
                  <p className="font-medium">{formatDate(quote.valid_until)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="grid grid-cols-12 text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-2 border-b">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              {quote.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 py-2 text-sm border-b border-border/50">
                  <div className="col-span-6">{item.description}</div>
                  <div className="col-span-2 text-center text-muted-foreground">{item.quantity}</div>
                  <div className="col-span-2 text-right text-muted-foreground">
                    {formatCurrency(item.unit_price)}
                  </div>
                  <div className="col-span-2 text-right font-medium">
                    {formatCurrency(item.line_total)}
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="space-y-2 max-w-xs ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              {quote.vat_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    VAT ({quote.company?.vat_rate || 20}%)
                  </span>
                  <span>{formatCurrency(quote.vat_amount)}</span>
                </div>
              )}
              <div
                className="flex justify-between font-bold text-lg pt-2 border-t"
                style={{ color: `hsl(${brandHue})` }}
              >
                <span>Total</span>
                <span>{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Notes & Terms</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Response status or buttons */}
        {isResolved ? (
          <Card
            className={
              quote.status === "accepted"
                ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                : "border-destructive bg-red-50 dark:bg-red-950/20"
            }
          >
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center text-center gap-4">
                {quote.status === "accepted" ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-fade-in">
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-xl text-green-700 dark:text-green-400">
                        Quote Accepted! 🎉
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Thank you for accepting this quote. {quote.company?.business_name} has been notified and will be in touch shortly.
                      </p>
                      <p className="text-sm text-muted-foreground mt-3">
                        Accepted on {formatDate(quote.accepted_at!)}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                      <XCircle className="w-10 h-10 text-destructive" />
                    </div>
                    <div>
                      <p className="font-bold text-xl text-destructive">Quote Declined</p>
                      <p className="text-muted-foreground mt-1">
                        You declined this quote on {formatDate(quote.declined_at!)}. 
                        If you change your mind, please contact {quote.company?.business_name}.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-dashed border-primary/30">
            <CardContent className="pt-6 pb-6">
              <p className="text-center text-muted-foreground mb-4">
                Ready to proceed with this quote?
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="flex-1 bg-green-600 hover:bg-green-700 h-14 text-lg"
                  onClick={() => handleResponse("accept")}
                  disabled={responding}
                >
                  {responding ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Check className="w-5 h-5 mr-2" />
                  )}
                  Accept Quote
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground h-14"
                  onClick={() => handleResponse("decline")}
                  disabled={responding}
                >
                  {responding ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <X className="w-5 h-5 mr-2" />
                  )}
                  Decline
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-4">
                By accepting, you agree to proceed with the work as quoted
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground py-4">
          {brandName} — Powered by WorkQuote
        </p>
      </div>
    </div>
  );
}
