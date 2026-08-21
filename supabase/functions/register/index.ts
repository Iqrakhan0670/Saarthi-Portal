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
    const body = await req.json();
    const { name, email, password, phone, department, role } = body;

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ message: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Check if already exists in users or pending_users
    const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).single();
    const { data: existingPending } = await supabase.from("pending_users").select("id").eq("email", email).single();

    if (existingUser || existingPending) {
      return new Response(JSON.stringify({ message: "Email already registered" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const password_hash = await hashPassword(password);

    const { error } = await supabase.from("pending_users").insert({
      name,
      email,
      password_hash,
      department: department || "",
      phone: phone || null,
      role: role || "job_seeker",
    });

    if (error) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also provision a matching Supabase Auth user immediately so the Auth record
    // exists by the time the account is approved and the user signs in.
    // email_confirm: true skips the confirmation email (approval is handled separately).
    // We intentionally ignore errors here — if Auth provisioning fails the registration
    // still succeeds; the auto-provision fallback in login/jobs-login will cover it.
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    return new Response(JSON.stringify({ success: true, message: "Registered, pending approval" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});