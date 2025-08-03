import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  delivery_id: string;
  client_id: string;
  document_title: string;
  notification_type: 'delivery_ready' | 'revision_complete';
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Delivery notification function called');

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { delivery_id, client_id, document_title, notification_type }: NotificationRequest = await req.json();

    console.log('Processing notification for:', { delivery_id, client_id, document_title, notification_type });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client details
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientError) {
      console.error('Error fetching client:', clientError);
      throw clientError;
    }

    console.log('Client data:', clientData);

    // Create in-app notification
    const notificationData = {
      user_id: clientData.user_id,
      client_id: client_id,
      delivery_id: delivery_id,
      type: notification_type,
      title: notification_type === 'delivery_ready' 
        ? `Your ${document_title} is ready!` 
        : `Your ${document_title} revisions are complete!`,
      message: notification_type === 'delivery_ready'
        ? `Your new ${document_title.toLowerCase()} is ready for review. Click to view, approve, or request revisions.`
        : `Your ${document_title.toLowerCase()} has been updated based on your feedback. Please review the changes.`,
      metadata: {
        document_title,
        client_name: clientData.name,
        delivery_url: `${Deno.env.get('SUPABASE_URL')?.replace('gxatnnzwaggcvzzurgsq.supabase.co', 'gxatnnzwaggcvzzurgsq.lovableproject.com')}/client-portal`
      }
    };

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notificationData);

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      throw notificationError;
    }

    console.log('In-app notification created successfully');

    // Send email notification if Resend is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const emailSubject = notification_type === 'delivery_ready' 
          ? `Your ${document_title} is ready for review!` 
          : `Your ${document_title} revisions are complete!`;

        const emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Hi ${clientData.name}!</h2>
            
            <p style="font-size: 16px; line-height: 1.6;">
              ${notification_type === 'delivery_ready' 
                ? `Great news! Your <strong>${document_title}</strong> is ready for review.`
                : `Your <strong>${document_title}</strong> has been updated based on your feedback and is ready for your review.`
              }
            </p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e40af;">What's next?</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Review your document in the client portal</li>
                <li>Download your files</li>
                <li>Approve and finalize, or request revisions if needed</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${notificationData.metadata.delivery_url}" 
                 style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                View Your Document
              </a>
            </div>
            
            <div style="background: #ecfdf5; border: 1px solid #d1fae5; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #065f46; font-size: 14px;">
                <strong>💡 No call needed!</strong> If you'd like changes, just use the "Request Revisions" button in your portal to give feedback quickly and easily. We'll get right to work!
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Best regards,<br>
              The Results Driven Resumes Team
            </p>
          </div>
        `;

        const emailResponse = await resend.emails.send({
          from: "Results Driven Resumes <onboarding@resend.dev>",
          to: [clientData.email],
          subject: emailSubject,
          html: emailContent,
        });

        console.log('Email sent successfully:', emailResponse);
      } catch (emailError) {
        console.error('Error sending email (continuing anyway):', emailError);
        // Don't throw - email failure shouldn't stop the notification
      }
    } else {
      console.log('Resend API key not configured, skipping email');
    }

    // Send SMS if configured and client has phone number
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (twilioSid && twilioToken && twilioPhone && clientData.phone) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const twilioAuth = btoa(`${twilioSid}:${twilioToken}`);
        
        const smsMessage = notification_type === 'delivery_ready'
          ? `Hi ${clientData.name}! Your ${document_title} is ready for review. Check your email or login to your portal to view it. - Results Driven Resumes`
          : `Hi ${clientData.name}! Your ${document_title} revisions are complete. Please review the updated version in your portal. - Results Driven Resumes`;

        const smsResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: twilioPhone,
            To: clientData.phone,
            Body: smsMessage,
          }),
        });

        if (smsResponse.ok) {
          console.log('SMS sent successfully');
        } else {
          console.error('SMS failed:', await smsResponse.text());
        }
      } catch (smsError) {
        console.error('Error sending SMS (continuing anyway):', smsError);
        // Don't throw - SMS failure shouldn't stop the notification
      }
    } else {
      console.log('Twilio not configured or client has no phone number, skipping SMS');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        notification_id: notificationData 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-delivery-notification function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);