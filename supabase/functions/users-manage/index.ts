import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    // --- Authentication & authorisation ---
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    if (!authResult.is_admin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "list") {
      const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, users: data }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "pending-users") {
      const { data, error } = await supabase.from("pending_users").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, pendingUsers: data }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "enable-user" || action === "disable-user") {
      const body = await req.json();
      const { error } = await supabase.from("users").update({ is_active: action === "enable-user" }).eq("id", body.userId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      const body = await req.json();
      const pendingId = body.pendingId || body.id;
      const { data: pending, error: fetchErr } = await supabase.from("pending_users").select("*").eq("id", pendingId).single();
      if (fetchErr || !pending) throw new Error("Pending user not found");

      const isAdmin = pending.role === "admin";
      const userType = pending.role || "job_seeker";

      const { error: insertErr } = await supabase.from("users").insert({
        full_name: pending.name,
        email: pending.email,
        password_hash: pending.password_hash,
        department: pending.department || "",
        phone: pending.phone || null,
        is_admin: isAdmin,
        user_type: userType,
        is_approved: true,
        is_active: true,
        source_app: "iq-main",
      });
      if (insertErr) throw insertErr;

      await supabase.from("pending_users").delete().eq("id", pendingId);

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject") {
      const body = await req.json();
      const pendingId = body.pendingId || body.id;
      const { error } = await supabase.from("pending_users").delete().eq("id", pendingId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "system-settings") {
      if (req.method === "GET") {
        return new Response(JSON.stringify({ success: true, settings: { emailAutomation: true } }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});