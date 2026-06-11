import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomePacketRequest {
  clientId: string;
}

interface AccountRow {
  platform_key: string;
  account_email: string;
  temp_password: string | null;
  status: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  portal: "Client Portal",
  tailorwiz: "TailorWiz",
  jobintel: "JobIntel",
  jobsondemandacademy: "Jobs on Demand Academy",
};

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return rgb(
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  );
}

async function buildLoginPdf(
  businessName: string,
  brandColor: string,
  clientName: string,
  accounts: { label: string; url: string | null; email: string; password: string | null; note: string | null }[],
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]); // US Letter
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brand = hexToRgb(brandColor || "#1e3a5f");
  const gray = rgb(0.4, 0.4, 0.4);
  let y = 740;

  page.drawRectangle({ x: 0, y: 760, width: 612, height: 32, color: brand });
  page.drawText(businessName, { x: 40, y: 769, size: 14, font: bold, color: rgb(1, 1, 1) });

  page.drawText("Your Account Logins", { x: 40, y, size: 22, font: bold, color: brand });
  y -= 26;
  page.drawText(`Prepared for ${clientName} on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, {
    x: 40, y, size: 11, font, color: gray,
  });
  y -= 18;
  page.drawText("Please change each password after your first login.", { x: 40, y, size: 11, font, color: gray });
  y -= 30;

  for (const acct of accounts) {
    page.drawRectangle({ x: 36, y: y - 78, width: 540, height: 96, color: rgb(0.96, 0.97, 0.98) });
    page.drawText(acct.label, { x: 48, y, size: 14, font: bold, color: brand });
    y -= 20;
    if (acct.url) {
      page.drawText(`Login at: ${acct.url}`, { x: 48, y, size: 11, font, color: rgb(0, 0, 0) });
      y -= 16;
    }
    page.drawText(`Email: ${acct.email}`, { x: 48, y, size: 11, font, color: rgb(0, 0, 0) });
    y -= 16;
    page.drawText(`Temporary password: ${acct.password || "(will be sent separately)"}`, {
      x: 48, y, size: 11, font, color: rgb(0, 0, 0),
    });
    y -= 16;
    if (acct.note) {
      page.drawText(acct.note, { x: 48, y, size: 9, font, color: gray });
      y -= 14;
    }
    y -= 22;
  }

  page.drawText("Keep this document somewhere safe and do not share it.", { x: 40, y: 50, size: 9, font, color: gray });
  return await pdf.save();
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
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
    const { clientId }: WelcomePacketRequest = await req.json();
    if (!clientId) throw new Error("clientId is required");

    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("*, businesses:business_id (*), service_types (*)")
      .eq("id", clientId)
      .single();
    if (clientErr || !client) throw new Error(`Client not found: ${clientErr?.message}`);

    const business = client.businesses;
    if (!business) throw new Error("Client has no business assigned");

    const { data: accounts } = await supabase
      .from("client_platform_accounts")
      .select("platform_key, account_email, temp_password, status")
      .eq("client_id", clientId);

    const { data: platforms } = await supabase
      .from("platform_integrations")
      .select("platform_key, display_name, login_url");
    const loginUrls: Record<string, string | null> = { portal: business.portal_url || null };
    for (const p of platforms || []) loginUrls[p.platform_key] = p.login_url;

    const pdfAccounts = ((accounts || []) as AccountRow[]).map((a) => ({
      label: PLATFORM_LABELS[a.platform_key] || a.platform_key,
      url: loginUrls[a.platform_key] || null,
      email: a.account_email,
      password: a.temp_password,
      note: a.status !== "created" ? "This account is being finalized — we'll confirm once it's ready." : null,
    }));

    // ----- PDF attachment with all logins -----
    const pdfBytes = await buildLoginPdf(business.name, business.brand_color, client.name, pdfAccounts);

    // ----- Welcome email from the business template -----
    const deliveryDate = client.estimated_delivery_date
      ? new Date(client.estimated_delivery_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "To be scheduled";

    const accountsTable = `
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr style="background-color: ${business.brand_color}; color: #ffffff;">
          <th style="padding: 8px 12px; text-align: left;">Account</th>
          <th style="padding: 8px 12px; text-align: left;">Login</th>
        </tr>
        ${pdfAccounts.map((a) => `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;"><strong>${a.label}</strong></td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${a.url ? `<a href="${a.url}">${a.url}</a>` : "Link coming soon"} — see attached PDF for credentials</td>
          </tr>`).join("")}
      </table>`;

    const replacements: Record<string, string> = {
      "{{client_name}}": client.name,
      "{{business_name}}": business.name,
      "{{service_name}}": client.service_types?.name || "Your program",
      "{{delivery_date}}": deliveryDate,
      "{{portal_url}}": business.portal_url || "",
      "{{accounts_table}}": accountsTable,
    };

    let subject: string = business.welcome_email_subject || `Welcome to ${business.name}, ${client.name}!`;
    let body: string = business.welcome_email_body || `<p>Hi {{client_name}}, welcome to {{business_name}}!</p>{{accounts_table}}`;
    for (const [key, value] of Object.entries(replacements)) {
      subject = subject.split(key).join(value);
      body = body.split(key).join(value);
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: ${business.brand_color}; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${business.name}</h1>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
          ${body}
        </div>
      </div>`;

    const fromAddress = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    const emailResponse = await resend.emails.send({
      from: `${business.from_name || business.name} <${fromAddress}>`,
      to: [client.email],
      ...(business.reply_to_email ? { reply_to: business.reply_to_email } : {}),
      subject,
      html,
      attachments: [{
        filename: `${client.name} - Account Logins - ${business.name}.pdf`,
        content: uint8ToBase64(pdfBytes),
      }],
    });
    if (emailResponse.error) throw new Error(`Resend error: ${emailResponse.error.message}`);

    const sentAt = new Date().toISOString();

    // ----- Update the tracking database -----
    await supabase.from("onboarding_records").upsert({
      client_id: clientId,
      business_id: business.id,
      welcome_email_sent_at: sentAt,
      welcome_email_id: emailResponse.data?.id ?? null,
      welcome_email_subject: subject,
      status: "completed",
      completed_at: sentAt,
    }, { onConflict: "client_id" });

    await supabase.from("onboarding_events").insert({
      client_id: clientId,
      business_id: business.id,
      event_type: "email_sent",
      title: `Welcome email sent: "${subject}"`,
      detail: { to: client.email, subject, resend_id: emailResponse.data?.id ?? null, attachment: "Account Logins PDF" },
    });

    // ----- Schedule the due items that show up on the tracker -----
    const inDays = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
    const dueItems = [
      { title: "Client to complete New Client Worksheet", due_at: inDays(2), detail: { kind: "client_action" } },
      { title: "Follow-up / check-in email due", due_at: inDays(7), detail: { kind: "email" } },
    ];
    if (client.estimated_delivery_date) {
      dueItems.push({
        title: `Deliverables due (${client.service_types?.name || "service"})`,
        due_at: new Date(client.estimated_delivery_date).toISOString(),
        detail: { kind: "deliverable" },
      });
    }
    await supabase.from("onboarding_events").insert(dueItems.map((d) => ({
      client_id: clientId,
      business_id: business.id,
      event_type: "due_item",
      title: d.title,
      status: "scheduled",
      due_at: d.due_at,
      detail: d.detail,
    })));

    return new Response(JSON.stringify({
      success: true,
      emailId: emailResponse.data?.id ?? null,
      subject,
      sentAt,
    }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Error in send-welcome-packet:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
