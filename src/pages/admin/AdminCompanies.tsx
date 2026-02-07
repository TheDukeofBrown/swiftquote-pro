import { useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAdminCompanies } from "@/hooks/useAdmin";
import { Loader2, Search, Lock, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Company {
  id: string;
  business_name: string;
  trade: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  is_locked: boolean;
  lock_reason: string | null;
  notes: string | null;
  quotes_sent_30d: number;
  quotes_accepted_30d: number;
  email_failure_rate: number;
}

export default function AdminCompanies() {
  const { companies, loading, error } = useAdminCompanies();
  const [search, setSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState<string>("all");
  const [lockedFilter, setLockedFilter] = useState<string>("all");
  const [failureFilter, setFailureFilter] = useState<string>("all");

  const filteredCompanies = (companies as Company[]).filter((company) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      if (
        !company.business_name.toLowerCase().includes(searchLower) &&
        !(company.email?.toLowerCase().includes(searchLower))
      ) {
        return false;
      }
    }

    // Trade filter
    if (tradeFilter !== "all" && company.trade !== tradeFilter) {
      return false;
    }

    // Locked filter
    if (lockedFilter === "locked" && !company.is_locked) {
      return false;
    }
    if (lockedFilter === "unlocked" && company.is_locked) {
      return false;
    }

    // Failure rate filter
    if (failureFilter === "high" && company.email_failure_rate < 5) {
      return false;
    }

    return true;
  });

  const trades = [...new Set((companies as Company[]).map((c) => c.trade))];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-muted-foreground mt-1">
            Manage all registered companies
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={tradeFilter} onValueChange={setTradeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Trade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All trades</SelectItem>
                  {trades.map((trade) => (
                    <SelectItem key={trade} value={trade}>
                      {trade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={lockedFilter} onValueChange={setLockedFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                  <SelectItem value="unlocked">Active</SelectItem>
                </SelectContent>
              </Select>

              <Select value={failureFilter} onValueChange={setFailureFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Email failures" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="high">High failure rate (&gt;5%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Companies Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-16 text-destructive">
                Error loading companies: {error}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Sent (30d)</TableHead>
                    <TableHead className="text-right">Accepted (30d)</TableHead>
                    <TableHead className="text-right">Email Fail %</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No companies found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCompanies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {company.business_name}
                              {company.is_locked && (
                                <Lock className="w-3 h-3 text-destructive" />
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {company.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {company.trade}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(company.created_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          {company.is_locked ? (
                            <Badge variant="destructive">Locked</Badge>
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {company.quotes_sent_30d}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {company.quotes_accepted_30d}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              company.email_failure_rate > 5
                                ? "text-destructive font-medium"
                                : ""
                            }
                          >
                            {company.email_failure_rate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link to={`/admin/companies/${company.id}`}>
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
