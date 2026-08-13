import express from "express";
import db from "../config/database.js";
import jwt from "jsonwebtoken";
import { getEnv } from '../utils/envLoader.js'; // Added import

const router = express.Router();

// Middleware to verify JWT token for authenticated routes
const authenticateToken = (req, res, next) => {
  console.log("🔍 Authenticating token...");
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  console.log("Token received:", token ? "Present" : "Missing");
  console.log("Authorization header:", authHeader ? "Present" : "Missing");
  
  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, getEnv('JWT_SECRET'));
    console.log("Decoded token:", decoded);
    req.user = decoded;
    console.log("✅ Token authenticated, user:", decoded.email, "ID:", decoded.id, "Type:", decoded.userType);
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    console.error("Token:", token.substring(0, 20) + "...");
    console.error("JWT_SECRET used:", getEnv('JWT_SECRET') ? "Present" : "Missing");
    return res.status(403).json({ error: "Invalid or expired token", details: error.message });
  }
};

// POST /api/scheduled-interviews - Schedule a new interview (requires auth, job_poster)
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log("📥 Received POST /api/scheduled-interviews request");
    console.log("Request body:", req.body);  // Log incoming data
    console.log("User from token:", req.user);  // Log decoded user

    const userType = req.user.userType || req.user.role;
    if (userType !== "job_poster") {
      console.log("❌ User type not job_poster:", userType);
      return res.status(403).json({ error: "Only job posters can schedule interviews" });
    }

    const { 
      application_id, 
      interview_date, 
      interview_time,
      interview_title,
      interview_mode,
      meeting_link,
      notes,
      interviewer,
      status
    } = req.body;

    // Validate required fields
    if (!application_id || !interview_date || !interview_time) {
      console.log("❌ Missing required fields:", { application_id, interview_date, interview_time });
      return res.status(400).json({ error: 'Missing required fields: application_id, interview_date, interview_time' });
    }

    console.log("🔍 Checking application existence and ownership...");
    // Verify the application belongs to one of the user's jobs and status is not already 'hired' or 'rejected'
    const [existingApps] = await db.query(`
      SELECT a.id, a.status, j.user_id 
      FROM applications a 
      JOIN jobs j ON a.job_id = j.id 
      WHERE a.id = ?
    `, [application_id]);
    console.log("Found apps:", existingApps.length, existingApps[0] || "None");

    if (existingApps.length === 0) {
      console.log("❌ Application not found for ID:", application_id);
      return res.status(404).json({ error: 'Application not found' });
    }

    const app = existingApps[0];
    // Convert both to numbers for comparison to handle string/number type mismatch
    const appUserId = Number(app.user_id);
    const reqUserId = Number(req.user.id);
    console.log("App status:", app.status, "Job user_id:", appUserId, "Req user id:", reqUserId);
    if (appUserId !== reqUserId) {
      console.log("❌ User ID mismatch");
      return res.status(403).json({ error: 'Unauthorized to schedule interview for this application' });
    }

    if (app.status === 'hired' || app.status === 'rejected') {
      console.log("❌ Invalid status for scheduling:", app.status);
      return res.status(400).json({ error: 'Cannot schedule interview for hired or rejected applications' });
    }

    // Check if interview already scheduled
    const [existingInterview] = await db.query(
      'SELECT id FROM scheduled_interviews WHERE application_id = ?',
      [application_id]
    );
    console.log("Existing interview count:", existingInterview.length);
    if (existingInterview.length > 0) {
      console.log("❌ Duplicate interview for app ID:", application_id);
      return res.status(409).json({ error: 'Interview already scheduled for this application' });
    }

    console.log("📤 Starting transaction for insert/update...");
    
    // Start transaction
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      console.log("Transaction begun");

      // Insert into scheduled_interviews with all new columns
      const [insertResult] = await connection.query(
        `INSERT INTO scheduled_interviews 
          (application_id, interview_date, interview_time, interview_title, interview_mode, meeting_link, notes, interviewer, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          application_id, 
          interview_date, 
          interview_time, 
          interview_title || 'Job Interview', 
          interview_mode || 'Online', 
          meeting_link || null, 
          notes || null, 
          interviewer || null, 
          status || 'Scheduled'
        ]
      );
      console.log("Insert result:", insertResult.insertId, "Affected:", insertResult.affectedRows);

      // Update application status to 'interview'
      const [updateResult] = await connection.query(
        'UPDATE applications SET status = \'interview\' WHERE id = ?',
        [application_id]
      );
      console.log("Update result:", updateResult.affectedRows);

      await connection.commit();
      console.log("✅ Transaction committed");

      res.status(201).json({ 
        success: true, 
        message: 'Interview scheduled successfully',
        id: insertResult.insertId 
      });
    } catch (txError) {
      console.error("❌ Transaction error:", txError.message, txError.code, txError.sqlMessage || "No SQL message");
      await connection.rollback();
      throw txError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Overall POST error:', error.message, error.code, error.sqlMessage || "No SQL message");
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(404).json({ error: 'Invalid application ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/scheduled-interviews/:id - Update an existing scheduled interview (requires auth, job_poster)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    console.log("📥 Received PUT /api/scheduled-interviews/:id request, id:", req.params.id);
    console.log("Request body:", req.body);  // Log incoming data

    const userType = req.user.userType || req.user.role;
    if (userType !== "job_poster") {
      console.log("❌ User type not job_poster:", userType);
      return res.status(403).json({ error: "Only job posters can update scheduled interviews" });
    }

    const { 
      interview_date, 
      interview_time,
      interview_title,
      interview_mode,
      meeting_link,
      notes,
      interviewer,
      status
    } = req.body;
    const { id } = req.params;

    // Verify the scheduled interview exists and belongs to user's application
    const [existingInterview] = await db.query(`
      SELECT si.id, si.application_id, a.job_id, j.user_id 
      FROM scheduled_interviews si 
      JOIN applications a ON si.application_id = a.id 
      JOIN jobs j ON a.job_id = j.id 
      WHERE si.id = ?
    `, [id]);
    console.log("Found interview:", existingInterview.length, existingInterview[0] || "None");

    if (existingInterview.length === 0) {
      console.log("❌ Scheduled interview not found for ID:", id);
      return res.status(404).json({ error: 'Scheduled interview not found' });
    }

    const interview = existingInterview[0];
    // Convert both to numbers for comparison
    const interviewUserId = Number(interview.user_id);
    const reqUserId = Number(req.user.id);
    console.log("Job user_id:", interviewUserId, "Req user id:", reqUserId);
    if (interviewUserId !== reqUserId) {
      console.log("❌ User ID mismatch for update");
      return res.status(403).json({ error: 'Unauthorized to update this scheduled interview' });
    }

    // Build update query dynamically
    const fields = [];
    const values = [];
    
    if (interview_date !== undefined) { fields.push('interview_date = ?'); values.push(interview_date); }
    if (interview_time !== undefined) { fields.push('interview_time = ?'); values.push(interview_time); }
    if (interview_title !== undefined) { fields.push('interview_title = ?'); values.push(interview_title); }
    if (interview_mode !== undefined) { fields.push('interview_mode = ?'); values.push(interview_mode); }
    if (meeting_link !== undefined) { fields.push('meeting_link = ?'); values.push(meeting_link); }
    if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }
    if (interviewer !== undefined) { fields.push('interviewer = ?'); values.push(interviewer); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    console.log("📤 Executing dynamic database update query...");
    const [result] = await db.query(
      `UPDATE scheduled_interviews SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    console.log("✅ Scheduled interview updated, affected rows:", result.affectedRows);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Scheduled interview not found' });
    }

    res.json({ 
      success: true, 
      message: 'Scheduled interview updated successfully' 
    });
  } catch (error) {
    console.error('❌ Error updating scheduled interview:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/scheduled-interviews - Get all scheduled interviews for the current user (supports job_poster and job_seeker)
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log("📥 Received GET /api/scheduled-interviews request for current user");
    console.log("User ID:", req.user.id);

    const userType = req.user.userType || req.user.role;
    let query = '';
    let params = [];

    if (userType === "job_poster") {
      console.log("📤 Executing database query for job poster...");
      query = `
        SELECT si.id, si.application_id, si.interview_date, si.interview_time, si.created_at,
               si.interview_title, si.interview_mode, si.meeting_link, si.notes, si.interviewer, si.status,
               a.applicant_name, a.applicant_email, a.applicant_mobile,
               j.job_title, j.job_location, j.company_name
        FROM scheduled_interviews si 
        JOIN applications a ON si.application_id = a.id 
        JOIN jobs j ON a.job_id = j.id 
        WHERE j.user_id = ? 
        ORDER BY si.interview_date, si.interview_time
      `;
      params = [req.user.id];
    } else if (userType === "job_seeker") {
      console.log("📤 Executing database query for job seeker...");
      query = `
        SELECT si.id, si.application_id, si.interview_date, si.interview_time, si.created_at,
               si.interview_title, si.interview_mode, si.meeting_link, si.notes, si.interviewer, si.status,
               a.applicant_name, a.applicant_email, a.applicant_mobile,
               j.job_title, j.job_location, j.company_name
        FROM scheduled_interviews si 
        JOIN applications a ON si.application_id = a.id 
        JOIN jobs j ON a.job_id = j.id 
        WHERE a.user_id = ? 
        ORDER BY si.interview_date, si.interview_time
      `;
      params = [req.user.id];
    } else {
      console.log("❌ Invalid user type:", userType);
      return res.status(403).json({ error: "Unauthorized user type" });
    }

    const [rows] = await db.query(query, params);
    console.log("✅ Fetched scheduled interviews:", rows.length);

    res.json(rows);
  } catch (error) {
    console.error('❌ Error fetching scheduled interviews:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/scheduled-interviews/:id - Cancel a scheduled interview (requires auth, job_poster)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    console.log("📥 Received DELETE /api/scheduled-interviews/:id request, id:", req.params.id);

    const userType = req.user.userType || req.user.role;
    if (userType !== "job_poster") {
      console.log("❌ User type not job_poster:", userType);
      return res.status(403).json({ error: "Only job posters can cancel scheduled interviews" });
    }

    const { id } = req.params;

    // Verify the scheduled interview belongs to user's application
    const [existingInterview] = await db.query(`
      SELECT si.id, si.application_id, a.job_id, j.user_id 
      FROM scheduled_interviews si 
      JOIN applications a ON si.application_id = a.id 
      JOIN jobs j ON a.job_id = j.id 
      WHERE si.id = ?
    `, [id]);
    console.log("Found interview for delete:", existingInterview.length, existingInterview[0] || "None");

    if (existingInterview.length === 0) {
      console.log("❌ Scheduled interview not found for delete ID:", id);
      return res.status(404).json({ error: 'Scheduled interview not found' });
    }

    const interview = existingInterview[0];
    // Convert both to numbers for comparison
    const interviewUserId = Number(interview.user_id);
    const reqUserId = Number(req.user.id);
    console.log("Job user_id:", interviewUserId, "Req user id:", reqUserId);
    if (interviewUserId !== reqUserId) {
      console.log("❌ User ID mismatch for delete");
      return res.status(403).json({ error: 'Unauthorized to cancel this scheduled interview' });
    }

    console.log("📤 Executing database delete query...");
    const [result] = await db.query(
      'DELETE FROM scheduled_interviews WHERE id = ?',
      [id]
    );

    // Optionally update application status back to 'under_review' or something, but for now just delete the schedule
    console.log("✅ Scheduled interview cancelled, affected rows:", result.affectedRows);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Scheduled interview not found' });
    }

    res.json({ 
      success: true, 
      message: 'Scheduled interview cancelled successfully' 
    });
  } catch (error) {
    console.error('❌ Error cancelling scheduled interview:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;