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

interface ReminderRequest {
  templateId?: string;
  clientId?: string;
  clientEmail: string;
  clientName: string;
  customData?: Record<string, any>;
  subject?: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      templateId,
      clientId,
      clientEmail,
      clientName,
      customData = {},
      subject: customSubject,
      message: customMessage
    }: ReminderRequest = await req.json();

    console.log("Processing reminder request:", { templateId, clientId, clientEmail, clientName });

    let finalSubject = customSubject || "Reminder from Results Driven Resumes";
    let finalMessage = customMessage || "This is a reminder message.";

    // If template ID is provided, fetch and use template
    if (templateId) {
      const { data: template, error: templateError } = await supabase
        .from("reminder_templates")
        .select("*")
        .eq("id", templateId)
        .eq("is_active", true)
        .single();

      if (templateError) {
        console.error("Error fetching template:", templateError);
        throw new Error("Template not found");
      }

      // Replace template variables
      finalSubject = template.subject_template
        .replace(/\{\{client_name\}\}/g, clientName)
        .replace(/\{\{client_email\}\}/g, clientEmail)
        .replace(/\{\{delivery_date\}\}/g, customData.delivery_date || "TBD")
        .replace(/\{\{service_name\}\}/g, customData.service_name || "Service")
        .replace(/\{\{project_status\}\}/g, customData.project_status || "In Progress")
        .replace(/\{\{days_remaining\}\}/g, customData.days_remaining || "N/A");

      finalMessage = template.message_template
        .replace(/\{\{client_name\}\}/g, clientName)
        .replace(/\{\{client_email\}\}/g, clientEmail)
        .replace(/\{\{delivery_date\}\}/g, customData.delivery_date || "TBD")
        .replace(/\{\{service_name\}\}/g, customData.service_name || "Service")
        .replace(/\{\{project_status\}\}/g, customData.project_status || "In Progress")
        .replace(/\{\{days_remaining\}\}/g, customData.days_remaining || "N/A");
    }

    console.log("Sending reminder email:", { to: clientEmail, subject: finalSubject });

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Results Driven Resumes <reminders@resend.dev>",
      to: [clientEmail],
      subject: finalSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">Results Driven Resumes</h1>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <div style="white-space: pre-line; line-height: 1.6;">
              ${finalMessage}
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Access Your Client Portal
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
            <p>Questions? Reply to this email or contact us at support@resultsdrivenresumes.com</p>
            <p>Best regards,<br><strong>The Results Driven Resumes Team</strong></p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // If this is for a specific client, update the scheduled reminder status
    if (clientId && templateId) {
      const { error: updateError } = await supabase
        .from("scheduled_reminders")
        .update({ 
          status: "sent", 
          sent_at: new Date().toISOString(),
          reminder_data: { ...customData, email_response: emailResponse }
        })
        .eq("client_id", clientId)
        .eq("template_id", templateId)
        .eq("status", "pending");

      if (updateError) {
        console.error("Error updating reminder status:", updateError);
      }

      // Log to client history
      await supabase.from("client_history").insert({
        client_id: clientId,
        action_type: "reminder_sent",
        description: `Automated reminder sent: ${finalSubject}`,
        metadata: { 
          template_id: templateId,
          email_id: emailResponse.data?.id,
          subject: finalSubject
        }
      });
    }

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-reminder function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);