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
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ message: "Email and password required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return new Response(JSON.stringify({ message: "Invalid email or password" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const incomingHash = await hashPassword(password);

    if (incomingHash !== user.password_hash) {
      return new Response(JSON.stringify({ message: "Invalid email or password" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user.is_approved) {
      return new Response(JSON.stringify({ message: "Account pending approval", pending: true }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Auto-provision: ensure a matching Supabase Auth user exists ---
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    // --- Sign in to get a real Supabase JWT session ---
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    let sessionData: any;
    let signInError: any;

    const firstAttempt = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    sessionData = firstAttempt.data;
    signInError = firstAttempt.error;

    // If password mismatch in Supabase Auth (e.g. password was reset/updated in DB),
    // sync the password into Supabase Auth and retry sign in.
    if (signInError || !sessionData?.session) {
      const { data: userList } = await supabase.auth.admin.listUsers();
      const existingUser = userList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        await supabase.auth.admin.updateUserById(existingUser.id, { password, email_confirm: true });
        const retryAttempt = await anonClient.auth.signInWithPassword({
          email,
          password,
        });
        sessionData = retryAttempt.data;
        signInError = retryAttempt.error;
      }
    }

    if (signInError || !sessionData?.session) {
      return new Response(JSON.stringify({ message: "Sign-in failed: " + (signInError?.message ?? "no session") }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = sessionData.session.access_token;

    return new Response(
      JSON.stringify({
        require2fa: false,
        token,
        id: user.id,
        name: user.full_name,
        email: user.email,
        department: user.department,
        employee_id: user.employee_id,
        is_admin: user.is_admin,
        role: user.user_type || (user.is_admin ? "admin" : "job_seeker"),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});