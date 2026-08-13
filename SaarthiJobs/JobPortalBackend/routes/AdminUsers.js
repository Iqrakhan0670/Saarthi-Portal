import express from "express";
import db from "../config/database.js";
import { authenticateAdmin } from "./AdminAuth.js";
import { sendEmployerApprovalEmail } from "../utils/emailService.js";

const router = express.Router();

// 🔴 IMPORTANT: Approval routes MUST come before /:id route to avoid ID matching conflicts
// Get pending employer approvals
router.get("/approvals/pending", authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'pending'; // Default to pending for backwards compatibility

    // Build WHERE clause based on status filter
    let whereClause = "user_type = 'job_poster'";
    if (status !== 'all') {
      whereClause += ` AND approval_status = '${status}'`;
    }

    const [employers] = await db.query(
      `SELECT id, full_name as name, email, company_name, mobile_number, created_at, approval_status
       FROM users
       WHERE ${whereClause}
       ORDER BY 
         CASE WHEN approval_status = 'pending' THEN 0 ELSE 1 END,
         created_at ASC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Get total count based on filter
    const [totalCount] = await db.query(
      `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`
    );

    res.json({
      employers,
      pagination: {
        total: totalCount[0].total,
        page,
        limit,
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (error) {
    console.error("Get pending approvals error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get approval statistics
router.get("/approvals/stats", authenticateAdmin, async (req, res) => {
  try {
    const [stats] = await db.query(
      `SELECT 
        COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected
       FROM users 
       WHERE user_type = 'job_poster'`
    );

    res.json(stats[0]);
  } catch (error) {
    console.error("Get approval stats error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Approve employer (only for pending employers)
router.patch("/approvals/:id/approve", authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { notes } = req.body;
    const adminId = req.admin.id;

    // Check if user exists and is a job_poster
    const [users] = await db.query(
      `SELECT id, email, company_name, approval_status FROM users WHERE id = ? AND user_type = 'job_poster'`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "Employer not found" });
    }

    const employer = users[0];

    // Only allow approving pending employers
    if (employer.approval_status === 'approved') {
      return res.status(400).json({ error: "Employer is already approved" });
    }

    // Update approval status
    await db.query(
      `UPDATE users
       SET is_approved = 1,
           approval_status = 'approved',
           approval_notes = ?,
           approved_at = NOW(),
           approved_by = ?
       WHERE id = ?`,
      [notes || null, adminId, userId]
    );

    // Send approval email only if status changed from pending to approved
    if (employer.approval_status === 'pending') {
      await sendEmployerApprovalEmail(employer.email, employer.company_name, true, notes);
    }

    res.json({ message: "Employer approved successfully" });
  } catch (error) {
    console.error("Approve employer error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Reject employer (for pending OR already approved employers)
router.patch("/approvals/:id/reject", authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { notes } = req.body;
    const adminId = req.admin.id;

    // Check if user exists and is a job_poster
    const [users] = await db.query(
      `SELECT id, email, company_name, approval_status FROM users WHERE id = ? AND user_type = 'job_poster'`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "Employer not found" });
    }

    const employer = users[0];

    // Update rejection status (can reject pending or already approved employers)
    await db.query(
      `UPDATE users
       SET is_approved = 0,
           approval_status = 'rejected',
           approval_notes = ?,
           approved_at = NOW(),
           approved_by = ?
       WHERE id = ?`,
      [notes || null, adminId, userId]
    );

    // Send rejection email
    await sendEmployerApprovalEmail(employer.email, employer.company_name, false, notes);

    res.json({ message: "Employer rejected successfully" });
  } catch (error) {
    console.error("Reject employer error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 🔴 Below are the general user routes that come AFTER approval-specific routes
// Get all users with pagination and filters
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const userType = req.query.userType;
    const q = (req.query.q || '').trim(); // search query for name or email

    // Select commonly needed fields and alias full_name to name to match frontend
    let baseQuery = `FROM users u`;
    const whereClauses = [];
    const params = [];

    if (userType) {
      whereClauses.push('u.user_type = ?');
      params.push(userType);
    }

    if (q) {
      whereClauses.push('(u.full_name LIKE ? OR u.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const dataQuery = `SELECT u.id, u.full_name as name, u.email, u.user_type, u.mobile_number, u.company_name, u.work_status, u.created_at ${baseQuery} ${whereSql} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;

    const countQuery = `SELECT COUNT(*) as total ${baseQuery} ${whereSql}`;

    // push pagination params for data query
    const dataParams = params.slice();
    dataParams.push(limit, offset);

    const [users] = await db.query(dataQuery, dataParams);
    const [totalCount] = await db.query(countQuery, params);

    res.json({
      users,
      pagination: {
        total: totalCount[0].total,
        page,
        limit,
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get user details with their profile info
router.get("/:id", authenticateAdmin, async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT u.id, u.full_name as name, u.email, u.user_type, u.mobile_number, u.company_name, u.work_status, u.created_at,
       p.headline, p.summary,
       GROUP_CONCAT(DISTINCT s.skill) as skills
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN user_skills s ON u.id = s.user_id
       WHERE u.id = ?
       GROUP BY u.id`,
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];
    if (user.skills) {
      user.skills = user.skills.split(',').filter(Boolean);
    } else {
      user.skills = [];
    }

    res.json(user);
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Delete user from database (this will cascade delete related records if configured)
    const [result] = await db.query("DELETE FROM users WHERE id = ?", [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
