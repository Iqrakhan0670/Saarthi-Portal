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

    // Check user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (userError || !user) {
      // Don't reveal if email exists or not (security best practice)
      return new Response(JSON.stringify({ success: true, message: "If this email exists, a reset link has been sent" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate reset token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const { error: tokenError } = await supabase.from("password_reset_tokens").insert({
      user_id: user.id,
      email,
      token,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

    if (tokenError) {
      return new Response(JSON.stringify({ error: tokenError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const resetLink = `https://YOUR-FRONTEND-DOMAIN.com/reset-password?token=${token}`;

    const { error: emailError } = await resend.emails.send({
      from: "Saarthi Portal <onboarding@resend.dev>",
      to: email,
      subject: "Reset Your Password - Saarthi Portal",
      html: `<p>Click the link below to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in 1 hour.</p>`,
    });

    if (emailError) {
      return new Response(JSON.stringify({ error: "Token saved but email failed: " + emailError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Reset link sent to email" }), {
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