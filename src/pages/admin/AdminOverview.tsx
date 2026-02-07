import { useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminMetrics, useAdminQuotes } from "@/hooks/useAdmin";
import { Loader2, TrendingUp, Mail, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AdminOverview() {
  const now = new Date();
  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const { metrics: metrics7d, loading: loading7d } = useAdminMetrics(sevenDaysAgo, now);
  const { metrics: metrics30d, loading: loading30d } = useAdminMetrics(thirtyDaysAgo, now);
  const { quotes, loading: quotesLoading } = useAdminQuotes();

  const recentAccepted = useMemo(() => {
    if (!quotes) return [];
    return (quotes as Array<Record<string, unknown>>)
      .filter((q) => q.accepted_at)
      .slice(0, 10);
  }, [quotes]);

  const recentFailures = useMemo(() => {
    // This would come from email_events, for now show quotes with issues
    return [];
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  if (loading7d || loading30d) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const emailSuccessRate7d = metrics7d
    ? ((metrics7d.email_sent || 0) /
        Math.max((metrics7d.email_sent || 0) + (metrics7d.email_failed || 0), 1)) *
      100
    : 0;

  const emailSuccessRate30d = metrics30d
    ? ((metrics30d.email_sent || 0) /
        Math.max((metrics30d.email_sent || 0) + (metrics30d.email_failed || 0), 1)) *
      100
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Overview</h1>
          <p className="text-muted-foreground mt-1">
            System health and key metrics at a glance
          </p>
        </div>

        {/* 7-Day Metrics */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Last 7 Days</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Quotes Created
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics7d?.quotes_created || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Quotes Sent
                </CardTitle>
                <Mail className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics7d?.quotes_sent || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Quotes Accepted
                </CardTitle>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics7d?.quotes_accepted || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(Number(metrics7d?.accepted_quote_value || 0))} value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Email Success Rate
                </CardTitle>
                {emailSuccessRate7d < 95 ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{emailSuccessRate7d.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics7d?.email_failed || 0} failed
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 30-Day Metrics */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Last 30 Days</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Quotes Created
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics30d?.quotes_created || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Companies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics30d?.active_companies || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics30d?.trialing_companies || 0} on trial
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Quote Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(Number(metrics30d?.total_quote_value || 0))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Email Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{emailSuccessRate30d.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Accepted Quotes */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Accepted Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            {quotesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : recentAccepted.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No accepted quotes yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Accepted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAccepted.map((quote) => (
                    <TableRow key={quote.id as string}>
                      <TableCell className="font-mono text-sm">
                        {quote.reference as string}
                      </TableCell>
                      <TableCell>{quote.company_name as string}</TableCell>
                      <TableCell>{quote.customer_name as string}</TableCell>
                      <TableCell>{formatCurrency(Number(quote.total))}</TableCell>
                      <TableCell>
                        {format(new Date(quote.accepted_at as string), "dd MMM yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Failures */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Recent Failures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentFailures.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No recent failures
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Quote</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Would show email_events with status=failed */}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
