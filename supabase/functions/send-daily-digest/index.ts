import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DigestRequest {
  force?: boolean;
  userEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { force = false, userEmail = "admin@resultsdrivenresumes.com" }: DigestRequest = await req.json();

    console.log("Processing daily digest request:", { force, userEmail });

    // Get digest preferences
    const { data: preferences, error: prefError } = await supabase
      .from("daily_digest_preferences")
      .select("*")
      .limit(1)
      .single();

    if (prefError && prefError.code !== 'PGRST116') {
      console.error("Error fetching preferences:", prefError);
      throw new Error("Could not fetch digest preferences");
    }

    // Use default preferences if none found
    const digestPrefs = preferences || {
      enabled: true,
      include_due_today: true,
      include_due_tomorrow: true,
      include_overdue: true,
      include_new_uploads: true
    };

    if (!digestPrefs.enabled && !force) {
      return new Response(JSON.stringify({ message: "Daily digest is disabled" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get date ranges
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Initialize digest data
    let dueToday: any[] = [];
    let dueTomorrow: any[] = [];
    let overdue: any[] = [];
    let newUploads: any[] = [];

    // Fetch due today
    if (digestPrefs.include_due_today) {
      const { data } = await supabase
        .from("clients")
        .select(`
          id, name, email, estimated_delivery_date,
          service_types (name)
        `)
        .eq("estimated_delivery_date", todayStr)
        .eq("status", "active");
      
      dueToday = data || [];
    }

    // Fetch due tomorrow
    if (digestPrefs.include_due_tomorrow) {
      const { data } = await supabase
        .from("clients")
        .select(`
          id, name, email, estimated_delivery_date,
          service_types (name)
        `)
        .eq("estimated_delivery_date", tomorrowStr)
        .eq("status", "active");
      
      dueTomorrow = data || [];
    }

    // Fetch overdue
    if (digestPrefs.include_overdue) {
      const { data } = await supabase
        .from("clients")
        .select(`
          id, name, email, estimated_delivery_date,
          service_types (name)
        `)
        .lt("estimated_delivery_date", todayStr)
        .eq("status", "active");
      
      overdue = data || [];
    }

    // Fetch new uploads (last 24 hours)
    if (digestPrefs.include_new_uploads) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data } = await supabase
        .from("client_history")
        .select(`
          id, client_id, action_type, description, created_at,
          clients (name, email)
        `)
        .eq("action_type", "file_uploaded")
        .gte("created_at", yesterday.toISOString());
      
      newUploads = data || [];
    }

    // Create digest content
    const digestContent = generateDigestHTML({
      dueToday,
      dueTomorrow,
      overdue,
      newUploads,
      date: today.toLocaleDateString()
    });

    // Send digest email
    const emailResponse = await resend.emails.send({
      from: "RDR Project Portal Daily Digest <digest@resend.dev>",
      to: [userEmail],
      subject: `Daily Digest - ${today.toLocaleDateString()} (${dueToday.length + dueTomorrow.length + overdue.length} items)`,
      html: digestContent,
    });

    console.log("Daily digest sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      digest_data: {
        due_today: dueToday.length,
        due_tomorrow: dueTomorrow.length,
        overdue: overdue.length,
        new_uploads: newUploads.length
      },
      email_response: emailResponse
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-daily-digest function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function generateDigestHTML(data: {
  dueToday: any[];
  dueTomorrow: any[];
  overdue: any[];
  newUploads: any[];
  date: string;
}): string {
  const { dueToday, dueTomorrow, overdue, newUploads, date } = data;
  
  const createClientList = (clients: any[], title: string, urgencyClass: string = "") => {
    if (!clients.length) return "";
    
    return `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #1e40af; margin-bottom: 15px; ${urgencyClass}">${title} (${clients.length})</h3>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px;">
          ${clients.map(client => `
            <div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <strong>${client.name}</strong> - ${client.service_types?.name || 'Service'}<br>
              <span style="color: #666; font-size: 14px;">${client.email}</span>
              ${client.estimated_delivery_date ? `<br><span style="color: #666; font-size: 14px;">Due: ${new Date(client.estimated_delivery_date).toLocaleDateString()}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  const createUploadsList = (uploads: any[]) => {
    if (!uploads.length) return "";
    
    return `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #1e40af; margin-bottom: 15px;">📥 New Uploads (${uploads.length})</h3>
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
          ${uploads.map(upload => `
            <div style="padding: 8px 0; border-bottom: 1px solid #e0f2fe;">
              <strong>${upload.clients?.name || 'Unknown Client'}</strong><br>
              <span style="color: #666; font-size: 14px;">${upload.description}</span><br>
              <span style="color: #888; font-size: 12px;">${new Date(upload.created_at).toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #2563eb, #1e40af); color: white; padding: 30px; border-radius: 12px;">
        <h1 style="margin: 0; font-size: 28px;">📊 Daily Business Digest</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${date}</p>
      </div>

      <div style="background-color: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        ${overdue.length ? createClientList(overdue, "🚨 OVERDUE PROJECTS", "color: #dc2626; font-weight: bold;") : ""}
        ${dueToday.length ? createClientList(dueToday, "⏰ DUE TODAY") : ""}
        ${dueTomorrow.length ? createClientList(dueTomorrow, "📅 DUE TOMORROW") : ""}
        ${createUploadsList(newUploads)}

        ${!dueToday.length && !dueTomorrow.length && !overdue.length && !newUploads.length ? `
          <div style="text-align: center; padding: 40px; color: #666;">
            <h3 style="color: #10b981; margin-bottom: 10px;">🎉 All caught up!</h3>
            <p>No urgent items requiring attention today. Great work!</p>
          </div>
        ` : ''}

        <div style="margin-top: 40px; text-align: center;">
          <a href="#" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Open Client Dashboard
          </a>
        </div>
      </div>

      <div style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
        <p>This digest was automatically generated by your RDR Project Portal management system.</p>
        <p>To update your digest preferences, visit your dashboard settings.</p>
      </div>
    </div>
  `;
}

serve(handler);