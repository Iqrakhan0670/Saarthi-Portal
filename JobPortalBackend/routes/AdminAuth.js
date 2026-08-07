import express from "express";
import db from "../config/database.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getEnv } from '../utils/envLoader.js'; // Added import

const router = express.Router();
router.use(express.json());

// Middleware - UPDATED TO HANDLE EXPIRATION
export const authenticateAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  try {
    const decoded = jwt.verify(token, getEnv('JWT_SECRET')); // Changed
    // console.log('Authenticated admin from token:', decoded); // Optional debug log
    
    if (decoded.type !== "admin") return res.status(403).json({ error: "Admin access only" });
    
    req.admin = decoded;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);

    // 👇 THIS IS THE FIX: Check for TokenExpiredError specifically
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Session expired. Please login again." });
    }
    
    return res.status(403).json({ error: "Invalid token" });
  }
};

// LOGIN — BLOCKS REMOVED ADMINS
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(`🔐 [Admin Login] Attempt for email: ${email}`);
  
  if (!email || !password) {
    console.log(`❌ [Admin Login] Missing email or password`);
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    console.log(`🔍 [Admin Login] Querying database for admin...`);
    const [admins] = await db.query(
      "SELECT * FROM admins WHERE email = ? AND deleted_at IS NULL", 
      [email]
    );
    console.log(`📊 [Admin Login] Found ${admins.length} admin(s)`);
    
    const admin = admins[0];

    if (!admin) {
      console.log(`❌ [Admin Login] Admin not found or account deleted`);
      return res.status(403).json({ 
        error: "Access denied. Account removed or invalid credentials." 
      });
    }

    console.log(`🔑 [Admin Login] Comparing password...`);
    const valid = await bcrypt.compare(password, admin.password);
    
    if (!valid) {
      console.log(`❌ [Admin Login] Invalid password`);
      return res.status(403).json({ 
        error: "Access denied. Account removed or invalid credentials." 
      });
    }

    const payload = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      type: "admin",
      can_create_admins: admin.can_create_admins === undefined ? true : !!admin.can_create_admins,
      can_revoke_admins: admin.can_revoke_admins === undefined ? (admin.id === 1) : !!admin.can_revoke_admins,  // Root defaults to true
    };

    console.log(`🎫 [Admin Login] Generating JWT token...`);
    const jwtSecret = getEnv('JWT_SECRET');
    
    if (!jwtSecret) {
      console.error(`❌ [Admin Login] JWT_SECRET environment variable is not set!`);
      return res.status(500).json({ error: "Server configuration error: Missing JWT_SECRET" });
    }

    let token;
    try {
      token = jwt.sign(payload, jwtSecret, { expiresIn: "10m" });
    } catch (tokenErr) {
      console.error(`❌ [Admin Login] JWT signing failed:`, tokenErr.message);
      return res.status(500).json({ error: "Failed to generate authentication token" });
    }

    console.log(`✅ [Admin Login] Admin ${admin.name} (ID: ${admin.id}) logged in successfully`);

    const response = {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        can_create_admins: payload.can_create_admins,
        can_revoke_admins: payload.can_revoke_admins,
      }
    };
    
    console.log(`📤 [Admin Login] Sending response...`);
    console.log(`📤 [Admin Login] Response object:`, JSON.stringify(response, null, 2));
    
    res.status(200).json(response);
  } catch (err) {
    console.error(`🔥 [Admin Login] FATAL ERROR:`, err.message);
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// CREATE ADMIN
router.post("/create", async (req, res) => {
  const { email, password, name, can_create_admins, can_revoke_admins, creator_password } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: "All fields required" });

  try {
    const [adminsList] = await db.query("SELECT id FROM admins LIMIT 1");
    let creator = null;

    if (adminsList.length > 0) {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "Token required" });

      const decoded = jwt.verify(token, getEnv('JWT_SECRET')); // Changed
      if (!decoded.can_create_admins) return res.status(403).json({ error: "Permission denied" });
      if (!creator_password) return res.status(400).json({ error: "Creator password required" });

      const [rows] = await db.query("SELECT password FROM admins WHERE id = ?", [decoded.id]);
      if (!rows.length || !await bcrypt.compare(creator_password, rows[0].password)) {
        return res.status(403).json({ error: "Invalid creator password" });
      }
      creator = decoded;
    }

    const [existing] = await db.query("SELECT id FROM admins WHERE email = ?", [email]);
    if (existing.length) return res.status(400).json({ error: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    const canCreate = adminsList.length === 0 ? 1 : (can_create_admins ? 1 : 0);
    const canRevoke = creator && creator.id === 1 && can_revoke_admins ? 1 : 0;  // Only root can grant revoke perm

    await db.query(
      "INSERT INTO admins (email, password, name, can_create_admins, can_revoke_admins, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [email, hashed, name, canCreate, canRevoke, creator?.id || null]
    );

    res.status(201).json({ message: "Admin created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// VERIFY TOKEN
router.get("/verify", authenticateAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

// CAN CREATE?
router.get("/can-create", async (req, res) => {
  try {
    const [list] = await db.query("SELECT id FROM admins LIMIT 1");
    if (!list.length) return res.json({ canCreate: true, reason: "no-admins" });

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.json({ canCreate: false, reason: "not-authenticated" });

    const decoded = jwt.verify(token, getEnv('JWT_SECRET')); // Changed
    const can = decoded.can_create_admins === undefined ? true : !!decoded.can_create_admins;
    res.json({ canCreate: can, reason: can ? "authorized" : "forbidden" });
  } catch {
    res.json({ canCreate: false, reason: "invalid-token" });
  }
});

// LIST ADMINS
router.get("/list", authenticateAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        a.id, a.email, a.name, a.can_create_admins, a.can_revoke_admins, a.created_at, a.created_by,
        c.name AS created_by_name,
        a.deleted_at, a.deleted_by, d.name AS deleted_by_name
      FROM admins a
      LEFT JOIN admins c ON a.created_by = c.id
      LEFT JOIN admins d ON a.deleted_by = d.id
      ORDER BY a.created_at DESC
    `);
    res.json({ admins: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load admins" });
  }
});

// TOGGLE CREATE PERMISSION
router.patch("/:id/toggle-create", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const targetId = Number(id);
  const adminId = Number(req.admin.id);
  
  if (adminId !== 1 && !req.admin.can_create_admins) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  if (targetId === 1) {
    return res.status(403).json({ error: "Cannot modify root admin" });
  }
  if (targetId === adminId) {
    return res.status(403).json({ error: "Cannot modify own permissions" });
  }

  try {
    const [result] = await db.query(
      "UPDATE admins SET can_create_admins = NOT can_create_admins WHERE id = ? AND deleted_at IS NULL",
      [targetId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }
    res.json({ message: "Create permission updated" });
  } catch (e) {
    console.error('Toggle create error:', e);
    res.status(500).json({ error: "Failed" });
  }
});

// TOGGLE REVOKE PERMISSION (NEW)
router.patch("/:id/toggle-revoke", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const targetId = Number(id);
  const adminId = Number(req.admin.id);
  
  if (adminId !== 1 && !req.admin.can_revoke_admins) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  if (targetId === 1) {
    return res.status(403).json({ error: "Cannot modify root admin" });
  }
  if (targetId === adminId) {
    return res.status(403).json({ error: "Cannot modify own permissions" });
  }

  try {
    const [result] = await db.query(
      "UPDATE admins SET can_revoke_admins = NOT can_revoke_admins WHERE id = ? AND deleted_at IS NULL",
      [targetId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }
    res.json({ message: "Revoke permission updated" });
  } catch (e) {
    console.error('Toggle revoke error:', e);
    res.status(500).json({ error: "Failed" });
  }
});

// RESTORE ADMIN
router.patch("/:id/restore", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const targetId = Number(id);
  const adminId = Number(req.admin.id);
  
  if (adminId !== 1 && !req.admin.can_revoke_admins) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  if (targetId === 1) {
    return res.status(403).json({ error: "Cannot restore root admin" });
  }

  try {
    const [result] = await db.query(
      "UPDATE admins SET deleted_at = NULL, deleted_by = NULL WHERE id = ? AND deleted_at IS NOT NULL",
      [targetId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Admin not found or not revoked" });
    }
    res.json({ message: "Admin restored successfully" });
  } catch (e) {
    console.error('Restore error:', e);
    res.status(500).json({ error: "Failed" });
  }
});

// REMOVE ADMIN
router.delete("/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const targetId = Number(id);
  const adminId = Number(req.admin.id);
  
  if (adminId !== 1 && !req.admin.can_revoke_admins) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  if (targetId === 1) {
    return res.status(403).json({ error: "Cannot remove root admin" });
  }
  if (adminId === targetId) {
    return res.status(403).json({ error: "Cannot remove yourself" });
  }

  try {
    const [result] = await db.query(
      "UPDATE admins SET deleted_at = NOW(), deleted_by = ? WHERE id = ? AND deleted_at IS NULL",
      [adminId, targetId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }
    res.json({ message: "Admin removed" });
  } catch (e) {
    console.error('Remove error:', e);
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/admin/dashboard-stats
router.get('/dashboard-stats', authenticateAdmin, async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM user_profiles) AS total_candidates,
        (SELECT COUNT(*) FROM jobs WHERE status = 'Active') AS active_jobs,
        (SELECT COUNT(*) FROM applications) AS total_applications,
        (SELECT COUNT(*) FROM applications WHERE created_at >= NOW() - INTERVAL 24 HOUR) AS recent_activity
    `);
    
    res.json(results[0]); 
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

export default router;