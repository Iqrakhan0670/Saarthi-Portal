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
    const rawPath = url.searchParams.get("path") || "";
    // Strip any query-string that the frontend may have embedded inside the path value
    // (e.g. path="/api/jobs/browse/all?page=1") so route matching works correctly.
    const path = rawPath.replace(/^\/api\//, "").replace(/^api\//, "").split("?")[0];

    // =====================================================================
    // Public routes (no auth required)
    // =====================================================================

    // Jobs listing (public browsing for job seekers)
    if (path === "jobs/browse/all") {
      const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, jobs: data }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generic profile-related empty responses (so UI doesn't crash on legacy routes)
    if (path.startsWith("userskills") || path.startsWith("usereducations") || path.startsWith("useremployments") || path.startsWith("userinternships") || path.startsWith("useraccomplishments") || path.startsWith("userprojects") || path.startsWith("userlanguages")) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================================================================
    // Authenticated routes — all routes below require a valid token
    // =====================================================================
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    // Candidate search (authenticated)
    if (path === "candidates/search") {
      const { data, error } = await supabase.from("candidates").select("*").limit(100);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, candidates: data }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User Profile
    if (path === "userprofile") {
      if (req.method === "GET") {
        const { data, error } = await supabase.from("users").select("id, full_name, email, phone, location, department, user_type").eq("id", authResult.id).single();
        if (error || !data) return new Response(JSON.stringify({ success: true, profile: {} }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ success: true, profile: data }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (req.method === "PUT" || req.method === "POST") {
        const body = await req.json();
        const { error } = await supabase.from("users").update({
          full_name: body.full_name || body.name,
          phone: body.phone,
          location: body.location,
          department: body.department,
        }).eq("id", authResult.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: "Profile updated" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Posting Profile (employer profile)
    if (path === "postingprofile") {
      if (req.method === "GET") {
        const { data, error } = await supabase.from("users").select("id, full_name, email, phone, company_name, location").eq("id", authResult.id).single();
        if (error || !data) return new Response(JSON.stringify({ success: true, profile: {} }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify(data), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (req.method === "PUT" || req.method === "POST") {
        const body = await req.json();
        const { error } = await supabase.from("users").update({
          full_name: body.full_name || body.name,
          company_name: body.company_name || body.companyName,
          phone: body.phone,
          location: body.location,
        }).eq("id", authResult.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: "Posting profile updated" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =====================================================================
    // Jobs Routes (Strict Employer Scoping & Ownership Verification)
    // =====================================================================

    // Post a new job
    if (path === "jobs" && req.method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase.from("jobs").insert({
        user_id: authResult.id,
        posting_as: body.postingAs || null,
        consultancy_hiring_for: body.consultancyHiringFor || null,
        company_name: body.companyName || null,
        job_title: body.jobTitle || body.job_title,
        job_location: body.jobLocation || body.job_location,
        job_type: JSON.stringify(body.jobType || body.job_type || []),
        skills: body.skills,
        education: body.education,
        languages: body.languages || null,
        pay_min: body.payMin || body.pay_min,
        pay_max: body.payMax || body.pay_max,
        job_description: body.jobDescription || body.job_description,
        work_experience: body.workExperience || body.work_experience,
        responsibilities: body.responsibilities,
        benefits: body.benefits,
        about_company: body.aboutCompany || body.about_company,
      }).select();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, job: data[0] }), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get employer's own posted jobs (supports both /jobs and /jobs/my-jobs)
    if ((path === "jobs" || path === "jobs/my-jobs") && req.method === "GET") {
      const { data, error } = await supabase.from("jobs").select("*").eq("user_id", authResult.id).order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data || []), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Specific job operations: GET, PUT, DELETE /jobs/:id
    if (path.startsWith("jobs/")) {
      const pathSegments = path.split("/");
      const jobId = pathSegments[1];

      if (jobId && jobId !== "my-jobs" && jobId !== "browse") {
        // Fetch job to verify existence and ownership
        const { data: job, error: jobErr } = await supabase.from("jobs").select("*").eq("id", jobId).single();
        if (jobErr || !job) {
          return new Response(JSON.stringify({ error: "Job not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // GET single job
        if (req.method === "GET") {
          return new Response(JSON.stringify(job), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // PUT/PATCH update job - Verify ownership
        if (req.method === "PUT" || req.method === "PATCH") {
          if (job.user_id !== authResult.id && !authResult.is_admin) {
            return new Response(JSON.stringify({ error: "Forbidden: You do not own this job" }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          const body = await req.json();
          const updateData: any = {};
          if (body.jobTitle !== undefined || body.job_title !== undefined) updateData.job_title = body.jobTitle || body.job_title;
          if (body.jobLocation !== undefined || body.job_location !== undefined) updateData.job_location = body.jobLocation || body.job_location;
          if (body.jobType !== undefined || body.job_type !== undefined) updateData.job_type = JSON.stringify(body.jobType || body.job_type);
          if (body.skills !== undefined) updateData.skills = body.skills;
          if (body.education !== undefined) updateData.education = body.education;
          if (body.languages !== undefined) updateData.languages = body.languages;
          if (body.payMin !== undefined || body.pay_min !== undefined) updateData.pay_min = body.payMin || body.pay_min;
          if (body.payMax !== undefined || body.pay_max !== undefined) updateData.pay_max = body.payMax || body.pay_max;
          if (body.jobDescription !== undefined || body.job_description !== undefined) updateData.job_description = body.jobDescription || body.job_description;
          if (body.workExperience !== undefined || body.work_experience !== undefined) updateData.work_experience = body.workExperience || body.work_experience;
          if (body.responsibilities !== undefined) updateData.responsibilities = body.responsibilities;
          if (body.benefits !== undefined) updateData.benefits = body.benefits;
          if (body.aboutCompany !== undefined || body.about_company !== undefined) updateData.about_company = body.aboutCompany || body.about_company;
          if (body.status !== undefined) updateData.status = body.status;

          const { data: updated, error: updateErr } = await supabase.from("jobs").update(updateData).eq("id", jobId).select().single();
          if (updateErr) throw updateErr;

          return new Response(JSON.stringify({ success: true, job: updated }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // DELETE job - Verify ownership
        if (req.method === "DELETE") {
          if (job.user_id !== authResult.id && !authResult.is_admin) {
            return new Response(JSON.stringify({ error: "Forbidden: You do not own this job" }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          const { error: deleteErr } = await supabase.from("jobs").delete().eq("id", jobId);
          if (deleteErr) throw deleteErr;

          return new Response(JSON.stringify({ success: true, message: "Job deleted" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // =====================================================================
    // Applications Routes (Strict Scoping & Permission Checks)
    // =====================================================================

    // Submit an application
    if (path === "applications" && req.method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase.from("applications").insert({
        user_id: authResult.id,
        job_id: body.job_id,
        applicant_name: body.applicant_name,
        applicant_email: body.applicant_email,
        applicant_mobile: body.applicant_mobile,
        city: body.city,
        state: body.state,
        experience: body.experience,
        cv_url: body.cv_url,
        cv_text: body.cv_text,
        status: "applied",
      }).select();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, application: data[0] }), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's own submitted applications
    if (path === "applications" && req.method === "GET") {
      const { data, error } = await supabase.from("applications").select("*, jobs(*)").eq("user_id", authResult.id).order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data || []), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "applications/my-applications") {
      const { data, error } = await supabase.from("applications").select("*, jobs(*)").eq("user_id", authResult.id).order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, applications: data || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get applications for a specific job (handles /applications/for-job and /applications/:jobId)
    if (path === "applications/for-job" || (path.startsWith("applications/") && !path.includes("my-applications"))) {
      let jobId = url.searchParams.get("job_id");
      if (!jobId && path.startsWith("applications/")) {
        const idParam = path.split("/")[1];
        if (idParam && !isNaN(Number(idParam))) {
          jobId = idParam;
        }
      }

      if (jobId) {
        // Verify the caller owns the job
        const { data: job, error: jobErr } = await supabase
          .from("jobs")
          .select("id, user_id")
          .eq("id", jobId)
          .single();

        if (jobErr || !job) {
          return new Response(
            JSON.stringify({ error: "Job not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (job.user_id !== authResult.id && !authResult.is_admin) {
          return new Response(
            JSON.stringify({ error: "Forbidden: You do not own this job" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const { data, error } = await supabase.from("applications").select("*").eq("job_id", jobId).order("created_at", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify(data || []), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =====================================================================
    // Saved Candidates (Scoped to caller)
    // =====================================================================
    if (path === "saved-candidates" || path.startsWith("saved-candidates")) {
      if (req.method === "GET") {
        const { data, error } = await supabase.from("saved_candidates").select("*").eq("user_id", authResult.id);
        if (error) throw error;
        return new Response(JSON.stringify(data || []), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (req.method === "POST") {
        const body = await req.json();
        const { data, error } = await supabase.from("saved_candidates").insert({
          user_id: authResult.id,
          candidate_id: body.candidate_id,
          first_name: body.first_name,
          last_name: body.last_name,
          email: body.email,
          location: body.location,
          resume_url: body.resume_url,
          profile_summary: body.profile_summary,
        }).select();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, saved: data[0] }), {
          status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (req.method === "DELETE") {
        const id = path.split("/")[1] || url.searchParams.get("id");
        if (id) {
          const { error } = await supabase.from("saved_candidates").delete().eq("id", id).eq("user_id", authResult.id);
          if (error) throw error;
          return new Response(JSON.stringify({ success: true, message: "Saved candidate removed" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // =====================================================================
    // Interviews (Scoped to caller's jobs or applications)
    // =====================================================================
    if (path === "interviews/schedule" || path === "scheduled-interviews") {
      if (req.method === "POST") {
        const body = await req.json();
        const { data, error } = await supabase.from("scheduled_interviews").insert({
          application_id: body.application_id,
          interview_date: body.interview_date,
          interview_time: body.interview_time,
          interview_title: body.interview_title || "Job Interview",
          interview_mode: body.interview_mode || "Online",
          meeting_link: body.meeting_link,
          notes: body.notes,
          interviewer: body.interviewer,
          status: "Scheduled",
        }).select();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, interview: data[0] }), {
          status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (req.method === "GET") {
        const { data, error } = await supabase
          .from("scheduled_interviews")
          .select("*, applications(*, jobs(*))")
          .order("created_at", { ascending: false });
        if (error) throw error;

        const scoped = (data || []).filter((interview: any) => {
          const app = interview.applications;
          if (!app) return false;
          if (app.user_id === authResult.id) return true;
          if (app.jobs && app.jobs.user_id === authResult.id) return true;
          return false;
        });

        return new Response(JSON.stringify(scoped), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (path === "interviews" && req.method === "GET") {
      const { data, error } = await supabase
        .from("scheduled_interviews")
        .select("*, applications(*, jobs(*))")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const scoped = (data || []).filter((interview: any) => {
        const app = interview.applications;
        if (!app) return false;
        if (app.user_id === authResult.id) return true;
        if (app.jobs && app.jobs.user_id === authResult.id) return true;
        return false;
      });

      return new Response(JSON.stringify({ success: true, interviews: scoped }), {
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