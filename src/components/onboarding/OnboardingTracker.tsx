import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Users, Mail, Clock, AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  ExternalLink, FolderTree, KeyRound, Search, RefreshCw, CalendarClock
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";

interface TrackerRecord {
  id: string;
  client_id: string;
  status: string;
  drive_folder_url: string | null;
  desktop_path: string | null;
  welcome_email_sent_at: string | null;
  welcome_email_subject: string | null;
  created_at: string;
  clients: { id: string; name: string; email: string } | null;
  businesses: { id: string; name: string; brand_color: string } | null;
}

interface TrackerEvent {
  id: string;
  client_id: string;
  event_type: string;
  title: string;
  status: string;
  occurred_at: string;
  due_at: string | null;
  detail: Record<string, unknown>;
}

interface PlatformAccount {
  id: string;
  client_id: string;
  platform_key: string;
  status: string;
  error_message: string | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  portal: "Portal",
  tailorwiz: "TailorWiz",
  jobintel: "JobIntel",
  jobsondemandacademy: "JOD Academy",
};

export function OnboardingTracker() {
  const [records, setRecords] = useState<TrackerRecord[]>([]);
  const [events, setEvents] = useState<TrackerEvent[]>([]);
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [businessFilter, setBusinessFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [recRes, evRes, acctRes, bizRes] = await Promise.all([
      (supabase as any).from("onboarding_records")
        .select("*, clients:client_id (id, name, email), businesses:business_id (id, name, brand_color)")
        .order("created_at", { ascending: false }),
      (supabase as any).from("onboarding_events").select("*").order("occurred_at", { ascending: false }),
      (supabase as any).from("client_platform_accounts").select("id, client_id, platform_key, status, error_message"),
      (supabase as any).from("businesses").select("id, name").order("name"),
    ]);
    setRecords(recRes.data || []);
    setEvents(evRes.data || []);
    setAccounts(acctRes.data || []);
    setBusinesses(bizRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const dueItems = useMemo(
    () => events
      .filter((e) => e.event_type === "due_item" && e.status === "scheduled" && e.due_at)
      .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime()),
    [events],
  );

  const overdueCount = dueItems.filter((e) => isPast(new Date(e.due_at!))).length;

  const filteredRecords = useMemo(() => records.filter((r) => {
    if (businessFilter !== "all" && r.businesses?.id !== businessFilter) return false;
    const q = search.toLowerCase();
    return !q || r.clients?.name?.toLowerCase().includes(q) || r.clients?.email?.toLowerCase().includes(q);
  }), [records, businessFilter, search]);

  const clientName = (clientId: string) =>
    records.find((r) => r.client_id === clientId)?.clients?.name || "Unknown client";

  const markDueItemComplete = async (eventId: string) => {
    const { error } = await (supabase as any)
      .from("onboarding_events")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", eventId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Done", description: "Item marked complete" });
      fetchAll();
    }
  };

  const accountBadges = (clientId: string) => {
    const clientAccounts = accounts.filter((a) => a.client_id === clientId);
    if (clientAccounts.length === 0) return <span className="text-xs text-muted-foreground">No accounts yet</span>;
    return clientAccounts.map((a) => (
      <Badge
        key={a.id}
        variant="secondary"
        title={a.error_message || undefined}
        className={`text-xs ${a.status === "created" ? "bg-green-100 text-green-800" : a.status === "failed" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}
      >
        {PLATFORM_LABELS[a.platform_key] || a.platform_key}
      </Badge>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          <div><p className="text-2xl font-bold">{records.length}</p><p className="text-xs text-muted-foreground">Clients onboarded</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Mail className="w-8 h-8 text-green-600" />
          <div><p className="text-2xl font-bold">{records.filter((r) => r.welcome_email_sent_at).length}</p><p className="text-xs text-muted-foreground">Welcome emails sent</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-orange-500" />
          <div><p className="text-2xl font-bold">{dueItems.length}</p><p className="text-xs text-muted-foreground">Items due</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <div><p className="text-2xl font-bold">{overdueCount}</p><p className="text-xs text-muted-foreground">Overdue</p></div>
        </CardContent></Card>
      </div>

      {/* Upcoming & overdue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><CalendarClock className="w-5 h-5" /> Upcoming & Overdue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dueItems.length === 0 && <p className="text-sm text-muted-foreground">Nothing due — all caught up.</p>}
          {dueItems.slice(0, 10).map((e) => {
            const overdue = isPast(new Date(e.due_at!));
            return (
              <div key={e.id} className={`flex items-center justify-between rounded-lg border p-3 ${overdue ? "border-red-300 bg-red-50" : ""}`}>
                <div>
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {clientName(e.client_id)} • {overdue ? "Overdue — was due" : "Due"} {formatDistanceToNow(new Date(e.due_at!), { addSuffix: true })} ({format(new Date(e.due_at!), "MMM d, yyyy")})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {overdue && <Badge variant="destructive">Overdue</Badge>}
                  <Button size="sm" variant="outline" onClick={() => markDueItemComplete(e.id)}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Done
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by client name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={businessFilter} onValueChange={setBusinessFilter}>
          <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All businesses</SelectItem>
            {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Records */}
      <div className="space-y-3">
        {filteredRecords.map((r) => {
          const clientEvents = events.filter((e) => e.client_id === r.client_id);
          const isOpen = expanded === r.id;
          return (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(isOpen ? null : r.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-10 rounded" style={{ backgroundColor: r.businesses?.brand_color || "#999" }} />
                    <div>
                      <p className="font-semibold">{r.clients?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{r.clients?.email} • {r.businesses?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden md:block text-right">
                      <p className="text-xs text-muted-foreground">Signed up {format(new Date(r.created_at), "MMM d, yyyy h:mm a")}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.welcome_email_sent_at
                          ? `Welcome email sent ${format(new Date(r.welcome_email_sent_at), "MMM d, yyyy h:mm a")}`
                          : "Welcome email not sent yet"}
                      </p>
                    </div>
                    <Badge variant={r.status === "completed" ? "default" : "secondary"}
                      className={r.status === "completed" ? "bg-green-600" : r.status === "needs_attention" ? "bg-yellow-500 text-white" : ""}>
                      {r.status.replace("_", " ")}
                    </Badge>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div className="flex flex-wrap gap-4 text-sm">
                      {r.drive_folder_url && (
                        <a href={r.drive_folder_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 underline">
                          <FolderTree className="w-4 h-4" /> Cloud folder <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {r.desktop_path && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <FolderTree className="w-4 h-4" /> Desktop: <span className="font-mono text-xs">{r.desktop_path}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-2"><KeyRound className="w-4 h-4" /> {accountBadges(r.client_id)}</span>
                    </div>
                    {r.welcome_email_subject && (
                      <p className="text-sm text-muted-foreground"><Mail className="w-4 h-4 inline mr-1" /> Sent: "{r.welcome_email_subject}"</p>
                    )}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Timeline</p>
                      {clientEvents.map((e) => (
                        <div key={e.id} className="flex items-start gap-2 text-sm">
                          {e.status === "failed" ? <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                            : e.status === "scheduled" ? <Clock className="w-4 h-4 text-orange-500 mt-0.5" />
                            : <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />}
                          <div>
                            <p>{e.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {e.status === "scheduled" && e.due_at
                                ? `Due ${format(new Date(e.due_at), "MMM d, yyyy")}`
                                : format(new Date(e.occurred_at), "MMM d, yyyy h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))}
                      {clientEvents.length === 0 && <p className="text-xs text-muted-foreground">No events recorded</p>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {!loading && filteredRecords.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No onboarded clients yet — run the wizard to get started.</p>
        )}
      </div>
    </div>
  );
}
