import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminQuotes } from "@/hooks/useAdmin";
import { Loader2, Search, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Quote {
  id: string;
  reference: string;
  company_id: string;
  company_name: string;
  customer_name: string;
  customer_email: string | null;
  status: string;
  total: number;
  created_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
}

function maskEmail(email: string | null): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const maskedLocal = local.length > 3 ? local.slice(0, 3) + "***" : local;
  return `${maskedLocal}@${domain}`;
}

export default function AdminQuotes() {
  const { quotes, loading, error } = useAdminQuotes();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredQuotes = useMemo(() => {
    return (quotes as Quote[]).filter((quote) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !quote.reference.toLowerCase().includes(searchLower) &&
          !quote.company_name.toLowerCase().includes(searchLower) &&
          !quote.customer_name.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all" && quote.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [quotes, search, statusFilter]);

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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Quotes</h1>
          <p className="text-muted-foreground mt-1">
            All quotes across all companies
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reference, company, or customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
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
          </CardContent>
        </Card>

        {/* Quotes Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-16 text-destructive">
                Error loading quotes: {error}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No quotes found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuotes.slice(0, 100).map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-mono text-sm">
                          {quote.reference}
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/admin/companies/${quote.company_id}`}
                            className="hover:underline"
                          >
                            {quote.company_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{quote.customer_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {maskEmail(quote.customer_email)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(quote.status)} className="capitalize">
                            {quote.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(quote.total)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(quote.created_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <Link to={`/admin/quotes/${quote.id}`}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
