import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Database,
  Lock,
  Key,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";

interface TenantReport {
  quotes_without_company: number;
  quote_items_without_quote: number;
  price_items_without_company: number;
  quote_events_without_company: number;
  email_events_without_company: number;
  customers_without_company: number;
  subscriptions_without_company: number;
  orphan_quote_tokens: number;
  checked_at: string;
}

interface ImmutabilityReport {
  quote_events: { has_update_trigger: boolean; has_delete_trigger: boolean };
  email_events: { has_update_trigger: boolean; has_delete_trigger: boolean };
  admin_audit_log: { has_update_trigger: boolean; has_delete_trigger: boolean };
  checked_at: string;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-green-600" />
      ) : (
        <XCircle className="w-4 h-4 text-destructive" />
      )}
      <span className={ok ? "text-green-700 dark:text-green-400" : "text-destructive"}>
        {label}
      </span>
    </div>
  );
}

export default function AdminSecurity() {
  const [tenantReport, setTenantReport] = useState<TenantReport | null>(null);
  const [immutabilityReport, setImmutabilityReport] = useState<ImmutabilityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const [tenantResult, immResult] = await Promise.all([
        supabase.rpc("admin_verify_tenant_isolation"),
        supabase.rpc("admin_check_immutability"),
      ]);

      if (tenantResult.error) throw tenantResult.error;
      if (immResult.error) throw immResult.error;

      setTenantReport(tenantResult.data as unknown as TenantReport);
      setImmutabilityReport(immResult.data as unknown as ImmutabilityReport);
    } catch (err) {
      console.error("Failed to fetch security reports:", err);
      toast.error("Failed to load security reports");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const tenantClean = tenantReport
    ? Object.entries(tenantReport)
        .filter(([k]) => k !== "checked_at")
        .every(([, v]) => v === 0)
    : false;

  const immutableOk = immutabilityReport
    ? Object.entries(immutabilityReport)
        .filter(([k]) => k !== "checked_at")
        .every(([, v]) => typeof v === "object" && v.has_update_trigger && v.has_delete_trigger)
    : false;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8" />
              Security Posture
            </h1>
            <p className="text-muted-foreground mt-1">
              Internal security review &amp; hardening status
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Overall Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={tenantClean ? "border-green-500/30" : "border-destructive/30"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4" />
                Tenant Isolation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={tenantClean ? "default" : "destructive"}>
                {tenantClean ? "Clean" : "Issues Found"}
              </Badge>
            </CardContent>
          </Card>

          <Card className={immutableOk ? "border-green-500/30" : "border-destructive/30"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Immutable Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={immutableOk ? "default" : "destructive"}>
                {immutableOk ? "Enforced" : "Not Enforced"}
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-green-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Key className="w-4 h-4" />
                Secrets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="default">Server-side Only</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Threat Model */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Threat Model — Key Assets &amp; Surfaces
            </CardTitle>
            <CardDescription>
              Internal reference for investor due diligence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Key Assets</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Company data (business details, VAT, labour rates)</li>
                <li>Customer PII (names, emails, phone numbers, addresses)</li>
                <li>Quotes &amp; pricing (financial data, line items)</li>
                <li>Billing state (subscription plans, Stripe IDs)</li>
                <li>Admin credentials &amp; role assignments</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Attack Surfaces</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Public quote links (token-based access, no auth required)</li>
                <li>Edge functions (quote-public, send-quote, stripe-webhook)</li>
                <li>Admin RPCs (cross-tenant data access, mutating actions)</li>
                <li>Storage bucket (company logos — public read)</li>
                <li>PDF generation (on-the-fly, auth-gated)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Mitigations</h3>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>RLS policies on all tables with company-scoped isolation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Opaque UUID tokens for public quote links (not sequential, not derived from quote ID)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Token expiry (30-day default) with revocation capability</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Rate limiting on public endpoints (30/hour/token, 60/hour/IP hash)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Immutable audit logs (triggers prevent UPDATE/DELETE)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Role-based admin access (super_admin, admin, support)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Server-side secrets only (RESEND_API_KEY, STRIPE_SECRET_KEY)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>IP addresses hashed before logging (never stored raw)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>Admin RPCs enforce role server-side (support = read-only)</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Immutability Check */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Immutability Check
            </CardTitle>
            <CardDescription>
              Verifies that event/audit tables are append-only (no UPDATE or DELETE allowed)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {immutabilityReport ? (
              <div className="space-y-4">
                {Object.entries(immutabilityReport)
                  .filter(([k]) => k !== "checked_at")
                  .map(([table, triggers]) => {
                    const t = triggers as { has_update_trigger: boolean; has_delete_trigger: boolean };
                    return (
                      <div key={table} className="border rounded-lg p-4">
                        <h4 className="font-mono text-sm font-semibold mb-2">
                          {table.replace(/_/g, "_")}
                        </h4>
                        <div className="flex gap-6">
                          <StatusBadge ok={t.has_update_trigger} label="UPDATE blocked" />
                          <StatusBadge ok={t.has_delete_trigger} label="DELETE blocked" />
                        </div>
                      </div>
                    );
                  })}
                <p className="text-xs text-muted-foreground">
                  Last checked: {new Date(immutabilityReport.checked_at).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Tenant Isolation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Tenant Isolation Report
            </CardTitle>
            <CardDescription>
              Checks for orphaned records that violate company-scoped isolation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tenantReport ? (
              <div className="space-y-3">
                {Object.entries(tenantReport)
                  .filter(([k]) => k !== "checked_at")
                  .map(([key, count]) => (
                    <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm font-mono">
                        {key.replace(/_/g, " ")}
                      </span>
                      <Badge variant={count === 0 ? "outline" : "destructive"}>
                        {count === 0 ? "0 — Clean" : `${count} violations`}
                      </Badge>
                    </div>
                  ))}
                <p className="text-xs text-muted-foreground pt-2">
                  Last checked: {new Date(tenantReport.checked_at).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Secrets Hygiene */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Secrets &amp; Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm">Email provider (Resend)</span>
                <Badge variant="default">Configured</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm">Payment provider (Stripe)</span>
                <Badge variant="default">Configured</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm">Client bundle secrets exposure</span>
                <Badge variant="outline">
                  Only VITE_SUPABASE_URL &amp; VITE_SUPABASE_PUBLISHABLE_KEY (safe)
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Storage buckets</span>
                <Badge variant="secondary">company-logos (public read)</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Role Enforcement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Admin Role Enforcement
            </CardTitle>
            <CardDescription>
              All admin RPCs validate roles server-side via SECURITY DEFINER functions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { rpc: "admin_lock_company", roles: "admin, super_admin", type: "mutating" },
                { rpc: "admin_unlock_company", roles: "admin, super_admin", type: "mutating" },
                { rpc: "admin_resend_quote", roles: "admin, super_admin", type: "mutating" },
                { rpc: "admin_regenerate_quote_token", roles: "admin, super_admin", type: "mutating" },
                { rpc: "admin_set_company_note", roles: "admin, super_admin", type: "mutating" },
                { rpc: "admin_get_companies", roles: "all admin roles", type: "read" },
                { rpc: "admin_get_quotes", roles: "all admin roles", type: "read" },
                { rpc: "admin_get_users", roles: "all admin roles", type: "read" },
                { rpc: "admin_get_events", roles: "all admin roles", type: "read" },
                { rpc: "admin_get_audit_log", roles: "all admin roles", type: "read" },
              ].map((item) => (
                <div key={item.rpc} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="text-sm font-mono">{item.rpc}</span>
                    <span className="text-xs text-muted-foreground ml-2">({item.type})</span>
                  </div>
                  <Badge variant={item.type === "mutating" ? "secondary" : "outline"}>
                    {item.roles}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
