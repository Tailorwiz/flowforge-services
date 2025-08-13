import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_name, client_email } = await req.json();

    console.log("Sending login credentials email:", { client_name, client_email });

    const emailResponse = await resend.emails.send({
      from: "Login Credentials <onboarding@resend.dev>",
      to: [client_email],
      subject: "Your Login Credentials",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Hi ${client_name},</h2>
          <p>Your login credentials:</p>
          <p><strong>Email:</strong> ${client_email}</p>
          <p><strong>Password:</strong> tailorwiz2025</p>
          <p><a href="https://gxatnnzwaggcvzzurgsq.lovable.app/customer/login">Login here</a></p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: "Login credentials sent successfully"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-login-credentials function:", error);
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