import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useBrand } from "@/contexts/BrandContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import BrandLogo from "@/components/BrandLogo";
import { UsageDisplay } from "@/components/UsageDisplay";
import { ReadOnlyGuard } from "@/components/FeatureGate";
import { QuickQuoteModal } from "@/components/QuickQuoteModal";
import { PriceLibrarySetupModal } from "@/components/PriceLibrarySetupModal";
import { DevTestHarness } from "@/components/DevTestHarness";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  PoundSterling,
  Eye,
  Send,
  Settings,
  LogOut,
  AlertTriangle,
  Library,
  Zap,
  Sparkles,
  Shield,
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

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { company } = useCompany();
  const { brand } = useBrand();
  const { toast } = useToast();
  const { canCreateQuote, isTrialing, trialDaysRemaining, isReadOnly } = useSubscription();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceItemCount, setPriceItemCount] = useState(0);
  const [quickQuoteOpen, setQuickQuoteOpen] = useState(false);
  const [librarySetupOpen, setLibrarySetupOpen] = useState(false);
  const [librarySetupDismissed, setLibrarySetupDismissed] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    accepted: 0,
    declined: 0,
    totalValue: 0,
    acceptedValue: 0,
    last30DaysSent: 0,
    last30DaysAcceptedValue: 0,
  });

  useEffect(() => {
    if (company) {
      fetchQuotes();
      fetchPriceItemCount();
      
      // Set up realtime subscription for quote status updates
      const channel = supabase
        .channel('quote-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'quotes',
            filter: `company_id=eq.${company.id}`,
          },
          (payload) => {
            console.log('Quote updated:', payload);
            // Update the quote in state
            setQuotes(prev => 
              prev.map(q => 
                q.id === payload.new.id ? { ...q, ...payload.new } : q
              )
            );
            
            // Show toast for important status changes
            const newStatus = payload.new.status;
            const oldStatus = payload.old?.status;
            
            if (newStatus === 'accepted' && oldStatus !== 'accepted') {
              toast({
                title: "🎉 Quote Accepted!",
                description: `${payload.new.customer_name} accepted ${payload.new.reference}`,
              });
            } else if (newStatus === 'viewed' && oldStatus === 'sent') {
              toast({
                title: "👀 Quote Viewed",
                description: `${payload.new.customer_name} opened ${payload.new.reference}`,
              });
            } else if (newStatus === 'declined') {
              toast({
                title: "Quote Declined",
                description: `${payload.new.customer_name} declined ${payload.new.reference}`,
                variant: "destructive",
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [company]);

  const fetchPriceItemCount = async () => {
    if (!company) return;
    const { count } = await supabase
      .from("price_items")
      .select("*", { count: "exact", head: true })
      .eq("company_id", company.id);
    setPriceItemCount(count || 0);
  };

  const fetchQuotes = async () => {
    if (!company) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching quotes:", error);
    } else {
      setQuotes(data || []);
      
      // Calculate stats
      const allQuotes = data || [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const sent = allQuotes.filter(q => q.status !== "draft").length;
      const accepted = allQuotes.filter(q => q.status === "accepted").length;
      const declined = allQuotes.filter(q => q.status === "declined").length;
      const totalValue = allQuotes.reduce((sum, q) => sum + Number(q.total || 0), 0);
      const acceptedValue = allQuotes
        .filter(q => q.status === "accepted")
        .reduce((sum, q) => sum + Number(q.total || 0), 0);
      
      // Last 30 days stats
      const recentQuotes = allQuotes.filter(q => new Date(q.created_at) >= thirtyDaysAgo);
      const last30DaysSent = recentQuotes.filter(q => q.status !== "draft").length;
      const last30DaysAcceptedValue = recentQuotes
        .filter(q => q.status === "accepted")
        .reduce((sum, q) => sum + Number(q.total || 0), 0);

      setStats({
        total: allQuotes.length,
        sent,
        accepted,
        declined,
        totalValue,
        acceptedValue,
        last30DaysSent,
        last30DaysAcceptedValue,
      });
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

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <Link to="/dashboard">
            <BrandLogo size="sm" />
          </Link>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden md:inline">
              {company?.business_name}
            </span>
            {user?.email === "lordbrown@me.com" && (
              <Link to="/admin">
                <Button variant="ghost" size="icon" title="Admin Console">
                  <Shield className="w-4 h-4" />
                </Button>
              </Link>
            )}
            <Link to="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Trial Banner */}
        {isTrialing && trialDaysRemaining > 0 && trialDaysRemaining <= 7 && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Your trial ends in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""}
              </span>
            </div>
            <Link to="/billing">
              <Button size="sm" variant="outline">Upgrade Now</Button>
            </Link>
          </div>
        )}

        {/* Price Library Prompt - show if empty and not dismissed */}
        {priceItemCount === 0 && !loading && !librarySetupDismissed && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Library className="w-4 h-4" />
              <span className="text-sm">
                Set up your default prices to quote 10x faster
              </span>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setLibrarySetupDismissed(true)}
              >
                Later
              </Button>
              <Button 
                size="sm"
                onClick={() => setLibrarySetupOpen(true)}
              >
                <Zap className="w-3 h-3 mr-1" />
                Set Up
              </Button>
            </div>
          </div>
        )}

        {/* Hero CTA - Create New Quote is PRIMARY */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, here's your overview</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setQuickQuoteOpen(true)}
              disabled={isReadOnly || !canCreateQuote()}
            >
              <Zap className="w-4 h-4 mr-1" />
              Quick Quote
            </Button>
            <Link to="/quotes/new">
              <Button size="lg" className="gap-2" disabled={isReadOnly || !canCreateQuote()}>
                <Plus className="w-4 h-4" />
                Create New Quote
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sent (30 days)</p>
                {loading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.last30DaysSent}</p>
                )}
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Send className="w-5 h-5 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Won (30 days)</p>
                {loading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-success">{formatCurrency(stats.last30DaysAcceptedValue)}</p>
                )}
              </div>
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Quotes</p>
                {loading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.total}</p>
                )}
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">All-time Value</p>
                {loading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
                )}
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <PoundSterling className="w-5 h-5 text-primary" />
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Quotes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">Recent Quotes</CardTitle>
            <Link to="/quotes">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : quotes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No quotes yet</p>
                <Link to="/quotes/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Quote
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {quotes.map((quote) => {
                  const config = statusConfig[quote.status];
                  const StatusIcon = config.icon;
                  const isAccepted = quote.status === "accepted";
                  return (
                    <Link
                      key={quote.id}
                      to={`/quotes/${quote.id}`}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isAccepted 
                          ? "border-green-300 bg-green-50/50 hover:bg-green-50 dark:bg-green-950/20 dark:border-green-800" 
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="hidden sm:block">
                          <Badge variant="outline" className={config.class}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate flex items-center gap-2">
                            {quote.customer_name}
                            {isAccepted && (
                              <Sparkles className="w-4 h-4 text-green-600 animate-pulse" />
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {quote.reference} · {formatDate(quote.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className={`font-semibold ${isAccepted ? "text-green-700 dark:text-green-400" : ""}`}>
                          {formatCurrency(Number(quote.total))}
                        </p>
                        <Badge variant="outline" className={`${config.class} sm:hidden`}>
                          {config.label}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Quote Modal */}
        <QuickQuoteModal open={quickQuoteOpen} onOpenChange={setQuickQuoteOpen} />

        {/* Price Library Setup Modal */}
        <PriceLibrarySetupModal
          open={librarySetupOpen}
          onOpenChange={setLibrarySetupOpen}
          onSkip={() => {
            setLibrarySetupOpen(false);
            setLibrarySetupDismissed(true);
          }}
          onComplete={() => {
            setLibrarySetupOpen(false);
            fetchPriceItemCount();
          }}
        />

        {/* Dev Test Harness (only in development) */}
        <DevTestHarness />
      </main>
    </div>
  );
}
