import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WaitlistEmailPayload {
  email: string;
  firstName: string;
}

async function sendEmailWithResend(payload: WaitlistEmailPayload) {
  console.log("📧 [EMAIL] Starting email send process");
  console.log("📧 [EMAIL] Recipient:", payload.email);
  console.log("📧 [EMAIL] First Name:", payload.firstName);

  const apiKey = Deno.env.get("RESEND_API_KEY");

  if (!apiKey) {
    console.error("❌ [EMAIL] RESEND_API_KEY is not configured in environment variables");
    throw new Error("RESEND_API_KEY is not configured");
  }

  console.log("✅ [EMAIL] RESEND_API_KEY found (length:", apiKey.length, "characters)");
  console.log("📧 [EMAIL] Sender: TalkBuddy <no-reply@talkbuddy.co.in>");
  console.log("📧 [EMAIL] Preparing to send email via Resend API...");

  const emailPayload = {
    from: "TalkBuddy <no-reply@talkbuddy.co.in>",
    to: [payload.email],
    subject: "Your TalkBuddy Waitlist Registration",
    html: `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #111827;">
        <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">Hi ${payload.firstName || "there"},</h1>
        <p style="margin-bottom: 12px;">
          Thanks for joining the TalkBuddy wait list! 🎉
        </p>
        <p style="margin-bottom: 12px;">
          Your interest in TalkBuddy has been registered and you will soon hear from us about
          trial conversations on the application.
        </p>
        <p style="margin-bottom: 12px;">
          We can&apos;t wait to help you practice and build real speaking confidence.
        </p>
        <p style="margin-top: 24px; font-size: 12px; color: #6B7280;">
          If you didn&apos;t request this, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  try {
    console.log("📧 [EMAIL] Sending request to Resend API...");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(emailPayload),
    });

    console.log("📧 [EMAIL] Resend API response status:", response.status);
    console.log("📧 [EMAIL] Resend API response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [EMAIL] Resend API error response:", errorText);
      console.error("❌ [EMAIL] Status code:", response.status);
      throw new Error(`Resend error (${response.status}): ${errorText}`);
    }

    const responseData = await response.json();
    console.log("✅ [EMAIL] Email sent successfully!");
    console.log("✅ [EMAIL] Resend response:", JSON.stringify(responseData));
    
    if (responseData.id) {
      console.log("✅ [EMAIL] Email ID:", responseData.id);
    }

    return responseData;
  } catch (error) {
    console.error("❌ [EMAIL] Error sending email:", error);
    if (error instanceof Error) {
      console.error("❌ [EMAIL] Error message:", error.message);
      console.error("❌ [EMAIL] Error stack:", error.stack);
    }
    throw error;
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`🚀 [${requestId}] waitlist-email function called`);
  console.log(`🚀 [${requestId}] Method:`, req.method);
  console.log(`🚀 [${requestId}] URL:`, req.url);

  // Handle CORS preflight requests - must return 200 with proper headers
  if (req.method === "OPTIONS") {
    console.log(`✅ [${requestId}] CORS preflight request - returning OK`);
    return new Response("ok", { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      console.error(`❌ [${requestId}] Invalid method:`, req.method);
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`📥 [${requestId}] Parsing request payload...`);
    const payload = (await req.json()) as WaitlistEmailPayload;
    console.log(`📥 [${requestId}] Payload received:`, {
      email: payload.email,
      firstName: payload.firstName,
    });

    if (!payload.email) {
      console.error(`❌ [${requestId}] Missing email in payload`);
      return new Response(
        JSON.stringify({ error: "Missing required field: email" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`📧 [${requestId}] Calling sendEmailWithResend...`);
    const emailResult = await sendEmailWithResend(payload);
    console.log(`✅ [${requestId}] Email sent successfully, returning success response`);

    return new Response(JSON.stringify({ 
      success: true,
      emailId: emailResult?.id || null,
      message: "Email sent successfully"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`❌ [${requestId}] waitlist-email function error:`, error);
    if (error instanceof Error) {
      console.error(`❌ [${requestId}] Error name:`, error.name);
      console.error(`❌ [${requestId}] Error message:`, error.message);
      console.error(`❌ [${requestId}] Error stack:`, error.stack);
    }
    
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to send acknowledgement email",
        requestId: requestId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});


