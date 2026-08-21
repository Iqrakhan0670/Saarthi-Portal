import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, password } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single();

    if (error || !user) {
      return new Response(JSON.stringify({ success: false, message: "Invalid credentials" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const incomingHash = await hashPassword(password);
    if (incomingHash !== user.password_hash) {
      return new Response(JSON.stringify({ success: false, message: "Invalid credentials" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Auto-provision: ensure a matching Supabase Auth user exists ---
    // Attempt createUser; "User already registered" is expected and ignored.
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError && !(createError.message.toLowerCase().includes("already") || createError.status === 422 || createError.code === "email_exists")) {
      return new Response(JSON.stringify({ success: false, message: "Auth provisioning failed: " + createError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Sign in with anon client to obtain a real JWT session ---
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: sessionData, error: signInError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError || !sessionData?.session) {
      return new Response(JSON.stringify({ success: false, message: "Sign-in failed: " + (signInError?.message ?? "no session") }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = sessionData.session.access_token;

    return new Response(JSON.stringify({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.user_type || "job_seeker",
      },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});