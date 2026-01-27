import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Send,
  FileText,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Quote = Database["public"]["Tables"]["quotes"]["Row"];
type QuoteStatus = Database["public"]["Enums"]["quote_status"];

const statusConfig: Record<QuoteStatus, { label: string; class: string; icon: typeof Clock }> = {
  draft: { label: "Draft", class: "status-draft", icon: Clock },
  sent: { label: "Sent", class: "status-sent", icon: Send },
  viewed: { label: "Viewed", class: "status-viewed", icon: Eye },
  accepted: { label: "Accepted", class: "status-accepted", icon: CheckCircle2 },
  declined: { label: "Declined", class: "status-declined", icon: XCircle },
};

export default function QuotesList() {
  const { company } = useCompany();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");

  useEffect(() => {
    if (company) {
      fetchQuotes();
    }
  }, [company]);

  const fetchQuotes = async () => {
    if (!company) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching quotes:", error);
    } else {
      setQuotes(data || []);
    }
    setLoading(false);
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
      month: "short",
      year: "numeric",
    });
  };

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch = 
      quote.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      quote.reference.toLowerCase().includes(search.toLowerCase()) ||
      (quote.job_address?.toLowerCase().includes(search.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
            <h1 className="font-semibold">All Quotes</h1>
          </div>
          <Link to="/quotes/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">New Quote</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="container py-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search quotes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as QuoteStatus | "all")}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quotes List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredQuotes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {search || statusFilter !== "all" ? "No quotes match your filters" : "No quotes yet"}
                </p>
                {!search && statusFilter === "all" && (
                  <Link to="/quotes/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Quote
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredQuotes.map((quote) => {
                  const config = statusConfig[quote.status];
                  const StatusIcon = config.icon;
                  return (
                    <Link
                      key={quote.id}
                      to={`/quotes/${quote.id}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant="outline" className={config.class}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{quote.customer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {quote.reference} · {formatDate(quote.created_at)}
                            {quote.job_address && (
                              <span className="hidden md:inline"> · {quote.job_address}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-semibold">{formatCurrency(Number(quote.total))}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
