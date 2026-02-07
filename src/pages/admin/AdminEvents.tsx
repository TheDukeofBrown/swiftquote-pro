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
import { useAdminEvents } from "@/hooks/useAdmin";
import { Loader2, Search, Mail, FileText, ExternalLink, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface EventRecord {
  id: string;
  company_id: string;
  company_name: string;
  quote_id: string | null;
  quote_reference: string | null;
  event_source: "quote" | "email";
  event_type: string;
  payload: Record<string, unknown>;
  error: string | null;
  created_at: string;
}

const EVENT_TYPES = [
  { value: "created", label: "Created" },
  { value: "pdf_generated", label: "PDF Generated" },
  { value: "email_sent", label: "Email Sent" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "viewed", label: "Viewed" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

export default function AdminEvents() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { events, loading, error } = useAdminEvents({
    eventType: typeFilter !== "all" ? typeFilter : undefined,
    limit: 200,
  });

  const filteredEvents = useMemo(() => {
    return (events as EventRecord[]).filter((event) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !event.company_name.toLowerCase().includes(searchLower) &&
          !(event.quote_reference?.toLowerCase().includes(searchLower))
        ) {
          return false;
        }
      }

      // Source filter
      if (sourceFilter !== "all" && event.event_source !== sourceFilter) {
        return false;
      }

      return true;
    });
  }, [events, search, sourceFilter]);

  const getEventIcon = (source: string) => {
    if (source === "email") return <Mail className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getEventBadgeVariant = (type: string) => {
    if (type === "failed") return "destructive";
    if (type === "accepted") return "default";
    if (type === "declined") return "destructive";
    if (type === "sent" || type === "email_sent") return "secondary";
    return "outline";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground mt-1">
            Unified timeline of quote and email events across all companies
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company or quote ref..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="quote">Quote events</SelectItem>
                  <SelectItem value="email">Email events</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-16 text-destructive">
                Error loading events: {error}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Quote</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No events found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents.map((event) => (
                      <TableRow key={`${event.event_source}-${event.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getEventIcon(event.event_source)}
                            <span className="capitalize text-sm text-muted-foreground">
                              {event.event_source}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={getEventBadgeVariant(event.event_type)} className="capitalize">
                              {event.event_type.replace("_", " ")}
                            </Badge>
                            {event.error && (
                              <AlertCircle className="w-4 h-4 text-destructive" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link 
                            to={`/admin/companies/${event.company_id}`}
                            className="text-primary hover:underline"
                          >
                            {event.company_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {event.quote_reference ? (
                            <Link
                              to={`/admin/quotes/${event.quote_id}`}
                              className="font-mono text-sm text-primary hover:underline"
                            >
                              {event.quote_reference}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {event.error ? (
                            <span className="text-sm text-destructive truncate block">
                              {event.error}
                            </span>
                          ) : event.payload?.to_email ? (
                            <span className="text-sm text-muted-foreground">
                              {(event.payload.to_email as string).replace(/(.{3}).*@/, "$1***@")}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(event.created_at), "dd MMM HH:mm")}
                        </TableCell>
                        <TableCell>
                          {event.quote_id && (
                            <Link to={`/admin/quotes/${event.quote_id}`}>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
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
