import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Users, DollarSign, Link2, TrendingUp, Plus, Copy, CheckCircle2,
  Wallet, Percent, Award, RefreshCw, Settings2,
} from "lucide-react";

const currency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

const STATUS_COLORS: Record<string, string> = {
  invited: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  paused: "bg-gray-100 text-gray-700",
  disabled: "bg-red-100 text-red-800",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  paid: "bg-emerald-100 text-emerald-800",
  void: "bg-red-100 text-red-700",
  converted: "bg-emerald-100 text-emerald-800",
  signed_up: "bg-blue-100 text-blue-800",
};

export function AffiliateAdmin() {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [clicks, setClicks] = useState<number>(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [a, p, c, po, r, ap, cl] = await Promise.all([
      supabase.from("affiliates").select("*").order("created_at", { ascending: false }),
      supabase.from("commission_plans").select("*").order("created_at", { ascending: true }),
      supabase.from("affiliate_commissions").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliate_payouts").select("*").order("created_at", { ascending: false }),
      supabase.from("referrals").select("*").order("created_at", { ascending: false }),
      supabase.from("affiliate_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("referral_clicks").select("id", { count: "exact", head: true }),
    ]);
    setAffiliates(a.data || []);
    setPlans(p.data || []);
    setCommissions(c.data || []);
    setPayouts(po.data || []);
    setReferrals(r.data || []);
    setApplications(ap.data || []);
    setClicks(cl.count || 0);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const affName = (id: string) => affiliates.find((a) => a.id === id)?.name || "—";
  const totals = {
    pending: commissions.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0),
    approved: commissions.filter((c) => c.status === "approved").reduce((s, c) => s + Number(c.amount), 0),
    paid: commissions.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0),
  };
  const pendingApps = applications.filter((a) => a.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-rdr-navy" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-rdr-medium-gray">
          Manage affiliates, commission plans, referrals and payouts.
        </p>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="applications" className="relative">
            Applications
            {pendingApps > 0 && (
              <span className="ml-1 inline-flex items-center justify-center text-[10px] font-bold rounded-full bg-rdr-gold text-rdr-navy w-4 h-4">{pendingApps}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Affiliates" value={String(affiliates.length)} sub={`${affiliates.filter(a => a.status === "active").length} active`} />
            <StatCard icon={Link2} label="Clicks" value={String(clicks)} sub={`${referrals.length} signups`} />
            <StatCard icon={TrendingUp} label="Conversions" value={String(referrals.filter(r => r.status === "converted").length)} sub="paid referrals" />
            <StatCard icon={DollarSign} label="Owed" value={currency(totals.pending + totals.approved)} sub={`${currency(totals.paid)} paid`} />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Top affiliates</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Referrals</TableHead>
                    <TableHead className="text-right">Earned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map((a) => {
                    const earned = commissions.filter(c => c.affiliate_id === a.id).reduce((s, c) => s + Number(c.amount), 0);
                    const refs = referrals.filter(r => r.affiliate_id === a.id).length;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{a.referral_code}</code></TableCell>
                        <TableCell className="text-right">{refs}</TableCell>
                        <TableCell className="text-right font-medium">{currency(earned)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {affiliates.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No affiliates yet. Invite one from the Affiliates tab.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AFFILIATES */}
        <TabsContent value="affiliates" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <InviteAffiliateDialog plans={plans} onDone={refresh} />
          </div>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Code / Link</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="text-sm">{a.email}</TableCell>
                      <TableCell><RefLink code={a.referral_code} /></TableCell>
                      <TableCell className="text-sm">{plans.find(p => p.id === a.commission_plan_id)?.name || "Default"}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[a.status]}>{a.status}</Badge></TableCell>
                      <TableCell>
                        <Select value={a.status} onValueChange={async (v) => {
                          await supabase.from("affiliates").update({ status: v }).eq("id", a.id);
                          refresh();
                        }}>
                          <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="invited">Invited</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                            <SelectItem value="disabled">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {affiliates.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No affiliates yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APPLICATIONS */}
        <TabsContent value="applications" className="space-y-4 mt-6">
          <p className="text-sm text-muted-foreground">
            Public applications from <code className="bg-muted px-1.5 py-0.5 rounded">/affiliates</code>. Approving one
            creates an affiliate (status <i>invited</i>) with a fresh referral code.
          </p>
          <Card>
            <CardContent className="pt-6 space-y-4">
              {applications.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No applications yet.</p>
              )}
              {applications.map((ap) => (
                <div key={ap.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ap.name}</span>
                        <Badge className={STATUS_COLORS[ap.status] || "bg-gray-100 text-gray-700"}>{ap.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{ap.email}{ap.company ? ` · ${ap.company}` : ""}</div>
                      {ap.website && <div className="text-sm"><a href={ap.website} target="_blank" rel="noreferrer" className="text-blue-600 underline">{ap.website}</a></div>}
                      {ap.social_links && <div className="text-sm text-muted-foreground">Social: {ap.social_links}</div>}
                      {ap.audience && <p className="text-sm mt-2"><span className="text-muted-foreground">Audience:</span> {ap.audience}</p>}
                      {ap.promo_plan && <p className="text-sm"><span className="text-muted-foreground">Plan:</span> {ap.promo_plan}</p>}
                      <div className="text-xs text-muted-foreground mt-1">{new Date(ap.created_at).toLocaleDateString()}</div>
                    </div>
                    {ap.status === "pending" && (
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button size="sm" onClick={async () => {
                          const { error } = await supabase.rpc("approve_affiliate_application", { p_application_id: ap.id });
                          if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
                          toast({ title: "Approved", description: `${ap.name} is now an affiliate.` });
                          refresh();
                        }}>Approve</Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => {
                          const { data: { user } } = await supabase.auth.getUser();
                          await supabase.from("affiliate_applications").update({ status: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", ap.id);
                          refresh();
                        }}>Reject</Button>
                      </div>
                    )}
                    {ap.status === "approved" && ap.created_affiliate_id && (
                      <Badge className="bg-emerald-100 text-emerald-800 shrink-0">Affiliate created</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PLANS */}
        <TabsContent value="plans" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <PlanDialog onDone={refresh} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {plans.map((p) => (
              <Card key={p.id} className={p.is_default ? "border-rdr-gold" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {p.name}
                      {p.is_default && <Badge className="bg-rdr-gold text-rdr-navy">Default</Badge>}
                    </CardTitle>
                    <PlanDialog plan={p} onDone={refresh} />
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Award className="w-4 h-4 text-rdr-gold" /> Flat: <b>{currency(p.flat_amount)}</b> per conversion</div>
                  <div className="flex items-center gap-2"><Percent className="w-4 h-4 text-blue-600" /> First sale: <b>{p.percent_rate}%</b></div>
                  <div className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-emerald-600" /> Recurring: <b>{p.recurring_enabled ? `${p.recurring_percent}%${p.recurring_months ? ` × ${p.recurring_months}mo` : " (∞)"}` : "off"}</b></div>
                  {Array.isArray(p.tiers) && p.tiers.length > 0 && (
                    <div className="pt-1">
                      <span className="text-xs uppercase text-muted-foreground">Tiers</span>
                      <ul className="mt-1 space-y-1">
                        {p.tiers.map((t: any, i: number) => (
                          <li key={i} className="text-xs bg-muted rounded px-2 py-1">
                            ≥ {t.min_referrals} refs → {t.percent_rate != null ? `${t.percent_rate}%` : ""} {t.flat_amount != null ? `+ ${currency(t.flat_amount)} flat` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground pt-1">Cookie window: {p.cookie_window_days} days</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* COMMISSIONS */}
        <TabsContent value="commissions" className="space-y-4 mt-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={DollarSign} label="Pending" value={currency(totals.pending)} sub="needs approval" />
            <StatCard icon={CheckCircle2} label="Approved" value={currency(totals.approved)} sub="ready to pay" />
            <StatCard icon={Wallet} label="Paid" value={currency(totals.paid)} sub="lifetime" />
          </div>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Source</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{affName(c.affiliate_id)}</TableCell>
                      <TableCell><span className="text-xs">{c.commission_type.replace(/_/g, " ")}</span></TableCell>
                      <TableCell className="text-right">{currency(c.source_amount)}</TableCell>
                      <TableCell className="text-right font-medium">{currency(c.amount)}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[c.status]}>{c.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        {c.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" onClick={async () => {
                              await supabase.from("affiliate_commissions").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", c.id);
                              refresh();
                            }}>Approve</Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => {
                              await supabase.from("affiliate_commissions").update({ status: "void" }).eq("id", c.id);
                              refresh();
                            }}>Void</Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {commissions.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No commissions yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <ManualCommissionDialog affiliates={affiliates} onDone={refresh} />
        </TabsContent>

        {/* PAYOUTS */}
        <TabsContent value="payouts" className="space-y-4 mt-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Create a payout</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Bundles an affiliate's <b>approved</b> commissions into a payout you pay manually (PayPal, Zelle, etc.), then mark as paid.
              </p>
              <div className="flex flex-wrap gap-2">
                {affiliates.map((a) => {
                  const owed = commissions.filter(c => c.affiliate_id === a.id && c.status === "approved").reduce((s, c) => s + Number(c.amount), 0);
                  if (owed <= 0) return null;
                  return (
                    <Button key={a.id} variant="outline" size="sm" onClick={async () => {
                      const ids = commissions.filter(c => c.affiliate_id === a.id && c.status === "approved").map(c => c.id);
                      const { data: pay, error } = await supabase.from("affiliate_payouts").insert({
                        affiliate_id: a.id, amount: owed, status: "pending",
                        method: a.payout_method, notes: `${ids.length} commissions`,
                      }).select().single();
                      if (error || !pay) { toast({ title: "Error", description: error?.message, variant: "destructive" }); return; }
                      await supabase.from("affiliate_commissions").update({ payout_id: pay.id }).in("id", ids);
                      toast({ title: "Payout created", description: `${a.name}: ${currency(owed)}` });
                      refresh();
                    }}>
                      <Plus className="w-4 h-4 mr-1" /> {a.name} · {currency(owed)}
                    </Button>
                  );
                })}
                {!commissions.some(c => c.status === "approved") && (
                  <p className="text-sm text-muted-foreground">No approved commissions ready to pay.</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{affName(p.affiliate_id)}</TableCell>
                      <TableCell className="text-right font-medium">{currency(p.amount)}</TableCell>
                      <TableCell className="text-sm">{p.method || "—"}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[p.status]}>{p.status}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {p.status === "pending" && (
                          <Button size="sm" onClick={async () => {
                            const now = new Date().toISOString();
                            const { data: { user } } = await supabase.auth.getUser();
                            await supabase.from("affiliate_payouts").update({ status: "paid", paid_at: now, paid_by: user?.id }).eq("id", p.id);
                            await supabase.from("affiliate_commissions").update({ status: "paid", paid_at: now }).eq("payout_id", p.id);
                            toast({ title: "Marked paid", description: `${affName(p.affiliate_id)}: ${currency(p.amount)}` });
                            refresh();
                          }}>Mark paid</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {payouts.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payouts yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rdr-light-gray"><Icon className="w-5 h-5 text-rdr-navy" /></div>
          <div>
            <div className="text-2xl font-bold text-rdr-navy">{value}</div>
            <div className="text-xs text-rdr-medium-gray">{label}{sub ? ` · ${sub}` : ""}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RefLink({ code }: { code: string }) {
  const link = `${window.location.origin}/?ref=${code}`;
  return (
    <div className="flex items-center gap-1">
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{code}</code>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
        navigator.clipboard.writeText(link);
        toast({ title: "Link copied", description: link });
      }}><Copy className="w-3 h-3" /></Button>
    </div>
  );
}

function InviteAffiliateDialog({ plans, onDone }: { plans: any[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", commission_plan_id: "", payout_method: "paypal", payout_details: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name || !form.email) {
      toast({ title: "Missing info", description: "Name and email are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: codeData, error: codeErr } = await supabase.rpc("generate_referral_code", { p_seed: form.name });
    if (codeErr) { toast({ title: "Error", description: codeErr.message, variant: "destructive" }); setSaving(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("affiliates").insert({
      name: form.name,
      email: form.email.toLowerCase(),
      company: form.company || null,
      referral_code: codeData as string,
      commission_plan_id: form.commission_plan_id || null,
      payout_method: form.payout_method,
      payout_details: form.payout_details || null,
      notes: form.notes || null,
      status: "invited",
      invited_by: user?.id,
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Affiliate invited", description: `${form.name} · code ${codeData}` });
    setForm({ name: "", email: "", company: "", commission_plan_id: "", payout_method: "paypal", payout_details: "", notes: "" });
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Invite affiliate</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite an affiliate</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div>
            <Label>Commission plan</Label>
            <Select value={form.commission_plan_id} onValueChange={(v) => setForm({ ...form, commission_plan_id: v })}>
              <SelectTrigger><SelectValue placeholder="Default plan" /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.is_default ? " (default)" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Payout method</Label>
              <Select value={form.payout_method} onValueChange={(v) => setForm({ ...form, payout_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="zelle">Zelle</SelectItem>
                  <SelectItem value="wise">Wise</SelectItem>
                  <SelectItem value="bank">Bank transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Payout handle</Label><Input value={form.payout_details} onChange={(e) => setForm({ ...form, payout_details: e.target.value })} placeholder="email / @handle" /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving}>{saving ? "Creating…" : "Create & generate link"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanDialog({ plan, onDone }: { plan?: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const blank = {
    name: "", description: "", is_default: false, flat_amount: 0, percent_rate: 0,
    recurring_enabled: false, recurring_percent: 0, recurring_months: "" as any,
    tiers: "[]", cookie_window_days: 30,
  };
  const [form, setForm] = useState<any>(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (plan) {
      setForm({
        ...plan,
        recurring_months: plan.recurring_months ?? "",
        tiers: JSON.stringify(plan.tiers ?? [], null, 0),
      });
    } else {
      setForm(blank);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, open]);

  const submit = async () => {
    let tiers: any = [];
    try { tiers = JSON.parse(form.tiers || "[]"); }
    catch { toast({ title: "Invalid tiers JSON", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      is_default: form.is_default,
      flat_amount: Number(form.flat_amount) || 0,
      percent_rate: Number(form.percent_rate) || 0,
      recurring_enabled: form.recurring_enabled,
      recurring_percent: Number(form.recurring_percent) || 0,
      recurring_months: form.recurring_months === "" ? null : Number(form.recurring_months),
      tiers,
      cookie_window_days: Number(form.cookie_window_days) || 30,
    };
    // ensure single default
    if (payload.is_default) {
      await supabase.from("commission_plans").update({ is_default: false }).neq("id", plan?.id || "00000000-0000-0000-0000-000000000000");
    }
    const res = plan
      ? await supabase.from("commission_plans").update(payload).eq("id", plan.id)
      : await supabase.from("commission_plans").insert(payload);
    setSaving(false);
    if (res.error) { toast({ title: "Error", description: res.error.message, variant: "destructive" }); return; }
    toast({ title: plan ? "Plan updated" : "Plan created" });
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {plan
          ? <Button variant="ghost" size="icon" className="h-8 w-8"><Settings2 className="w-4 h-4" /></Button>
          : <Button><Plus className="w-4 h-4 mr-2" /> New plan</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{plan ? "Edit plan" : "New commission plan"}</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Flat amount ($ / conversion)</Label><Input type="number" value={form.flat_amount} onChange={(e) => setForm({ ...form, flat_amount: e.target.value })} /></div>
            <div><Label>First-sale %</Label><Input type="number" value={form.percent_rate} onChange={(e) => setForm({ ...form, percent_rate: e.target.value })} /></div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><Label>Recurring commission</Label><p className="text-xs text-muted-foreground">Pay on every subsequent payment</p></div>
            <Switch checked={form.recurring_enabled} onCheckedChange={(v) => setForm({ ...form, recurring_enabled: v })} />
          </div>
          {form.recurring_enabled && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Recurring %</Label><Input type="number" value={form.recurring_percent} onChange={(e) => setForm({ ...form, recurring_percent: e.target.value })} /></div>
              <div><Label>Max months (blank = ∞)</Label><Input type="number" value={form.recurring_months} onChange={(e) => setForm({ ...form, recurring_months: e.target.value })} /></div>
            </div>
          )}
          <div>
            <Label>Tiers (JSON)</Label>
            <Textarea rows={3} className="font-mono text-xs" value={form.tiers} onChange={(e) => setForm({ ...form, tiers: e.target.value })} />
            <p className="text-xs text-muted-foreground mt-1">{`e.g. [{"min_referrals":5,"percent_rate":20},{"min_referrals":15,"percent_rate":25,"flat_amount":40}]`}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div><Label>Cookie window (days)</Label><Input type="number" value={form.cookie_window_days} onChange={(e) => setForm({ ...form, cookie_window_days: e.target.value })} /></div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Default plan</Label>
              <Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save plan"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualCommissionDialog({ affiliates, onDone }: { affiliates: any[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ affiliate_id: "", amount: "", description: "", commission_type: "bonus" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.affiliate_id || !form.amount) { toast({ title: "Affiliate and amount required", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("affiliate_commissions").insert({
      affiliate_id: form.affiliate_id,
      commission_type: form.commission_type,
      amount: Number(form.amount),
      source_amount: 0,
      description: form.description || "Manual adjustment",
      status: "approved",
      approved_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Commission added" });
    setForm({ affiliate_id: "", amount: "", description: "", commission_type: "bonus" });
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2" /> Manual commission / bonus</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add manual commission</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Affiliate</Label>
            <Select value={form.affiliate_id} onValueChange={(v) => setForm({ ...form, affiliate_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{affiliates.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount ($)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.commission_type} onValueChange={(v) => setForm({ ...form, commission_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bonus">Bonus</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Add commission"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
