import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAdminActions, useAdmin } from "@/hooks/useAdmin";
import { toast } from "sonner";
import { Loader2, Lock, Unlock, ArrowLeft, Building2, FileText, Mail, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

interface CompanyDetail {
  company: {
    id: string;
    business_name: string;
    trade: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    created_at: string;
    logo_url: string | null;
    vat_registered: boolean;
    vat_rate: number | null;
  };
  flags: {
    is_locked: boolean;
    lock_reason: string | null;
    notes: string | null;
  } | null;
  subscription: {
    plan: string;
    status: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
  } | null;
  quotes: Array<{
    id: string;
    reference: string;
    customer_name: string;
    status: string;
    total: number;
    created_at: string;
  }>;
  quote_events: Array<{
    id: string;
    event_type: string;
    payload: Record<string, unknown>;
    created_at: string;
  }>;
  email_events: Array<{
    id: string;
    to_email: string;
    subject: string;
    status: string;
    error: string | null;
    created_at: string;
  }>;
}

export default function AdminCompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [lockReason, setLockReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);

  const { canModify, adminRole } = useAdmin();
  const { getCompanyDetail, lockCompany, unlockCompany, setCompanyNote } = useAdminActions();

  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const data = await getCompanyDetail(id) as unknown as CompanyDetail;
        setDetail(data);
        setNotes(data?.flags?.notes || "");
      } catch (err) {
        console.error("Failed to fetch company:", err);
        toast.error("Failed to load company details");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, getCompanyDetail]);

  const handleLock = async () => {
    if (!id || !lockReason.trim()) return;
    setSaving(true);
    try {
      await lockCompany(id, lockReason);
      toast.success("Company locked");
      setLockDialogOpen(false);
      // Refresh data
      const data = await getCompanyDetail(id) as unknown as CompanyDetail;
      setDetail(data);
    } catch (err) {
      console.error("Failed to lock company:", err);
      toast.error("Failed to lock company");
    } finally {
      setSaving(false);
    }
  };

  const handleUnlock = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await unlockCompany(id);
      toast.success("Company unlocked");
      const data = await getCompanyDetail(id) as unknown as CompanyDetail;
      setDetail(data as CompanyDetail);
    } catch (err) {
      console.error("Failed to unlock company:", err);
      toast.error("Failed to unlock company");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await setCompanyNote(id, notes);
      toast.success("Notes saved");
    } catch (err) {
      console.error("Failed to save notes:", err);
      toast.error("Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!detail?.company) {
    return (
      <AdminLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Company not found</p>
          <Link to="/admin/companies">
            <Button variant="link" className="mt-4">
              Back to Companies
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const { company, flags, subscription, quotes, quote_events, email_events } = detail;
  const isLocked = flags?.is_locked || false;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/companies">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{company.business_name}</h1>
                {isLocked && <Badge variant="destructive">Locked</Badge>}
              </div>
              <p className="text-muted-foreground mt-1 capitalize">
                {company.trade} • Created {format(new Date(company.created_at), "dd MMM yyyy")}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <TooltipProvider>
              {isLocked ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button onClick={handleUnlock} disabled={saving || !canModify}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
                        Unlock Account
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canModify && (
                    <TooltipContent>
                      <p>Support role cannot unlock accounts</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="destructive" disabled={!canModify}>
                            <Lock className="w-4 h-4 mr-2" />
                            Lock Account
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Lock Company Account</DialogTitle>
                            <DialogDescription>
                              Locking this account will prevent them from creating or sending quotes.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="lockReason">Lock Reason</Label>
                              <Input
                                id="lockReason"
                                placeholder="e.g., Payment overdue, Terms violation..."
                                value={lockReason}
                                onChange={(e) => setLockReason(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setLockDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleLock}
                              disabled={!lockReason.trim() || saving}
                            >
                              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                              Lock Account
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </span>
                  </TooltipTrigger>
                  {!canModify && (
                    <TooltipContent>
                      <p>Support role cannot lock accounts</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>

        {/* Lock reason banner */}
        {isLocked && flags?.lock_reason && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Account Locked</p>
                  <p className="text-sm text-muted-foreground mt-1">{flags.lock_reason}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Company Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p>{company.email || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <p>{company.phone || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Address</Label>
                <p className="whitespace-pre-wrap">{company.address || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">VAT Registered</Label>
                <p>{company.vat_registered ? `Yes (${company.vat_rate}%)` : "No"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription ? (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Plan</Label>
                    <p className="capitalize font-medium">{subscription.plan}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                      {subscription.status}
                    </Badge>
                  </div>
                  {subscription.trial_ends_at && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Trial Ends</Label>
                      <p>{format(new Date(subscription.trial_ends_at), "dd MMM yyyy")}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No subscription data</p>
              )}
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Notes</CardTitle>
              <CardDescription>Internal notes about this company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Add notes about this company..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                disabled={!canModify}
              />
              <Button onClick={handleSaveNotes} disabled={saving || !canModify} className="w-full">
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Notes
              </Button>
              {!canModify && (
                <p className="text-xs text-muted-foreground text-center">
                  Support role cannot edit notes
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quotes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Quotes ({quotes?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!quotes || quotes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No quotes</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.slice(0, 20).map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-mono text-sm">{quote.reference}</TableCell>
                      <TableCell>{quote.customer_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(quote.total)}</TableCell>
                      <TableCell>{format(new Date(quote.created_at), "dd MMM yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Event Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quote Events</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!quote_events || quote_events.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No events</p>
              ) : (
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quote_events.map((event) => (
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
                </div>
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
              {!email_events || email_events.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No emails</p>
              ) : (
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {email_events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="text-sm">
                            {event.to_email.replace(/(.{3}).*@/, "$1***@")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={event.status === "sent" ? "default" : "destructive"}
                            >
                              {event.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(event.created_at), "dd MMM HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
