import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@3";

Deno.serve(async (req) => {
  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store OTP in database
    const { error: dbError } = await supabase.from("otp_store").insert({
      email,
      otp_code: otp,
      expires_at: expiresAt.toISOString(),
    });

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Send OTP email via Resend
    const { error: emailError } = await resend.emails.send({
      from: "Saarthi Portal <onboarding@resend.dev>",
      to: email,
      subject: "Your OTP Code - Saarthi Portal",
      html: `<p>Your OTP code is: <strong>${otp}</strong></p><p>This code expires in 24 hours.</p>`,
    });

    if (emailError) {
      return new Response(JSON.stringify({ error: "OTP saved but email failed: " + emailError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "OTP sent to email" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});