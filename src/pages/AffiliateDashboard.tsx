import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import RDRLogo from "@/components/RDRLogo";
import {
  DollarSign, Link2, TrendingUp, Wallet, Copy, LogOut, Clock, CheckCircle2,
} from "lucide-react";

const currency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  paid: "bg-emerald-100 text-emerald-800",
  void: "bg-red-100 text-red-700",
  converted: "bg-emerald-100 text-emerald-800",
  signed_up: "bg-blue-100 text-blue-800",
};

export default function AffiliateDashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [affiliate, setAffiliate] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [clicks, setClicks] = useState(0);

  const load = useCallback(async () => {
    // find or claim the affiliate record for this user
    let { data: aff } = await supabase.from("affiliates").select("*").eq("user_id", user!.id).maybeSingle();
    if (!aff) {
      const { data: claimedId } = await supabase.rpc("claim_affiliate_account");
      if (claimedId) {
        const res = await supabase.from("affiliates").select("*").eq("id", claimedId as string).maybeSingle();
        aff = res.data;
      }
    }
    setAffiliate(aff);
    if (aff) {
      const [r, c, p, cl] = await Promise.all([
        supabase.from("referrals").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false }),
        supabase.from("affiliate_commissions").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false }),
        supabase.from("affiliate_payouts").select("*").eq("affiliate_id", aff.id).order("created_at", { ascending: false }),
        supabase.from("referral_clicks").select("id", { count: "exact", head: true }).eq("affiliate_id", aff.id),
      ]);
      setReferrals(r.data || []);
      setCommissions(c.data || []);
      setPayouts(p.data || []);
      setClicks(cl.count || 0);
    }
    setChecking(false);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) { navigate("/login"); return; }
    if (user) load();
  }, [user, loading, navigate, load]);

  if (loading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-rdr-light-gray">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rdr-navy border-t-rdr-gold" />
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-rdr-light-gray p-6">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle>Not an affiliate yet</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This account isn't part of the JobIntel 360 affiliate program. Affiliates are invited by our team — if
              you were invited, make sure you signed in with the same email address.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>Back to portal</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const link = `${window.location.origin}/?ref=${affiliate.referral_code}`;
  const pending = commissions.filter((c) => ["pending", "approved"].includes(c.status)).reduce((s, c) => s + Number(c.amount), 0);
  const paid = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);
  const converted = referrals.filter((r) => r.status === "converted").length;

  return (
    <div className="min-h-screen bg-rdr-light-gray">
      <header className="bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RDRLogo />
            <div>
              <p className="text-sm font-medium text-rdr-navy">Affiliate Dashboard</p>
              <p className="text-xs text-rdr-medium-gray">Welcome, {affiliate.name}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate("/login"); }}>
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {affiliate.status !== "active" && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="pt-6 text-sm text-amber-800">
              Your affiliate account status is <b>{affiliate.status}</b>. You can share your link, but commissions
              activate once your account is approved.
            </CardContent>
          </Card>
        )}

        {/* Referral link */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Link2 className="w-4 h-4" /> Your referral link</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-sm" />
              <Button onClick={() => { navigator.clipboard.writeText(link); toast({ title: "Copied!", description: "Referral link copied." }); }}>
                <Copy className="w-4 h-4 mr-2" /> Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Code: <code className="bg-muted px-1.5 py-0.5 rounded">{affiliate.referral_code}</code> — share this link;
              anyone who signs up through it is attributed to you.
            </p>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat icon={Link2} label="Clicks" value={String(clicks)} />
          <Stat icon={TrendingUp} label="Conversions" value={`${converted} / ${referrals.length}`} />
          <Stat icon={DollarSign} label="Unpaid earnings" value={currency(pending)} />
          <Stat icon={Wallet} label="Paid out" value={currency(paid)} />
        </div>

        <Tabs defaultValue="referrals">
          <TabsList>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value="referrals" className="mt-4">
            <Card><CardContent className="pt-6">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Lead</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {referrals.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.referred_name || r.referred_email || "Anonymous"}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {referrals.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No referrals yet — share your link!</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="commissions" className="mt-4">
            <Card><CardContent className="pt-6">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {commissions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">{c.commission_type.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-right font-medium">{currency(c.amount)}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[c.status]}>{c.status}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {commissions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No commissions yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="payouts" className="mt-4">
            <Card><CardContent className="pt-6">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-right">Amount</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-right font-medium">{currency(p.amount)}</TableCell>
                      <TableCell className="text-sm">{p.method || "—"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[p.status]}>
                          {p.status === "paid" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : new Date(p.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {payouts.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No payouts yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card><CardContent className="pt-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-rdr-light-gray"><Icon className="w-5 h-5 text-rdr-navy" /></div>
        <div>
          <div className="text-xl font-bold text-rdr-navy">{value}</div>
          <div className="text-xs text-rdr-medium-gray">{label}</div>
        </div>
      </div>
    </CardContent></Card>
  );
}
