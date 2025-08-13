import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LoginCredentialsRequest {
  client_id: string;
  client_name: string;
  client_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Send Login Credentials Function Started ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers));
    
    const body = await req.json();
    console.log('Request body:', body);
    
    const { client_id, client_name, client_email }: LoginCredentialsRequest = body;

    console.log('Sending login credentials to:', { client_email, client_name, client_id });

    // Check if RESEND_API_KEY is available
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    console.log('RESEND_API_KEY available:', !!resendApiKey);
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }

    const emailResponse = await resend.emails.send({
      from: "RDR Project Portal <onboarding@resend.dev>",
      to: [client_email],
      subject: "Your RDR Project Portal Login Details",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a365d; margin-bottom: 30px;">Welcome to RDR Project Portal</h1>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hi ${client_name},
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Your account has been set up in the RDR Project Portal. You can now log in using the credentials below:
          </p>
          
          <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1a365d; margin-top: 0;">Login Details:</h3>
            <p style="margin: 10px 0;"><strong>Email/Username:</strong> ${client_email}</p>
            <p style="margin: 10px 0;"><strong>Password:</strong> tailorwiz2025</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            You can access the portal at: <a href="https://gxatnnzwaggcvzzurgsq.lovable.app/customer/login" style="color: #3182ce;">Customer Portal Login</a>
          </p>
          
          <p style="font-size: 14px; color: #718096; margin-top: 30px;">
            For security reasons, we recommend changing your password after your first login.
          </p>
          
          <p style="font-size: 14px; color: #718096;">
            If you have any questions, please don't hesitate to contact us.
          </p>
          
          <p style="font-size: 14px; color: #718096; margin-top: 20px;">
            Best regards,<br>
            The Results Driven Resumes Team
          </p>
        </div>
      `,
    });

    console.log("Login credentials email response:", emailResponse);

    // Check if there was an error in the response
    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      throw new Error(`Email sending failed: ${emailResponse.error.message}`);
    }

    if (!emailResponse.data) {
      console.error("No data in email response:", emailResponse);
      throw new Error('Email sending failed: No response data from Resend');
    }

    console.log("Email sent successfully with ID:", emailResponse.data.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Login credentials sent successfully",
      email_id: emailResponse.data.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("=== Error in send-login-credentials function ===");
    console.error("Error type:", typeof error);
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    console.error("Full error object:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred',
        error_type: error?.name || 'UnknownError'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);