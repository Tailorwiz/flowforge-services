import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MessageNotificationRequest {
  record: {
    id: string;
    client_id: string;
    sender_id: string;
    sender_type: 'admin' | 'client';
    message: string;
    created_at: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { record }: MessageNotificationRequest = await req.json();
    console.log('Processing message notification for:', record.id);

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name, email, user_id')
      .eq('id', record.client_id)
      .single();

    if (clientError || !client) {
      console.error('Error fetching client:', clientError);
      throw new Error('Client not found');
    }

    // Get admin emails (users with admin role)
    const { data: adminUsers, error: adminError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        profiles!inner(email, display_name)
      `)
      .eq('role', 'admin');

    if (adminError) {
      console.error('Error fetching admin users:', adminError);
    }

    const adminEmails = adminUsers?.map(u => ({
      email: u.profiles.email,
      name: u.profiles.display_name || 'Admin'
    })) || [];

    // Get sender details
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('email, display_name')
      .eq('id', record.sender_id)
      .single();

    const senderName = senderProfile?.display_name || 
      (record.sender_type === 'admin' ? 'Admin' : client.name);
    const senderEmail = senderProfile?.email;

    // Prepare email content
    const messagePreview = record.message.length > 100 
      ? record.message.substring(0, 100) + '...' 
      : record.message;

    const isFromAdmin = record.sender_type === 'admin';
    const isFromClient = record.sender_type === 'client';

    // Send email to client if message is from admin
    if (isFromAdmin && client.email) {
      const clientEmailResponse = await resend.emails.send({
        from: "RDR Services <notifications@rdr.com>",
        to: [client.email],
        subject: `New message from ${senderName}`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">New Message from RDR Services</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333; margin-bottom: 20px;">Hello ${client.name},</h2>
              <p style="color: #666; margin-bottom: 20px;">You have received a new message from <strong>${senderName}</strong>:</p>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                <p style="color: #333; margin: 0; line-height: 1.6;">${record.message}</p>
              </div>
              <p style="color: #666; margin-top: 20px;">
                <strong>Sent:</strong> ${new Date(record.created_at).toLocaleString()}
              </p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'supabase.co')}/client/${record.client_id}" 
                   style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View & Reply in Portal
                </a>
              </div>
            </div>
            <div style="background: #333; padding: 20px; text-align: center;">
              <p style="color: #ccc; margin: 0; font-size: 14px;">
                This is an automated notification from RDR Services. Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
      });

      console.log('Client email sent:', clientEmailResponse);
    }

    // Send email to admins if message is from client
    if (isFromClient && adminEmails.length > 0) {
      const adminEmailPromises = adminEmails.map(admin => 
        resend.emails.send({
          from: "RDR Services <notifications@rdr.com>",
          to: [admin.email],
          subject: `New message from client: ${client.name}`,
          html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">New Client Message</h1>
              </div>
              <div style="padding: 30px; background: #f9f9f9;">
                <h2 style="color: #333; margin-bottom: 20px;">Hello ${admin.name},</h2>
                <p style="color: #666; margin-bottom: 20px;">You have received a new message from client <strong>${client.name}</strong>:</p>
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                  <p style="color: #333; margin: 0; line-height: 1.6;">${record.message}</p>
                </div>
                <p style="color: #666; margin-top: 20px;">
                  <strong>Client:</strong> ${client.name} (${client.email})<br>
                  <strong>Sent:</strong> ${new Date(record.created_at).toLocaleString()}
                </p>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'supabase.co')}/admin/clients/${record.client_id}" 
                     style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    View & Reply in Admin Portal
                  </a>
                </div>
              </div>
              <div style="background: #333; padding: 20px; text-align: center;">
                <p style="color: #ccc; margin: 0; font-size: 14px;">
                  This is an automated notification from RDR Services. Please do not reply to this email.
                </p>
              </div>
            </div>
          `,
        })
      );

      const adminEmailResults = await Promise.allSettled(adminEmailPromises);
      console.log('Admin emails sent:', adminEmailResults);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notifications sent' }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-message-notification function:", error);
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