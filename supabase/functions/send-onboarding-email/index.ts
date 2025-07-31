import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OnboardingEmailRequest {
  clientId: string;
  clientName: string;
  clientEmail: string;
  serviceName: string;
  servicePrice: string;
  deliveryDate: string;
  tempPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      clientName, 
      clientEmail, 
      serviceName, 
      servicePrice, 
      deliveryDate, 
      tempPassword 
    }: OnboardingEmailRequest = await req.json();

    console.log('Sending onboarding email to:', clientEmail);

    const emailResponse = await resend.emails.send({
      from: "Results Driven Resumes <onboarding@resend.dev>",
      to: [clientEmail],
      subject: "Welcome to Results Driven Resumes – Let's Get Started!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">Welcome to Results Driven Resumes!</h1>
            <p style="color: #666; font-size: 16px;">Let's transform your career together</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1e40af; margin-top: 0;">Hi ${clientName},</h2>
            <p>Thank you for choosing Results Driven Resumes! We're excited to help you land your dream job.</p>
            
            <h3 style="color: #1e40af;">Your Package Details:</h3>
            <ul style="line-height: 1.6;">
              <li><strong>Service:</strong> ${serviceName}</li>
              <li><strong>Investment:</strong> $${servicePrice}</li>
              <li><strong>Estimated Delivery:</strong> ${deliveryDate}</li>
            </ul>
          </div>
          
          <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 20px;">
            <h3 style="color: #047857; margin-top: 0;">🔐 Your Client Portal Access</h3>
            <p><strong>Login Email:</strong> ${clientEmail}</p>
            <p><strong>Temporary Password:</strong> <code style="background: #fff; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
            <p style="font-size: 14px; color: #047857;"><em>Please change your password after first login</em></p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1e40af;">What Happens Next?</h3>
            <ol style="line-height: 1.8;">
              <li><strong>Complete Your Intake Form</strong> - This helps us understand your career goals</li>
              <li><strong>Upload Your Current Resume</strong> - We'll use this as our starting point</li>
              <li><strong>Review & Feedback</strong> - We'll send you a draft for your review</li>
              <li><strong>Final Delivery</strong> - Receive your polished, ATS-ready resume</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Access Your Client Portal</a>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e;"><strong>⏰ Action Required:</strong> Please complete your intake form within 24 hours to keep your project on schedule.</p>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
            <p>Questions? Reply to this email or contact us at support@resultsdrivenresumes.com</p>
            <p>Best regards,<br><strong>Marc Hall & The Results Driven Resumes Team</strong></p>
          </div>
        </div>
      `,
    });

    console.log("Onboarding email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-onboarding-email function:", error);
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