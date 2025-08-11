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
    const { force = false, userEmail }: DigestRequest = await req.json();

    console.log("Processing daily digest request:", { force, userEmail });

    // Get digest preferences
    const { data: preferences, error: prefError } = await supabase
      .from("daily_digest_preferences")
      .select("*")
      .limit(1)
      .single();

    if (prefError && prefError.code !== 'PGRST116') {
      console.error("Error fetching preferences:", prefError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch digest preferences' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Use default preferences if none found
    const digestPrefs = preferences || {
      enabled: true,
      recipient_email: 'admin@resultsdrivenresumes.com',
      include_due_today: true,
      include_due_tomorrow: true,
      include_overdue: true,
      include_new_uploads: true,
      include_appointments: true,
    };

    // Check if digest is enabled (unless forced)
    if (!force && !digestPrefs.enabled) {
      console.log('Daily digest is disabled');
      return new Response(
        JSON.stringify({ message: 'Daily digest is disabled' }),
        { status: 200, headers: corsHeaders }
      );
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
    let rushClients: any[] = [];
    let newUploads: any[] = [];
    let appointments: any[] = [];
    let totalClients = 0;
    let activeProjects = 0;

    // Fetch RUSH clients first (highest priority)
    const { data: rushData } = await supabase
      .from("clients")
      .select(`
        id, name, email, estimated_delivery_date, is_rush, rush_deadline,
        service_types (name)
      `)
      .eq("is_rush", true)
      .eq("status", "active");
    
    rushClients = rushData || [];

    // Conditionally fetch data based on preferences
    if (digestPrefs.include_due_today) {
      const { data } = await supabase
        .from("clients")
        .select(`
          id, name, email, estimated_delivery_date,
          service_types (name)
        `)
        .eq("estimated_delivery_date", todayStr)
        .eq("status", "active")
        .eq("is_rush", false); // Exclude rush clients to avoid duplication
      
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
        .eq("status", "active")
        .eq("is_rush", false); // Exclude rush clients
      
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
        .eq("status", "active")
        .eq("is_rush", false); // Exclude rush clients
      
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

    // Fetch Calendly appointments
    if (digestPrefs.include_appointments) {
      try {
        const appointmentsResponse = await supabase.functions.invoke('fetch-calendly-appointments');
        if (appointmentsResponse.data?.success && appointmentsResponse.data?.appointments) {
          // Get appointments for next 7 days
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          
          appointments = appointmentsResponse.data.appointments
            .filter((event: any) => {
              const eventDate = new Date(event.start_time);
              return eventDate >= today && eventDate <= nextWeek;
            })
            .slice(0, 10); // Limit to 10 appointments
        }
      } catch (error) {
        console.error("Error fetching Calendly appointments:", error);
        appointments = [];
      }
    }

    // Fetch total stats
    const { count: totalClientsCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true });

    const { count: activeProjectsCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    totalClients = totalClientsCount || 0;
    activeProjects = activeProjectsCount || 0;

    // Create digest content
    const digestContent = generateDigestHTML({
      dueToday,
      dueTomorrow,
      overdue,
      rushClients,
      newUploads,
      appointments,
      totalClients,
      activeProjects,
      date: today.toLocaleDateString()
    });

    // Send digest email
    const emailResponse = await resend.emails.send({
      from: "RDR Project Portal Daily Digest <marcus@tailorwiz.com>",
      to: [userEmail || digestPrefs.recipient_email],
      subject: `Daily Digest - ${today.toLocaleDateString()} (${rushClients.length + dueToday.length + dueTomorrow.length + overdue.length} items)`,
      html: digestContent,
    });

    console.log("Daily digest sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      digest_data: {
        rush_clients: rushClients.length,
        due_today: dueToday.length,
        due_tomorrow: dueTomorrow.length,
        overdue: overdue.length,
        new_uploads: newUploads.length,
        appointments: appointments.length,
        total_clients: totalClients,
        active_projects: activeProjects
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
  rushClients: any[];
  newUploads: any[];
  appointments: any[];
  totalClients: number;
  activeProjects: number;
  date: string;
}): string {
  const { dueToday, dueTomorrow, overdue, rushClients, newUploads, appointments, totalClients, activeProjects, date } = data;
  
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

  const createRushClientsList = (clients: any[]) => {
    if (!clients.length) return "";
    
    return `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #dc2626; margin-bottom: 15px; font-weight: bold;">🚨 RUSH ORDERS - IMMEDIATE ATTENTION (${clients.length})</h3>
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border: 2px solid #ef4444;">
          ${clients.map(client => {
            const hoursUntilRushDeadline = client.rush_deadline ? 
              Math.ceil((new Date(client.rush_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60)) : null;
            
            return `
              <div style="padding: 10px 0; border-bottom: 1px solid #fecaca; background-color: #fef2f2; margin: 5px 0; border-radius: 6px; padding: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div>
                    <strong style="color: #dc2626;">${client.name}</strong> - ${client.service_types?.name || 'Service'}<br>
                    <span style="color: #666; font-size: 14px;">${client.email}</span>
                    ${client.rush_deadline ? `<br><span style="color: #dc2626; font-size: 12px; font-weight: bold;">Rush Deadline: ${new Date(client.rush_deadline).toLocaleString()}</span>` : ''}
                  </div>
                  <div style="text-align: right;">
                    <span style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">🚨 RUSH</span>
                    ${hoursUntilRushDeadline !== null ? `<br><span style="color: #dc2626; font-size: 11px; font-weight: bold;">${hoursUntilRushDeadline > 0 ? hoursUntilRushDeadline + 'h remaining' : 'OVERDUE!'}</span>` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  const createAppointmentsList = (appointments: any[]) => {
    if (!appointments.length) return "";
    
    return `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #1e40af; margin-bottom: 15px;">📅 Upcoming Appointments (${appointments.length})</h3>
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
          ${appointments.map(appointment => {
            const isToday = new Date(appointment.start_time).toDateString() === new Date().toDateString();
            const isTomorrow = new Date(appointment.start_time).toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();
            const appointmentDate = new Date(appointment.start_time);
            
            return `
              <div style="padding: 12px 0; border-bottom: 1px solid #e0f2fe; ${isToday ? 'background-color: #fef3c7; border-radius: 6px; padding: 12px; margin: 8px 0;' : ''}">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="vertical-align: top; width: 60%;">
                      <strong style="color: ${isToday ? '#d97706' : '#1e40af'};">${appointment.event_type}</strong>
                      ${isToday ? '<span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px;">TODAY</span>' : ''}
                      ${isTomorrow ? '<span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px;">TOMORROW</span>' : ''}<br>
                      <span style="color: #666; font-size: 14px;">👤 ${appointment.invitees[0]?.name || 'Guest'}</span><br>
                      <span style="color: #666; font-size: 14px;">📧 ${appointment.invitees[0]?.email || ''}</span>
                    </td>
                    <td style="vertical-align: top; text-align: right; width: 40%;">
                      <strong style="color: #1e40af;">${appointmentDate.toLocaleDateString()}</strong><br>
                      <span style="color: #666; font-size: 14px;">🕐 ${appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><br>
                      <span style="color: #666; font-size: 12px;">${appointment.location.type === 'zoom' ? '💻 Video Call' : appointment.location.type === 'phone' ? '📞 Phone Call' : '📍 ' + appointment.location.type}</span>
                    </td>
                  </tr>
                </table>
                ${appointment.location.join_url ? `
                  <div style="margin-top: 8px;">
                    <a href="${appointment.location.join_url}" style="background-color: #3b82f6; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-size: 12px;">Join Meeting</a>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
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

      <!-- Summary Stats -->
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
        <h2 style="color: #1e40af; margin-bottom: 20px; text-align: center;">📈 Overview</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center;">
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #ef4444; min-width: 120px;">
            <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${rushClients.length}</div>
            <div style="font-size: 12px; color: #666;">🚨 RUSH Orders</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #64748b; min-width: 120px;">
            <div style="font-size: 24px; font-weight: bold; color: #64748b;">${totalClients}</div>
            <div style="font-size: 12px; color: #666;">👥 Total Clients</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #3b82f6; min-width: 120px;">
            <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${activeProjects}</div>
            <div style="font-size: 12px; color: #666;">📊 Active Projects</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #f59e0b; min-width: 120px;">
            <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${dueToday.length}</div>
            <div style="font-size: 12px; color: #666;">⏰ Due Today</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #ef4444; min-width: 120px;">
            <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${overdue.length}</div>
            <div style="font-size: 12px; color: #666;">🚨 Overdue</div>
          </div>
        </div>
      </div>

      <div style="background-color: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        ${rushClients.length ? createRushClientsList(rushClients) : ""}
        ${overdue.length ? createClientList(overdue, "🚨 OVERDUE PROJECTS", "color: #dc2626; font-weight: bold;") : ""}
        ${dueToday.length ? createClientList(dueToday, "⏰ DUE TODAY") : ""}
        ${dueTomorrow.length ? createClientList(dueTomorrow, "📅 DUE TOMORROW") : ""}
        ${createUploadsList(newUploads)}
        ${createAppointmentsList(appointments)}

        ${!rushClients.length && !dueToday.length && !dueTomorrow.length && !overdue.length && !newUploads.length && !appointments.length ? `
          <div style="text-align: center; padding: 40px; color: #666;">
            <h3 style="color: #10b981; margin-bottom: 10px;">🎉 All caught up!</h3>
            <p>No urgent items requiring attention today. Great work!</p>
          </div>
        ` : ''}

        <div style="margin-top: 40px; text-align: center;">
          <p style="color: #666; font-size: 14px;">
            This digest was automatically generated by your RDR Project Portal.<br>
            <a href="https://portal.example.com/admin/settings" style="color: #3b82f6;">Manage digest preferences</a>
          </p>
        </div>
      </div>
    </div>
  `;
}

serve(handler);