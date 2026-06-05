import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import RDRLogo from "@/components/RDRLogo";
import {
  DollarSign, Link2, TrendingUp, Repeat, Award, CheckCircle2, ArrowRight,
} from "lucide-react";

const STEPS = [
  { icon: Link2, title: "Get your link", body: "Once approved, you receive a unique referral link and dashboard to track everything in real time." },
  { icon: TrendingUp, title: "Share & refer", body: "Send career changers, job seekers and your audience to JobIntel 360 with your link." },
  { icon: DollarSign, title: "Earn on every client", body: "Earn a flat bonus plus a percentage of every sale your referrals make." },
  { icon: Repeat, title: "Grow your rate", body: "Hit referral milestones to unlock higher commission tiers — the more you refer, the more you earn." },
];

const PERKS = [
  "Generous flat + percentage commissions on every conversion",
  "Tiered rates that climb as you refer more",
  "Real-time dashboard: clicks, conversions, earnings & payouts",
  "Long attribution window so you get credit for the leads you send",
  "Dedicated affiliate support from the JobIntel 360 team",
];

export default function AffiliateLanding() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", company: "", website: "", audience: "", promo_plan: "", social_links: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Missing info", description: "Name and email are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_affiliate_application", {
      p_name: form.name.trim(),
      p_email: form.email.trim(),
      p_company: form.company || undefined,
      p_website: form.website || undefined,
      p_audience: form.audience || undefined,
      p_promo_plan: form.promo_plan || undefined,
      p_social_links: form.social_links || undefined,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Something went wrong", description: error.message, variant: "destructive" });
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-rdr-light-gray">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <RDRLogo />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Affiliate login</Button>
            <Button size="sm" onClick={() => document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" })}>
              Apply now
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-rdr-navy text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-rdr-gold text-sm font-medium mb-4">
            JobIntel 360 Partner Program
          </span>
          <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4">
            Earn by helping people land better jobs
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
            Partner with JobIntel 360 and earn flat bonuses plus a percentage of every client you refer —
            with rates that grow as you do.
          </p>
          <Button size="lg" className="bg-rdr-gold text-rdr-navy hover:bg-rdr-gold/90"
            onClick={() => document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" })}>
            Become an affiliate <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-rdr-navy text-center mb-10 font-heading">How it works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={i}>
                <CardContent className="pt-6 text-center">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-rdr-light-gray flex items-center justify-center mb-3">
                    <Icon className="w-6 h-6 text-rdr-navy" />
                  </div>
                  <div className="text-sm font-bold text-rdr-gold mb-1">Step {i + 1}</div>
                  <h3 className="font-semibold text-rdr-navy mb-1">{s.title}</h3>
                  <p className="text-sm text-rdr-medium-gray">{s.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Perks + Application */}
      <section id="apply" className="bg-white border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12">
          <div>
            <div className="inline-flex items-center gap-2 text-rdr-gold mb-3">
              <Award className="w-5 h-5" /> <span className="font-semibold">Why partner with us</span>
            </div>
            <h2 className="text-2xl font-bold text-rdr-navy mb-6 font-heading">Built to reward you</h2>
            <ul className="space-y-3">
              {PERKS.map((p, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <span className="text-rdr-medium-gray">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <Card>
            <CardHeader><CardTitle>Apply to the program</CardTitle></CardHeader>
            <CardContent>
              {submitted ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-rdr-navy mb-2">Application received!</h3>
                  <p className="text-sm text-rdr-medium-gray">
                    Thanks, {form.name.split(" ")[0]}. Our team will review your application and reach out by email
                    with your affiliate link if you're a fit.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                    <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                    <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" /></div>
                  </div>
                  <div><Label>Social links</Label><Input value={form.social_links} onChange={(e) => setForm({ ...form, social_links: e.target.value })} placeholder="LinkedIn, YouTube, TikTok…" /></div>
                  <div><Label>Who is your audience?</Label><Textarea rows={2} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="e.g. job seekers, career-change community, students…" /></div>
                  <div><Label>How will you promote JobIntel 360?</Label><Textarea rows={2} value={form.promo_plan} onChange={(e) => setForm({ ...form, promo_plan: e.target.value })} /></div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit application"}
                  </Button>
                  <p className="text-xs text-rdr-medium-gray text-center">
                    Already approved? <button type="button" className="underline" onClick={() => navigate("/login")}>Sign in to your dashboard</button>
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="bg-rdr-navy text-white/60 text-sm">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center">
          © {new Date().getFullYear()} JobIntel 360. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
