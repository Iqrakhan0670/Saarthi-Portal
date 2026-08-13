//routes/application.js
import express from "express";
import db from "../config/database.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { uploadFileToGCS } from '../config/gcsStorage.js';
import { getEnv } from '../utils/envLoader.js'; // Added import

// Import the NEW controller
import { getSeekerDashboardStats } from '../controller/SeekerDashboardController.js'; 
// Import Auth Middleware
import { verifyToken } from '../middleware/authMiddleware.js'; 

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const requireCJS = createRequire(import.meta.url);

// Lazy load pdf-parse to avoid startup crashes if module is missing
let pdfParse = null;
try {
  pdfParse = requireCJS('pdf-parse');
} catch (e) {
  console.warn('[Applications] pdf-parse module not available:', e.message);
}

const getGcsBucket = () => getEnv('GCS_BUCKET', false);

// --- NEW DASHBOARD ROUTE (Must be before dynamic routes) ---
router.get('/dashboard-stats', verifyToken, getSeekerDashboardStats);

// Helper to find a pdftotext executable
const findPdftotext = () => {
  try {
    const where = spawnSync('where', ['pdftotext'], { encoding: 'utf8' });
    if (where.status === 0 && where.stdout) {
      const p = where.stdout.split(/\r?\n/).find(Boolean);
      if (p && p.trim()) return p.trim();
    }
  } catch (err) {
    // ignore
  }

  const candidates = [
    'C:\\Program Files\\poppler\\bin\\pdftotext.exe',
    'C:\\Program Files (x86)\\poppler\\bin\\pdftotext.exe',
    'C:\\ProgramData\\chocolatey\\lib\\poppler\\tools\\**\\pdftotext.exe',
    'C:\\ProgramData\\chocolatey\\bin\\pdftotext.exe',
    path.join(process.cwd(), 'backend', 'tools', 'poppler', 'bin', 'pdftotext.exe'),
    path.join(process.cwd(), 'tools', 'poppler', 'bin', 'pdftotext.exe'),
  ];

  for (const c of candidates) {
    try {
      if (fs.existsSync(c.replace('**\\\\pdftotext.exe', ''))) {
        const full = c.includes('**') ? c.replace('**\\pdftotext.exe','pdftotext.exe') : c;
        if (fs.existsSync(full)) return full;
      }
      if (fs.existsSync(c)) return c;
    } catch (e) {
      // continue
    }
  }
  return null;
};

// Local Middleware to verify JWT token (Kept for existing routes)
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
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Helper function to extract text from PDF buffer
const extractTextFromPDF = async (fileBuffer) => {
  try {
    if (!fileBuffer || fileBuffer.length === 0) {
      console.warn('[extractTextFromPDF] Empty file buffer provided');
      return '';
    }
    
    const PDFParseClass = pdfParse?.PDFParse || (pdfParse?.default && pdfParse.default.PDFParse);
    if (!PDFParseClass) {
      console.error('PDF parse loader issue: PDFParse class not found');
      return '';
    }
    
    try {
      const parser = new PDFParseClass({ data: fileBuffer });
      const data = await parser.getText();
      if (typeof parser.destroy === 'function') await parser.destroy();
      let text = (data && data.text) ? data.text : '';
      console.log(`[extractTextFromPDF] pdf-parse succeeded, extracted ${text.length} chars`);
      return text;
    } catch (parseErr) {
      console.error('[extractTextFromPDF] pdf-parse error:', parseErr.message);
      return '';
    }
  } catch (error) {
    console.error("PDF text extraction error:", error);
    return "";
  }
};

// POST /api/applications - Create a new application
router.post('/', async (req, res) => {
  try {
    console.log("[applications] Received POST request");

    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
        }
      }
    }).single('cv');

    upload(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.message });

      const { applicant_name, applicant_email, applicant_mobile, city, state, experience, job_id } = req.body;

      if (!applicant_name || !applicant_email || !applicant_mobile || !city || !state || !job_id) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(applicant_email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Validate mobile number (Indian format)
      const mobileRegex = /^(?:\+91)?[6-9]\d{9}$/;
      if (!mobileRegex.test(applicant_mobile.replace(/\s+/g, ''))) {
        return res.status(400).json({ error: 'Invalid mobile number format' });
      }

      // Check auth for user_id FIRST before any duplicate checks
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      let user_id = null;
      if (token) {
        try {
          const decoded = jwt.verify(token, getEnv('JWT_SECRET'));
          user_id = decoded.id;
        } catch (e) {
          /* guest mode - continue without user_id */
          console.log('[Applications] Token verification failed, proceeding in guest mode');
        }
      }

      // Check duplicate ONLY after we have user_id
      if (user_id) {
        try {
          const [existing] = await db.query(
            `SELECT 1 FROM applications WHERE user_id = ? AND job_id = ?`,
            [user_id, job_id]
          );
          if (existing.length > 0) {
            return res.status(409).json({ error: 'You have already applied for this job' });
          }
        } catch (dbError) {
          console.error('[Applications] Database error during duplicate check:', dbError.message);
          return res.status(500).json({ error: 'Database error during application check' });
        }
      }

      // Upload file
      let cv_url = null;
      let cv_text = null;
      if (req.file) {
        const bucketName = getGcsBucket();
        if (!bucketName) {
          return res.status(500).json({ error: 'GCS_BUCKET environment variable is not set. GCS uploads are not configured.' });
        }
        try {
          const fileBuffer = req.file.buffer;
          cv_text = await extractTextFromPDF(fileBuffer);
          const gcsFileName = `applications/job-${job_id}/app-${user_id || 'guest'}-${Date.now()}.pdf`;
          const gcsResult = await uploadFileToGCS(bucketName, gcsFileName, fileBuffer, 'application/pdf');
          cv_url = gcsResult.url;
        } catch (e) {
          console.error("Upload error:", e);
          return res.status(500).json({ error: 'Failed to upload CV to GCS: ' + e.message });
        }
      }

      // Insert DB
      const [result] = await db.query(
        `INSERT INTO applications (user_id, job_id, applicant_name, applicant_email, applicant_mobile, city, state, experience, cv_url, cv_text, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'applied')`,
        [user_id, job_id, applicant_name, applicant_email, applicant_mobile, city, state, experience, cv_url, cv_text]
      );

      res.status(201).json({ success: true, message: 'Application submitted', id: result.insertId });
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// PATCH & PUT Status
router.all(['/:id/status'], authenticateToken, async (req, res) => {
  if (req.method !== 'PATCH' && req.method !== 'PUT') return res.sendStatus(405);
  try {
    const userRole = req.user.role || req.user.userType;
if (userRole !== "job_poster") {
  return res.status(403).json({ error: "Unauthorized" });
}
    const { status } = req.body;
    
    // Check ownership
    const [apps] = await db.query(`SELECT a.id, j.user_id FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.id = ?`, [req.params.id]);
    if (apps.length === 0) return res.status(404).json({ error: 'Not found' });
    // Convert to numbers for comparison
    const jobOwnerId = Number(apps[0].user_id);
    const requestUserId = Number(req.user.id);
    if (jobOwnerId !== requestUserId) return res.status(403).json({ error: 'Unauthorized' });

    await db.query('UPDATE applications SET status = ? WHERE id = ?', [status, req.params.id]);
    const [updated] = await db.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    res.json({ success: true, application: updated[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE Application
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [app] = await db.query('SELECT user_id FROM applications WHERE id = ?', [req.params.id]);
    if (app.length === 0) return res.status(404).json({ error: 'Not found' });
    // Convert to numbers for comparison
    const appUserId = Number(app[0].user_id);
    const requestUserId = Number(req.user.id);
    if (appUserId !== requestUserId) return res.status(403).json({ error: 'Unauthorized' });

    await db.query('DELETE FROM applications WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Withdrawn successfully' });
  } catch (e) {
    console.error('[Applications] Delete error:', e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET All Applications (Seeker) - with debug logging
router.get('/', authenticateToken, async (req, res) => {
  console.log("📥 GET /api/applications - User:", req.user);
  console.log("User ID:", req.user.id);
  console.log("User Type from token:", req.user.userType);
  console.log("User Type from token (role field):", req.user.role);
  
  // Check if userType exists in either userType or role field
  const userType = req.user.userType || req.user.role;
  
  if (userType !== "job_seeker") {
    console.log(`❌ Access denied: userType is ${userType}, expected job_seeker`);
    return res.status(403).json({ error: 'Unauthorized - User must be a job seeker' });
  }
  
  try {
    const [rows] = await db.query(
      `SELECT a.*, j.job_title, j.company_name, j.job_location 
       FROM applications a 
       JOIN jobs j ON a.job_id = j.id 
       WHERE a.user_id = ? 
       ORDER BY a.created_at DESC`, 
      [req.user.id]
    );
    
    console.log(`✅ Found ${rows.length} applications for user ${req.user.id}`);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET Job Applications (Poster)
router.get('/:jobId', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role || req.user.userType;
    if (userRole !== "job_poster") return res.status(403).json({ error: "Unauthorized" });
    
    const [rows] = await db.query(
      `SELECT * FROM applications WHERE job_id = ? ORDER BY created_at DESC`, 
      [req.params.jobId]
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Error fetching applications for job:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;