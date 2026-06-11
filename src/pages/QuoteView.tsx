import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  X,
  Loader2,
  FileText,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Building2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  Landmark,
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
  stripe_connect_status?: string | null;
  bank_sort_code?: string | null;
  bank_account_number?: string | null;
}

interface StagedPayment {
  label: string;
  percent: number;
  amount: number;
}

interface QuotePayment {
  id: string;
  stage_label: string;
  amount: number;
  status: "pending" | "paid";
  paid_at: string | null;
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
  payment_mode: "completion" | "booking" | "staged" | "account";
  payment_terms_days: number | null;
  booking_payment_type: "percent" | "fixed" | null;
  booking_payment_value: number | null;
  booking_payment_amount: number | null;
  staged_payments: StagedPayment[] | null;
  company: Company | null;
  items: QuoteItem[];
  payments: QuotePayment[];
}

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
  const [searchParams] = useSearchParams();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [expiredCompanyName, setExpiredCompanyName] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [bankFallback, setBankFallback] = useState<{ amount: number; label: string } | null>(null);

  const justPaid = searchParams.get("paid") === "1";

  useEffect(() => {
    fetchQuote();
  }, [quoteId]);

  const fetchQuote = async () => {
    if (!quoteId) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quote-public?token=${quoteId}`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Failed to load quote");
        setErrorCode(result.code || null);
        if (result.company_name) setExpiredCompanyName(result.company_name);
        return;
      }
      setQuote(result);
    } catch (err) {
      console.error("Quote fetch error:", err);
      setError("Failed to load quote");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount || 0);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const markAcceptedNoPayment = async () => {
    if (!quoteId) return;
    setResponding(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quote-public?token=${quoteId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "accept" }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Failed to update quote");
        return;
      }
      setQuote((prev) =>
        prev
          ? { ...prev, status: "accepted", accepted_at: new Date().toISOString() }
          : null
      );
    } finally {
      setResponding(false);
    }
  };

  const handleDecline = async () => {
    if (!quoteId) return;
    setResponding(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quote-public?token=${quoteId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "decline" }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Failed to update quote");
        return;
      }
      setQuote((prev) =>
        prev
          ? { ...prev, status: "declined", declined_at: new Date().toISOString() }
          : null
      );
    } finally {
      setResponding(false);
    }
  };

  const startStripeCheckout = async (stage_label?: string, amount?: number) => {
    if (!quoteId) return;
    setResponding(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ token: quoteId, stage_label, amount }),
        }
      );
      const result = await res.json();
      if (!res.ok || !result.url) {
        throw new Error(result.error || "Could not start checkout");
      }
      window.location.href = result.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Checkout failed";
      setError(msg);
      setResponding(false);
    }
  };

  const acceptBookingPayment = async () => {
    if (!quote) return;
    const stripeConnected = quote.company?.stripe_connect_status === "active";
    if (stripeConnected) {
      await startStripeCheckout(
        "Booking payment",
        Number(quote.booking_payment_amount || 0)
      );
    } else {
      // Fallback: accept, show bank details
      await markAcceptedNoPayment();
      setBankFallback({
        amount: Number(quote.booking_payment_amount || 0),
        label: "booking payment",
      });
    }
  };

  const acceptFirstStaged = async () => {
    if (!quote) return;
    const stripeConnected = quote.company?.stripe_connect_status === "active";
    const first = (quote.staged_payments || [])[0];
    if (!first) return;
    if (stripeConnected) {
      await startStripeCheckout(first.label, Number(first.amount));
    } else {
      await markAcceptedNoPayment();
      setBankFallback({ amount: Number(first.amount), label: first.label });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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

  if (error && !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Quote Not Available</h1>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quote) return null;

  const brandHue = quote.company?.trade ? tradeColors[quote.company.trade] : "215 16% 47%";
  const brandName = quote.company?.trade ? tradeNames[quote.company.trade] : "QuoteReady";
  const isResolved = quote.status === "accepted" || quote.status === "declined";
  const stripeConnected = quote.company?.stripe_connect_status === "active";

  const bookingAmount = Number(quote.booking_payment_amount || 0);
  const remainder = Math.max(quote.total - bookingAmount, 0);

  // Customer-facing payment text
  const renderPaymentTerms = () => {
    if (quote.payment_mode === "completion") {
      return (
        <p className="text-sm text-muted-foreground">
          Payment due on completion. Invoice will be sent on the day work finishes.
        </p>
      );
    }
    if (quote.payment_mode === "booking") {
      return (
        <p className="text-sm">
          To secure your booking and cover materials, a payment of{" "}
          <strong>{formatCurrency(bookingAmount)}</strong> is due on acceptance.
          Balance of <strong>{formatCurrency(remainder)}</strong> due on completion.
        </p>
      );
    }
    if (quote.payment_mode === "staged" && quote.staged_payments?.length) {
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium">Payment plan</div>
          <div className="rounded-md border border-border overflow-hidden">
            {quote.staged_payments.map((s, i) => {
              const matched = quote.payments.find(
                (p) => p.stage_label === s.label && p.status === "paid"
              );
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-2 text-sm ${
                    i > 0 ? "border-t border-border" : ""
                  } ${matched ? "bg-green-50 dark:bg-green-950/20" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    {matched ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span>{s.label}</span>
                    {matched && (
                      <Badge variant="outline" className="text-xs">Paid</Badge>
                    )}
                  </div>
                  <div className="font-medium">{formatCurrency(Number(s.amount))}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    if (quote.payment_mode === "account") {
      return (
        <p className="text-sm">
          Invoice terms: <strong>{quote.payment_terms_days || 14} days</strong> from
          completion.
        </p>
      );
    }
    return null;
  };

  // Accept action depends on mode
  const renderAcceptArea = () => {
    if (isResolved) return null;
    if (quote.payment_mode === "completion" || quote.payment_mode === "account") {
      return (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            className="flex-1 bg-green-600 hover:bg-green-700 h-14 text-lg"
            onClick={markAcceptedNoPayment}
            disabled={responding}
          >
            {responding ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Check className="w-5 h-5 mr-2" />
            )}
            Accept quote
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground h-14"
            onClick={handleDecline}
            disabled={responding}
          >
            <X className="w-5 h-5 mr-2" />
            Decline
          </Button>
        </div>
      );
    }
    if (quote.payment_mode === "booking") {
      return (
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full h-14 text-base"
            style={{ backgroundColor: `hsl(${brandHue})` }}
            onClick={acceptBookingPayment}
            disabled={responding}
          >
            {responding ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Wallet className="w-5 h-5 mr-2" />
            )}
            Accept &amp; pay {formatCurrency(bookingAmount)}
          </Button>
          <Button
            variant="outline"
            className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleDecline}
            disabled={responding}
          >
            <X className="w-4 h-4 mr-2" />
            Decline
          </Button>
          {!stripeConnected && (
            <p className="text-xs text-center text-muted-foreground">
              Payment by bank transfer — details shown after acceptance.
            </p>
          )}
        </div>
      );
    }
    if (quote.payment_mode === "staged") {
      const first = (quote.staged_payments || [])[0];
      return (
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full h-14 text-base"
            style={{ backgroundColor: `hsl(${brandHue})` }}
            onClick={acceptFirstStaged}
            disabled={responding || !first}
          >
            {responding ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Wallet className="w-5 h-5 mr-2" />
            )}
            Accept &amp; pay {first ? formatCurrency(Number(first.amount)) : ""} ({first?.label})
          </Button>
          <Button
            variant="outline"
            className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleDecline}
            disabled={responding}
          >
            <X className="w-4 h-4 mr-2" />
            Decline
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {justPaid && (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-300">
                  Payment received
                </p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Thanks — {quote.company?.business_name} has been notified.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
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

        {/* Payment terms / plan */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              Payment
            </h3>
            {renderPaymentTerms()}
          </CardContent>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Notes &amp; Terms</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Bank fallback after acceptance */}
        {bankFallback && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-6 space-y-2">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-700" />
                <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                  Pay {formatCurrency(bankFallback.amount)} by bank transfer
                </h3>
              </div>
              <p className="text-sm text-amber-900 dark:text-amber-200">
                Your {bankFallback.label} of{" "}
                <strong>{formatCurrency(bankFallback.amount)}</strong> is due before work
                starts. Please transfer to:
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm bg-background rounded-md p-3 border border-amber-200">
                <div>
                  <div className="text-xs text-muted-foreground">Sort code</div>
                  <div className="font-mono font-semibold">
                    {quote.company?.bank_sort_code || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Account number</div>
                  <div className="font-mono font-semibold">
                    {quote.company?.bank_account_number || "—"}
                  </div>
                </div>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Use reference: <strong>{quote.reference}</strong>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Response status or accept buttons */}
        {isResolved && !bankFallback ? (
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
                        Quote Accepted
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Thank you. {quote.company?.business_name} has been notified and
                        will be in touch shortly.
                      </p>
                      {quote.accepted_at && (
                        <p className="text-sm text-muted-foreground mt-3">
                          Accepted on {formatDate(quote.accepted_at)}
                        </p>
                      )}
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
                        You declined this quote
                        {quote.declined_at ? ` on ${formatDate(quote.declined_at)}` : ""}.
                        If you change your mind, please contact{" "}
                        {quote.company?.business_name}.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : !isResolved ? (
          <Card className="border-2 border-dashed border-primary/30">
            <CardContent className="pt-6 pb-6 space-y-4">
              {renderAcceptArea()}
              <p className="text-xs text-center text-muted-foreground">
                By accepting, you agree to proceed with the work as quoted.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <p className="text-center text-xs text-muted-foreground py-4">
          {brandName} — Powered by QuoteReady
        </p>
      </div>
    </div>
  );
}
