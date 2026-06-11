import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProvisionRequest {
  clientId: string;
}

function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  let pwd = pick(upper) + pick(lower) + pick(digits) + "!";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const b of bytes) pwd += all[b % all.length];
  return pwd;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { clientId }: ProvisionRequest = await req.json();
    if (!clientId) throw new Error("clientId is required");

    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("*, businesses:business_id (*)")
      .eq("id", clientId)
      .single();
    if (clientErr || !client) throw new Error(`Client not found: ${clientErr?.message}`);

    const results: Record<string, { status: string; error?: string }> = {};

    // ---------------------------------------------------------
    // 1. Client portal account (Supabase auth user) so the welcome
    //    email PDF contains a real, working login.
    // ---------------------------------------------------------
    const portalPassword = generateTempPassword();
    let portalStatus = "created";
    let portalError: string | undefined;
    try {
      const { data: created, error: authErr } = await supabase.auth.admin.createUser({
        email: client.email,
        password: portalPassword,
        email_confirm: true,
        user_metadata: { full_name: client.name },
      });
      if (authErr) {
        // Already exists is fine — keep the existing account, flag for manual reset
        if (`${authErr.message}`.toLowerCase().includes("already")) {
          portalStatus = "manual_required";
          portalError = "A portal account with this email already exists — send a password reset instead.";
        } else {
          throw authErr;
        }
      } else if (created?.user) {
        await supabase.from("clients").update({ user_id: created.user.id }).eq("id", clientId);
      }
    } catch (e: any) {
      portalStatus = "failed";
      portalError = e.message;
    }

    await supabase.from("client_platform_accounts").upsert({
      client_id: clientId,
      platform_key: "portal",
      account_email: client.email,
      temp_password: portalStatus === "created" ? portalPassword : null,
      status: portalStatus,
      error_message: portalError ?? null,
    }, { onConflict: "client_id,platform_key" });
    results.portal = { status: portalStatus, error: portalError };

    // ---------------------------------------------------------
    // 2. External platforms: TailorWiz, JobIntel, Jobs on Demand Academy.
    //    If an API base URL + secret key are configured the account is
    //    created automatically; otherwise credentials are generated and
    //    the account is flagged "manual_required" so nothing is lost.
    // ---------------------------------------------------------
    const { data: platforms } = await supabase
      .from("platform_integrations")
      .select("*")
      .eq("is_enabled", true);

    for (const platform of platforms || []) {
      const tempPassword = generateTempPassword();
      let status = "manual_required";
      let errorMessage: string | undefined;
      let externalId: string | undefined;

      const apiKey = Deno.env.get(`${platform.platform_key.toUpperCase()}_API_KEY`);
      if (platform.api_base_url && apiKey) {
        try {
          const res = await fetch(
            `${platform.api_base_url.replace(/\/$/, "")}${platform.signup_path || "/api/accounts"}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                name: client.name,
                email: client.email,
                password: tempPassword,
                source: "onboarding-wizard",
              }),
            },
          );
          if (!res.ok) throw new Error(`${platform.display_name} API returned ${res.status}: ${await res.text()}`);
          const body = await res.json().catch(() => ({}));
          externalId = body.id || body.account_id || body.user_id;
          status = "created";
        } catch (e: any) {
          status = "failed";
          errorMessage = e.message;
        }
      } else {
        errorMessage = "API not configured — create this account manually or set the API base URL and secret key.";
      }

      await supabase.from("client_platform_accounts").upsert({
        client_id: clientId,
        platform_key: platform.platform_key,
        account_email: client.email,
        temp_password: tempPassword,
        status,
        external_account_id: externalId ?? null,
        error_message: errorMessage ?? null,
      }, { onConflict: "client_id,platform_key" });

      await supabase.from("onboarding_events").insert({
        client_id: clientId,
        business_id: client.business_id,
        event_type: "account_created",
        title: status === "created"
          ? `${platform.display_name} account created`
          : `${platform.display_name} account needs attention (${status})`,
        status: status === "created" ? "done" : "failed",
        detail: { platform: platform.platform_key, status, error: errorMessage ?? null },
      });

      results[platform.platform_key] = { status, error: errorMessage };
    }

    await supabase.from("onboarding_events").insert({
      client_id: clientId,
      business_id: client.business_id,
      event_type: "account_created",
      title: portalStatus === "created"
        ? "Client portal account created"
        : `Client portal account needs attention (${portalStatus})`,
      status: portalStatus === "created" ? "done" : "failed",
      detail: { platform: "portal", status: portalStatus, error: portalError ?? null },
    });

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in provision-platform-accounts:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
