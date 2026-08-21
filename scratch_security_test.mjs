const SUPABASE_FUNCTIONS_URL = "https://nrgmjczvxchyavisdalq.supabase.co/functions/v1";

async function loginUser(email, password = "Password123!") {
  const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Login failed for ${email} (status ${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function runTestSuite() {
  console.log("=================================================");
  console.log("SAARTHI PORTAL FULL SECURITY & INTEGRATION SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extra = "") {
    if (condition) {
      console.log(`✅ PASS: ${testName} ${extra}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${extra}`);
      failed++;
    }
  }

  // 1. Unauthenticated barrier check
  console.log("--- 1. Anonymous Access Protection (401 Expected) ---");
  for (const fn of ["filters", "reports", "resume-match", "upload-file", "admin-api", "users-manage", "jobs-api"]) {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert(res.status === 401, `Anonymous request to /${fn} blocked with 401 Unauthorized (got ${res.status})`);
  }

  // 2. Log in all 6 roles
  console.log("\n--- 2. Multi-Role Authentication & Token Issuance ---");
  const roles = [
    { name: "Admin", email: "test@saarthi.com" },
    { name: "Job Seeker", email: "jobstest@saarthi.com" },
    { name: "Employer A", email: "employer2@gmail.com" },
    { name: "Employer B", email: "employer_b@saarthi.com" },
    { name: "Recruiter", email: "recruiter@saarthi.com" },
    { name: "BD", email: "bd@saarthi.com" },
    { name: "IQ Analyst", email: "analyst@saarthi.com" },
  ];

  const authMap = {};
  for (const r of roles) {
    try {
      const auth = await loginUser(r.email);
      authMap[r.name] = auth;
      assert(!!auth.token, `Login as ${r.name} (${r.email}) returned valid JWT`);
    } catch (e) {
      assert(false, `Login as ${r.name} (${r.email})`, e.message);
    }
  }

  const adminAuth = authMap["Admin"];
  const seekerAuth = authMap["Job Seeker"];
  const empAAuth = authMap["Employer A"];
  const empBAuth = authMap["Employer B"];

  // 3. Server-side RBAC Barriers on Admin APIs
  console.log("\n--- 3. Server-Side RBAC Admin Barrier Enforcement ---");
  for (const nonAdminRole of ["Job Seeker", "Employer A", "Employer B", "Recruiter", "BD", "IQ Analyst"]) {
    const auth = authMap[nonAdminRole];
    if (auth?.token) {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/admin-api?path=admin/users`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${auth.token}` },
      });
      assert(res.status === 403, `Non-admin (${nonAdminRole}) cannot access /admin-api?path=admin/users (got ${res.status})`);

      const res2 = await fetch(`${SUPABASE_FUNCTIONS_URL}/users-manage?action=list`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${auth.token}` },
      });
      assert(res2.status === 403, `Non-admin (${nonAdminRole}) cannot access /users-manage (got ${res2.status})`);
    }
  }

  if (adminAuth?.token) {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/admin-api?path=admin/users`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${adminAuth.token}` },
    });
    assert(res.status === 200, `Admin successfully accesses /admin-api?path=admin/users (got ${res.status})`);
  }

  // 4. Employer A/B Data Isolation & Ownership Validation
  console.log("\n--- 4. Employer A/B Data Isolation & Ownership Enforcement ---");
  let jobAId = null;
  let jobBId = null;

  // Employer A posts Job A
  if (empAAuth?.token) {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/jobs-api?path=jobs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${empAAuth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobTitle: "Senior React Architect (Employer A)",
        jobLocation: "Mumbai",
        jobType: ["Full-time"],
        payMin: "2000000",
        payMax: "3000000",
        jobDescription: "Confidential React lead role for Employer A",
        skills: "React, TypeScript, Vite",
        education: "B.Tech",
      }),
    });
    const data = await res.json();
    assert(res.status === 201 && data.job?.id, `Employer A posts Job A (ID: ${data.job?.id})`);
    jobAId = data.job?.id;
  }

  // Employer B posts Job B
  if (empBAuth?.token) {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/jobs-api?path=jobs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${empBAuth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobTitle: "Cloud DevOps Specialist (Employer B)",
        jobLocation: "Bangalore",
        jobType: ["Full-time", "Remote"],
        payMin: "1800000",
        payMax: "2500000",
        jobDescription: "Proprietary cloud infra role for Employer B",
        skills: "AWS, Kubernetes, Terraform",
        education: "B.E",
      }),
    });
    const data = await res.json();
    assert(res.status === 201 && data.job?.id, `Employer B posts Job B (ID: ${data.job?.id})`);
    jobBId = data.job?.id;
  }

  // Check Employer A only sees Job A in my-jobs
  if (empAAuth?.token && jobAId && jobBId) {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/jobs-api?path=jobs/my-jobs`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${empAAuth.token}` },
    });
    const myJobs = await res.json();
    const hasJobA = myJobs.some((j) => j.id === jobAId);
    const hasJobB = myJobs.some((j) => j.id === jobBId);
    assert(hasJobA && !hasJobB, `Employer A sees Job A and CANNOT see Job B in my-jobs`);
  }

  // Check Employer B only sees Job B in my-jobs
  if (empBAuth?.token && jobAId && jobBId) {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/jobs-api?path=jobs/my-jobs`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${empBAuth.token}` },
    });
    const myJobs = await res.json();
    const hasJobA = myJobs.some((j) => j.id === jobAId);
    const hasJobB = myJobs.some((j) => j.id === jobBId);
    assert(!hasJobA && hasJobB, `Employer B sees Job B and CANNOT see Job A in my-jobs`);
  }

  // Cross-tenant update attack: Employer B attempts to edit Job A
  if (empBAuth?.token && jobAId) {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/jobs-api?path=jobs/${jobAId}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${empBAuth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobTitle: "MALICIOUS OVERWRITE BY EMPLOYER B",
      }),
    });
    assert(res.status === 403, `Employer B attempting PUT on Job A is blocked with 403 Forbidden (got ${res.status})`);
  }

  // Cross-tenant delete attack: Employer B attempts to delete Job A
  if (empBAuth?.token && jobAId) {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/jobs-api?path=jobs/${jobAId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${empBAuth.token}` },
    });
    assert(res.status === 403, `Employer B attempting DELETE on Job A is blocked with 403 Forbidden (got ${res.status})`);
  }

  // Job Seeker applies to Job A
  if (seekerAuth?.token && jobAId) {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/jobs-api?path=applications`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${seekerAuth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        job_id: jobAId,
        applicant_name: "Jobs Test User",
        applicant_email: "jobstest@saarthi.com",
        applicant_mobile: "9876543210",
        city: "Mumbai",
        state: "Maharashtra",
        experience: "5 years",
        cv_url: "https://example.com/resumes/jobstest.pdf",
      }),
    });
    assert(res.status === 201, `Job Seeker successfully applies to Job A`);
  }

  // Employer A views applicants for Job A
  if (empAAuth?.token && jobAId) {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/jobs-api?path=applications/for-job&job_id=${jobAId}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${empAAuth.token}` },
    });
    const apps = await res.json();
    assert(Array.isArray(apps) && apps.length > 0, `Employer A can view applicants for Job A (${apps.length} found)`);
  }

  // Cross-tenant applicant leak attack: Employer B attempts to view applicants for Job A
  if (empBAuth?.token && jobAId) {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/jobs-api?path=applications/for-job&job_id=${jobAId}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${empBAuth.token}` },
    });
    assert(res.status === 403, `Employer B attempting to view applicants for Job A is blocked with 403 Forbidden (got ${res.status})`);
  }

  // Legitimate update & delete by Employer A on Job A
  if (empAAuth?.token && jobAId) {
    const resUpdate = await fetch(`${SUPABASE_FUNCTIONS_URL}/jobs-api?path=jobs/${jobAId}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${empAAuth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobTitle: "Senior React Architect (Updated by Employer A)",
      }),
    });
    assert(resUpdate.status === 200, `Employer A can legally update Job A`);

    const resDelete = await fetch(`${SUPABASE_FUNCTIONS_URL}/jobs-api?path=jobs/${jobAId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${empAAuth.token}` },
    });
    assert(resDelete.status === 200, `Employer A can legally delete Job A`);
  }

  // Cleanup Job B
  if (empBAuth?.token && jobBId) {
    await fetch(`${SUPABASE_FUNCTIONS_URL}/jobs-api?path=jobs/${jobBId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${empBAuth.token}` },
    });
  }

  // 5. Admin Panel Endpoints Verification
  console.log("\n--- 5. Admin Panel Governance Endpoints Verification ---");
  if (adminAuth?.token) {
    const resStats = await fetch(`${SUPABASE_FUNCTIONS_URL}/admin-api?path=admin/dashboard`, {
      headers: { "Authorization": `Bearer ${adminAuth.token}` },
    });
    const statsData = await resStats.json();
    assert(resStats.status === 200 && statsData.stats, `Admin Dashboard stats endpoint returns live stats`);

    const resAdminList = await fetch(`${SUPABASE_FUNCTIONS_URL}/admin-api?path=admin/auth/list`, {
      headers: { "Authorization": `Bearer ${adminAuth.token}` },
    });
    const adminListData = await resAdminList.json();
    assert(resAdminList.status === 200 && Array.isArray(adminListData.admins), `Manage Admins list endpoint returns admin accounts`);

    const resApprovals = await fetch(`${SUPABASE_FUNCTIONS_URL}/admin-api?path=admin/employer-approvals`, {
      headers: { "Authorization": `Bearer ${adminAuth.token}` },
    });
    const approvalsData = await resApprovals.json();
    assert(resApprovals.status === 200 && Array.isArray(approvalsData.pending), `Employer Approvals endpoint returns pending registrations`);

    const resResumes = await fetch(`${SUPABASE_FUNCTIONS_URL}/admin-api?path=admin/resumes`, {
      headers: { "Authorization": `Bearer ${adminAuth.token}` },
    });
    const resumesData = await resResumes.json();
    assert(resResumes.status === 200 && Array.isArray(resumesData.resumes), `Resume Sync & Storage endpoint returns resumes`);

    const resEmail = await fetch(`${SUPABASE_FUNCTIONS_URL}/admin-api?path=admin/send-email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${adminAuth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipients: "test@saarthi.com",
        subject: "Test Broadcast",
        message: "Hello from admin broadcast",
      }),
    });
    assert(resEmail.status === 200, `Broadcast Email endpoint successfully accepts broadcast`);
  }

  // 6. Saarthi IQ & Candidate Search Features
  console.log("\n--- 6. Candidate Intelligence & Filter Endpoints Verification ---");
  if (authMap["IQ Analyst"]?.token) {
    const resFilters = await fetch(`${SUPABASE_FUNCTIONS_URL}/filters?action=options`, {
      headers: { "Authorization": `Bearer ${authMap["IQ Analyst"].token}` },
    });
    const filterOptions = await resFilters.json();
    assert(resFilters.status === 200 && Array.isArray(filterOptions.departments), `Candidate Search filter options endpoint returns departments and positions`);

    const resSearch = await fetch(`${SUPABASE_FUNCTIONS_URL}/filters?action=search`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${authMap["IQ Analyst"].token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const searchResults = await resSearch.json();
    assert(resSearch.status === 200 && Array.isArray(searchResults.results), `Candidate Search search action returns candidate results`);

    const resReports = await fetch(`${SUPABASE_FUNCTIONS_URL}/reports?action=report-data`, {
      headers: { "Authorization": `Bearer ${authMap["IQ Analyst"].token}` },
    });
    const reportsData = await resReports.json();
    assert(resReports.status === 200 && Array.isArray(reportsData.data), `Activity Reports endpoint returns activity data`);
  }

  console.log("\n=================================================");
  console.log(`FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");
}

runTestSuite().catch(console.error);
