import { useState, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useAdminAuditLog } from "@/hooks/useAdmin";
import { Loader2, Search } from "lucide-react";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  admin_user_id: string;
  admin_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
}

export default function AdminAudit() {
  const { logs, loading, error } = useAdminAuditLog(100, 0);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const filteredLogs = useMemo(() => {
    return (logs as AuditEntry[]).filter((log) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !log.action.toLowerCase().includes(searchLower) &&
          !(log.admin_email?.toLowerCase().includes(searchLower)) &&
          !log.entity_type.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Action filter
      if (actionFilter !== "all" && log.action !== actionFilter) {
        return false;
      }

      // Entity filter
      if (entityFilter !== "all" && log.entity_type !== entityFilter) {
        return false;
      }

      return true;
    });
  }, [logs, search, actionFilter, entityFilter]);

  const actions = [...new Set((logs as AuditEntry[]).map((l) => l.action))];
  const entities = [...new Set((logs as AuditEntry[]).map((l) => l.entity_type))];

  const getActionVariant = (action: string) => {
    if (action.includes("lock")) return "destructive";
    if (action.includes("unlock")) return "default";
    return "secondary";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            Complete history of admin actions
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by action, admin, or entity..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  {entities.map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-16 text-destructive">
                Error loading audit log: {error}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No audit entries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="text-sm">{log.admin_email || "—"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionVariant(log.action)}>
                            {log.action.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="capitalize">{log.entity_type}</div>
                            {log.entity_id && (
                              <div className="text-xs text-muted-foreground font-mono">
                                {log.entity_id.slice(0, 8)}...
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.before && log.after ? (
                            <details className="cursor-pointer">
                              <summary className="text-sm text-muted-foreground hover:text-foreground">
                                View changes
                              </summary>
                              <div className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-auto max-w-xs">
                                <div className="text-destructive">
                                  - {JSON.stringify(log.before, null, 2).slice(0, 100)}
                                </div>
                                <div className="text-green-600">
                                  + {JSON.stringify(log.after, null, 2).slice(0, 100)}
                                </div>
                              </div>
                            </details>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "dd MMM yyyy HH:mm")}
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
