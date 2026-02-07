import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Send, FileText, Mail } from "lucide-react";
import { format } from "date-fns";

interface QuoteDetail {
  id: string;
  reference: string;
  company_id: string;
  customer_name: string;
  customer_email: string | null;
  job_address: string | null;
  notes: string | null;
  status: string;
  subtotal: number;
  vat_amount: number;
  total: number;
  created_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
}

interface QuoteEvent {
  id: string;
  event_type: string;
  payload: unknown;
  created_at: string;
}

interface EmailEvent {
  id: string;
  to_email: string;
  subject: string;
  status: string;
  error: string | null;
  provider_message_id: string | null;
  created_at: string;
}

interface Company {
  id: string;
  business_name: string;
  trade: string;
}

export default function AdminQuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [quoteEvents, setQuoteEvents] = useState<QuoteEvent[]>([]);
  const [emailEvents, setEmailEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch quote
        const { data: quoteData, error: quoteError } = await supabase
          .from("quotes")
          .select("*")
          .eq("id", id)
          .single();

        if (quoteError) throw quoteError;
        setQuote(quoteData);

        // Fetch company
        if (quoteData?.company_id) {
          const { data: companyData } = await supabase
            .from("companies")
            .select("id, business_name, trade")
            .eq("id", quoteData.company_id)
            .single();
          setCompany(companyData);
        }

        // Fetch quote events
        const { data: eventsData } = await supabase
          .from("quote_events")
          .select("*")
          .eq("quote_id", id)
          .order("created_at", { ascending: false });
        setQuoteEvents(eventsData || []);

        // Fetch email events
        const { data: emailData } = await supabase
          .from("email_events")
          .select("*")
          .eq("quote_id", id)
          .order("created_at", { ascending: false });
        setEmailEvents(emailData || []);
      } catch (err) {
        console.error("Failed to fetch quote:", err);
        toast.error("Failed to load quote details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleResendQuote = async () => {
    if (!id) return;
    setResending(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("send-quote", {
        body: { quoteId: id },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success("Quote resent successfully");
      
      // Refresh events
      const { data: eventsData } = await supabase
        .from("quote_events")
        .select("*")
        .eq("quote_id", id)
        .order("created_at", { ascending: false });
      setQuoteEvents(eventsData || []);

      const { data: emailData } = await supabase
        .from("email_events")
        .select("*")
        .eq("quote_id", id)
        .order("created_at", { ascending: false });
      setEmailEvents(emailData || []);
    } catch (err) {
      console.error("Failed to resend quote:", err);
      toast.error(err instanceof Error ? err.message : "Failed to resend quote");
    } finally {
      setResending(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "accepted":
        return "default";
      case "declined":
        return "destructive";
      case "sent":
      case "viewed":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!quote) {
    return (
      <AdminLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Quote not found</p>
          <Link to="/admin/quotes">
            <Button variant="link" className="mt-4">
              Back to Quotes
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/quotes">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold font-mono">{quote.reference}</h1>
                <Badge variant={getStatusVariant(quote.status)} className="capitalize">
                  {quote.status}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {company?.business_name} • Created {format(new Date(quote.created_at), "dd MMM yyyy")}
              </p>
            </div>
          </div>

          <Button onClick={handleResendQuote} disabled={resending || !quote.customer_email}>
            {resending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Resend Quote
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quote Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Quote Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium">{quote.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p>{quote.customer_email || "—"}</p>
                </div>
              </div>
              
              {quote.job_address && (
                <div>
                  <p className="text-xs text-muted-foreground">Job Address</p>
                  <p className="whitespace-pre-wrap">{quote.job_address}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(quote.subtotal)}</span>
                </div>
                {quote.vat_amount > 0 && (
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">VAT</span>
                    <span>{formatCurrency(quote.vat_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(quote.total)}</span>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2 text-sm">
                {quote.sent_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sent</span>
                    <span>{format(new Date(quote.sent_at), "dd MMM yyyy HH:mm")}</span>
                  </div>
                )}
                {quote.viewed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Viewed</span>
                    <span>{format(new Date(quote.viewed_at), "dd MMM yyyy HH:mm")}</span>
                  </div>
                )}
                {quote.accepted_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accepted</span>
                    <span>{format(new Date(quote.accepted_at), "dd MMM yyyy HH:mm")}</span>
                  </div>
                )}
                {quote.declined_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Declined</span>
                    <span>{format(new Date(quote.declined_at), "dd MMM yyyy HH:mm")}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Company */}
          <Card>
            <CardHeader>
              <CardTitle>Company</CardTitle>
            </CardHeader>
            <CardContent>
              {company ? (
                <div className="space-y-2">
                  <p className="font-medium">{company.business_name}</p>
                  <Badge variant="outline" className="capitalize">
                    {company.trade}
                  </Badge>
                  <div className="pt-4">
                    <Link to={`/admin/companies/${company.id}`}>
                      <Button variant="outline" size="sm">
                        View Company
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Company not found</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Event Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quote Events</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {quoteEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No events</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quoteEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {event.event_type.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(event.created_at), "dd MMM HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Events
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {emailEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No emails</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-sm">{event.to_email}</TableCell>
                        <TableCell>
                          <Badge variant={event.status === "sent" ? "default" : "destructive"}>
                            {event.status}
                          </Badge>
                          {event.error && (
                            <p className="text-xs text-destructive mt-1">{event.error}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(event.created_at), "dd MMM HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
