//routes/postjobs.js 
import express from "express";
import db from "../config/database.js";
import jwt from "jsonwebtoken";
import { getEnv } from '../utils/envLoader.js'; // Added import

const router = express.Router();

// ──────────────────────────────────────────────────────────────
// Helper: Safe JSON Parser (Fixes the "Invalid JSON" crash)
// ──────────────────────────────────────────────────────────────
const safeParse = (data) => {
  if (!data) return []; // Handle null/undefined
  if (Array.isArray(data)) return data; // Already an array? Great.
  
  if (typeof data === 'string') {
    const trimmed = data.trim();
    // Try to parse if it looks like a JSON array or object
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(data);
        // If it parsed into a single string/number/object, wrap it in array
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        // Parse failed, treat original string as a single item
        return [data];
      }
    }
    // It's just a plain string (e.g., "Full Time"), wrap in array
    return [data];
  }
  
  // Fallback for numbers or other types
  return [data];
};

// ──────────────────────────────────────────────────────────────
// Middleware – verify JWT
// ──────────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  console.log("Authenticating token...");
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.log("No token provided");
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, getEnv('JWT_SECRET'));
    
    // Check both possible field names
    const userRole = decoded.role || decoded.userType;
    if (userRole !== "job_poster") {
      console.log(`User role is ${userRole}, not job_poster`);
      return res.status(403).json({ error: "Only job posters can perform this action" });
    }
    
    req.user = decoded;
    console.log("Token authenticated for user:", decoded.id);
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};
// ──────────────────────────────────────────────────────────────
// POST – create a new job posting
// ──────────────────────────────────────────────────────────────
router.post("/", authenticateToken, async (req, res) => {
  console.log("Received POST /api/jobs request");
  const {
    postingAs,
    consultancyHiringFor,
    companyName,
    jobTitle,
    jobLocation,
    jobType,
    skills,
    education,
    languages,
    payMin,
    payMax,
    jobDescription,
    workExperience,
    responsibilities,
    benefits,
    aboutCompany,
  } = req.body;

  // ───── Validation ─────
  const requiredFields = [
    { field: postingAs, name: "postingAs" },
    { field: jobTitle, name: "jobTitle" },
    { field: jobLocation, name: "jobLocation" },
    { field: jobType, name: "jobType" },
    { field: skills, name: "skills" },
    { field: education, name: "education" },
    { field: payMin, name: "payMin" },
    { field: payMax, name: "payMax" },
    { field: jobDescription, name: "jobDescription" },
    { field: workExperience, name: "workExperience" },
    { field: responsibilities, name: "responsibilities" },
  ];

  const errors = [];
  requiredFields.forEach(({ field, name }) => {
    if (!field || (typeof field === "string" && field.trim() === "") || (Array.isArray(field) && field.length === 0)) {
      errors.push(`${name} is required`);
    }
  });

  if (postingAs === "consultancy" && (!consultancyHiringFor || consultancyHiringFor.trim() === "")) {
    errors.push("consultancyHiringFor is required when posting as consultancy");
  }

  if (jobType && !Array.isArray(jobType)) {
    errors.push("jobType must be an array of job types");
  }

  if (errors.length > 0) return res.status(400).json({ errors });

  // ───── Insert into DB ─────
  try {
    const [result] = await db.query(
      `INSERT INTO jobs (
        user_id, posting_as, consultancy_hiring_for, company_name, job_title, job_location,
        job_type, skills, education, languages, pay_min, pay_max, job_description,
        work_experience, responsibilities, benefits, about_company, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        req.user.id,
        postingAs,
        consultancyHiringFor || null,
        companyName || null,
        jobTitle,
        jobLocation,
        JSON.stringify(jobType || []),
        skills,
        education,
        languages || null,
        payMin,
        payMax,
        jobDescription,
        workExperience,
        responsibilities,
        benefits || null,
        aboutCompany || null,
      ]
    );
    console.log("Job inserted, ID:", result.insertId);
    res.status(201).json({
      message: "Job posted successfully",
      jobId: result.insertId,
    });
  } catch (error) {
    console.error("Error creating job:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ──────────────────────────────────────────────────────────────
// PUT – update a job posting
// ──────────────────────────────────────────────────────────────
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    postingAs, consultancyHiringFor, companyName, jobTitle, jobLocation, jobType, skills,
    education, languages, payMin, payMax, jobDescription, workExperience, responsibilities,
    benefits, aboutCompany
  } = req.body;

  try {
    const [existing] = await db.query("SELECT id FROM jobs WHERE id = ? AND user_id = ?", [id, req.user.id]);
    if (existing.length === 0) return res.status(404).json({ error: "Job not found or unauthorized" });

    await db.query(
      `UPDATE jobs SET 
        posting_as = ?, consultancy_hiring_for = ?, company_name = ?, job_title = ?, job_location = ?,
        job_type = ?, skills = ?, education = ?, languages = ?, pay_min = ?, pay_max = ?, job_description = ?,
        work_experience = ?, responsibilities = ?, benefits = ?, about_company = ?
        WHERE id = ? AND user_id = ?`,
      [
        postingAs, consultancyHiringFor || null, companyName || null, jobTitle, jobLocation,
        JSON.stringify(jobType || []), skills, education, languages || null, payMin, payMax,
        jobDescription, workExperience, responsibilities, benefits || null, aboutCompany || null,
        id, req.user.id,
      ]
    );

    res.status(200).json({ message: "Job updated successfully", jobId: id });
  } catch (error) {
    console.error("Error updating job:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ──────────────────────────────────────────────────────────────
// DELETE – delete a job posting
// ──────────────────────────────────────────────────────────────
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query("DELETE FROM jobs WHERE id = ? AND user_id = ?", [id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Job not found or unauthorized" });
    res.status(200).json({ message: "Job deleted successfully", jobId: id });
  } catch (error) {
    console.error("Error deleting job:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ──────────────────────────────────────────────────────────────
// GET – all jobs for the authenticated job poster (My Jobs)
// ──────────────────────────────────────────────────────────────
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [jobs] = await db.query("SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC", [req.user.id]);
    
    // Use Safe Parse
    const parsedJobs = jobs.map((job) => ({
      ...job,
      job_type: safeParse(job.job_type),
      // If skills or other fields are JSON, you can safeParse them too:
      // skills: safeParse(job.skills) 
    }));

    res.status(200).json(parsedJobs);
  } catch (error) {
    console.error("Error fetching jobs:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ──────────────────────────────────────────────────────────────
// GET – browse all jobs (Public) - FIXES THE CONSOLE ERRORS
// ──────────────────────────────────────────────────────────────
router.get("/browse/all", async (req, res) => {
  console.log("Received GET /api/jobs/browse/all request");
  try {
    // Join with users table to get the poster's name if needed
    const [jobs] = await db.query(`
      SELECT j.*, u.full_name as poster_name
      FROM jobs j
      LEFT JOIN users u ON j.user_id = u.id
      ORDER BY j.created_at DESC
    `);
    
    // Use Safe Parse so frontend always gets an Array
    const parsedJobs = jobs.map((job) => ({
      ...job,
      job_type: safeParse(job.job_type)
    }));

    res.status(200).json(parsedJobs);
  } catch (error) {
    console.error("Error fetching jobs:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ──────────────────────────────────────────────────────────────
// GET – single job by ID
// ──────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [jobs] = await db.query("SELECT * FROM jobs WHERE id = ?", [id]);
    if (jobs.length === 0) return res.status(404).json({ error: "Job not found" });
    
    const job = jobs[0];
    res.status(200).json({ 
      ...job, 
      job_type: safeParse(job.job_type) 
    });
  } catch (error) {
    console.error("Error fetching job:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;