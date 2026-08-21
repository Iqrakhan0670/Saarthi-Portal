import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authUser = await requireAuth(req);
    if (authUser instanceof Response) return authUser;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "search";

    if (action === "options") {
      // Return distinct filter options from candidates table
      const { data, error } = await supabase.from("candidates").select("department, current_position, location, skills");
      if (error) throw error;

      const departments = [...new Set(data.map((d) => d.department).filter(Boolean))];
      const positions = [...new Set(data.map((d) => d.current_position).filter(Boolean))];
      const locations = [...new Set(data.map((d) => d.location).filter(Boolean))];

      return new Response(JSON.stringify({ departments, positions, locations }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "search") {
      const body = req.method === "POST" ? await req.json() : {};
      let query = supabase.from("candidates").select("*");

      if (body.department) query = query.eq("department", body.department);
      if (body.location) query = query.ilike("location", `%${body.location}%`);
      if (body.skills) query = query.ilike("skills", `%${body.skills}%`);

      const { data, error } = await query.limit(100);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, results: data }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "mark-viewed") {
      const body = await req.json();
      const { error } = await supabase.from("contact_views").insert({
        profile_id: body.profileId,
        viewer_user_id: authUser.id,
        viewer_name: body.viewerName || "",
        viewer_department: body.viewerDepartment || "",
      });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});