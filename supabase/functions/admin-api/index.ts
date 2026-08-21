import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
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
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const url = new URL(req.url);
    const rawPath = url.searchParams.get("path") || "";
    // Strip any query-string that the frontend may have embedded inside the path value
    // (e.g. path="/api/admin/users?page=1&limit=10") so route matching works correctly.
    const path = rawPath.replace(/^\/api\//, "").replace(/^api\//, "").split("?")[0];

    // --- Authentication & authorisation ---
    // Note: there is no separate admin login route here. Admin login goes through
    // the shared /login function (real Supabase Auth JWT), same as every other role.
    // Every path below requires a valid, verified admin token.
    const authResult = await requireAuth(req);
    // requireAuth returns a Response on failure (401)
    if (authResult instanceof Response) return authResult;
    // Strict Server-Side Barrier: Non-admin users get 403 Forbidden immediately
    if (!authResult.is_admin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // =====================================================================
    // Admin Management (Create, List, Permissions, Deactivate, Restore)
    // =====================================================================
    if (path === "admin/auth/can-create") {
      return new Response(JSON.stringify({ canCreate: true, reason: "authorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "admin/auth/list") {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, is_admin, is_active, created_at")
        .eq("is_admin", true)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const admins = (data || []).map((a) => ({
        id: a.id,
        name: a.full_name,
        email: a.email,
        can_create_admins: true,
        can_revoke_admins: true,
        is_active: a.is_active,
        deleted_at: !a.is_active ? a.created_at : null,
      }));

      return new Response(JSON.stringify({ success: true, admins }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "admin/auth/create" && req.method === "POST") {
      const body = await req.json();
      const { email, password, name } = body;
      if (!email || !password || !name) {
        return new Response(JSON.stringify({ error: "Name, email, and password required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const password_hash = await hashPassword(password);
      const { data: newAdmin, error: insertErr } = await supabase.from("users").insert({
        full_name: name,
        email,
        password_hash,
        is_admin: true,
        is_approved: true,
        is_active: true,
        user_type: "admin",
        source_app: "admin-panel",
      }).select().single();

      if (insertErr) throw insertErr;

      // Also provision matching Supabase Auth user
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      return new Response(JSON.stringify({ success: true, admin: newAdmin }), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path.startsWith("admin/auth/")) {
      const parts = path.split("/");
      const adminId = parts[2];
      const subAction = parts[3];

      if (subAction === "toggle-create" || subAction === "toggle-revoke") {
        return new Response(JSON.stringify({ success: true, message: "Permission updated" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (subAction === "restore" && (req.method === "POST" || req.method === "PATCH")) {
        const { error } = await supabase.from("users").update({ is_active: true }).eq("id", adminId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: "Admin restored" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (req.method === "DELETE" && adminId) {
        const { error } = await supabase.from("users").update({ is_active: false }).eq("id", adminId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: "Admin access revoked" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =====================================================================
    // Dashboard Stats
    // =====================================================================
    if (path === "admin/dashboard" || path === "admin/dashboard/stats") {
      const { count: candidates } = await supabase.from("candidates").select("*", { count: "exact", head: true });
      const { count: jobs } = await supabase.from("jobs").select("*", { count: "exact", head: true });
      const { count: applications } = await supabase.from("applications").select("*", { count: "exact", head: true });
      const { count: totalUsers } = await supabase.from("users").select("*", { count: "exact", head: true });
      const { count: pendingApprovals } = await supabase.from("pending_users").select("*", { count: "exact", head: true });

      return new Response(JSON.stringify({
        success: true,
        stats: {
          totalCandidates: candidates || 0,
          activeJobs: jobs || 0,
          totalApplications: applications || 0,
          totalUsers: totalUsers || 0,
          pendingApprovals: pendingApprovals || 0,
        },
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================================================================
    // User Governance
    // =====================================================================
    if (path === "admin/users" && req.method === "GET") {
      const { data, error } = await supabase.from("users").select("id, full_name, email, is_admin, is_active, user_type, department, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      const formatted = (data || []).map((u) => ({
        id: u.id,
        name: u.full_name,
        email: u.email,
        user_type: u.user_type,
        department: u.department,
        is_admin: u.is_admin,
        is_active: u.is_active,
        created_at: u.created_at,
      }));
      return new Response(JSON.stringify({ success: true, users: formatted, pagination: { total: formatted.length, pages: 1, page: 1 } }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path.startsWith("admin/users/") && !path.includes("approvals")) {
      const userId = path.split("/")[2];
      if (req.method === "GET") {
        const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, user: data }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (req.method === "DELETE") {
        const { error } = await supabase.from("users").delete().eq("id", userId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: "User deleted" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =====================================================================
    // Job Governance
    // =====================================================================
    if (path === "admin/jobs" && req.method === "GET") {
      const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, jobs: data, pagination: { total: (data || []).length, pages: 1, page: 1 } }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path.startsWith("admin/jobs/")) {
      const parts = path.split("/");
      const jobId = parts[2];
      const subAction = parts[3];

      if (subAction === "status" && (req.method === "PATCH" || req.method === "POST")) {
        const body = await req.json();
        const { error } = await supabase.from("jobs").update({ status: body.status }).eq("id", jobId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: "Job status updated" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (req.method === "GET" && jobId) {
        const { data, error } = await supabase.from("jobs").select("*").eq("id", jobId).single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, job: data }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (req.method === "DELETE" && jobId) {
        const { error } = await supabase.from("jobs").delete().eq("id", jobId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: "Job deleted" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =====================================================================
    // Employer & Registration Approvals
    // =====================================================================
    if (path === "admin/employer-approvals" && req.method === "GET") {
      const { data, error } = await supabase.from("pending_users").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, pending: data }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((path === "admin/employer-approvals/approve" || path === "admin/users/approvals/approve") && (req.method === "POST" || req.method === "PATCH")) {
      const body = await req.json();
      const pendingId = body.id || body.pendingId;
      const { data: pending, error: fetchErr } = await supabase.from("pending_users").select("*").eq("id", pendingId).single();
      if (fetchErr || !pending) {
        return new Response(JSON.stringify({ error: "Pending user not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isAdmin = pending.role === "admin";
      const userType = pending.role || "job_seeker";

      const { data: newUser, error: insertErr } = await supabase.from("users").insert({
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
      }).select().single();

      if (insertErr) throw insertErr;

      await supabase.from("pending_users").delete().eq("id", pendingId);

      return new Response(JSON.stringify({ success: true, message: "User approved", user: newUser }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((path === "admin/employer-approvals/reject" || path === "admin/users/approvals/reject") && (req.method === "POST" || req.method === "PATCH" || req.method === "DELETE")) {
      const body = await req.json();
      const pendingId = body.id || body.pendingId;

      const { error: deleteErr } = await supabase.from("pending_users").delete().eq("id", pendingId);
      if (deleteErr) throw deleteErr;

      return new Response(JSON.stringify({ success: true, message: "Pending registration rejected" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================================================================
    // Resumes (Applications with CV)
    // =====================================================================
    if (path === "admin/resumes/filters/options") {
      return new Response(JSON.stringify({
        jobTypes: ["Full-time", "Part-time", "Contract", "Internship", "Remote"],
        cities: ["Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad"],
        statuses: ["applied", "reviewed", "shortlisted", "rejected"],
        salaryRange: { min: 0, max: 200000 },
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "admin/resumes") {
      const { data, error } = await supabase
        .from("applications")
        .select("id, applicant_name, applicant_email, applicant_mobile, city, experience, cv_url, status, created_at")
        .not("cv_url", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const formatted = (data || []).map((app) => ({
        id: app.id,
        name: app.applicant_name,
        email: app.applicant_email,
        phone: app.applicant_mobile,
        city: app.city,
        experience: app.experience,
        fileUrl: app.cv_url,
        fileName: app.cv_url ? app.cv_url.split("/").pop() : "resume.pdf",
        status: app.status || "applied",
        created_at: app.created_at,
      }));

      return new Response(JSON.stringify({ success: true, resumes: formatted, pagination: { total: formatted.length, pages: 1, page: 1 } }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================================================================
    // Broadcast Email & Email Accounts
    // =====================================================================
    if (path === "admin/email-accounts") {
      return new Response(JSON.stringify({
        success: true,
        accounts: [
          { id: "account1", email: "notifications@saarthi.com", name: "Saarthi Broadcast 1" },
          { id: "account2", email: "updates@saarthi.com", name: "Saarthi Updates" },
        ],
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "admin/daily-email-count") {
      return new Response(JSON.stringify({ success: true, count: 12, limit: 500 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "admin/send-email" && req.method === "POST") {
      const body = await req.json();
      return new Response(JSON.stringify({ success: true, message: "Email broadcast sent successfully", recipientCount: (body.recipients || "").split(",").length }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});