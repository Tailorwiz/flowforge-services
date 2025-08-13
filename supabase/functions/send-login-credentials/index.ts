import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== FUNCTION START ===");
    
    const body = await req.json();
    console.log("Request body:", body);
    
    const { client_name, client_email } = body;
    console.log("Extracted data:", { client_name, client_email });

    // Get API key
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("No RESEND_API_KEY found");
      return new Response(
        JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("API key found");

    // Initialize Resend
    const resend = new Resend(apiKey);
    console.log("Resend initialized");

    // Send email
    console.log("Sending email...");
    const result = await resend.emails.send({
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

    console.log("Email result:", result);

    if (result.error) {
      console.error("Resend error:", result.error);
      return new Response(
        JSON.stringify({ success: false, error: result.error.message || "Email failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("SUCCESS!");
    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("FUNCTION ERROR:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});