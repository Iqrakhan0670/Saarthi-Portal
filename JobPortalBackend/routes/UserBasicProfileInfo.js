// routes/UserBasicProfileInfo.js
import express from "express"
import db from "../config/database.js"
import jwt from "jsonwebtoken"
import multer from "multer"
import path from "path"
import fs from "fs"
import { createRequire } from 'module'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { uploadFileToGCS } from '../config/gcsStorage.js'
import { getEnv } from '../utils/envLoader.js'
import { syncCandidateToSaarthiIQ } from '../utils/saarthiIQService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const requireCJS = createRequire(import.meta.url)

// Lazy load pdf-parse to avoid startup crashes if module is missing
let pdfParse = null
try {
  pdfParse = requireCJS('pdf-parse')
} catch (e) {
  console.warn('[UserBasicProfileInfo] pdf-parse module not available:', e.message)
}

// Try to load mammoth for .docx extraction (optional)
let mammoth = null
try {
  mammoth = requireCJS('mammoth')
} catch (e) {
  mammoth = null
}

const getGcsBucket = () => getEnv('GCS_BUCKET', false)

const router = express.Router()

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]
  if (!token) return res.status(401).json({ error: "Access token required" })

  try {
    const decoded = jwt.verify(token, getEnv('JWT_SECRET'))
    req.user = decoded
    next()
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token", details: error.message })
  }
}

// Multer storage using memory
const storage = multer.memoryStorage()
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

// Helper function to extract text from PDF buffer
const extractTextFromPDF = async (fileBuffer) => {
  try {
    if (!fileBuffer || fileBuffer.length === 0) {
      console.warn('[extractTextFromPDF] Empty file buffer provided')
      return ''
    }

    const PDFParseClass = pdfParse?.PDFParse || (pdfParse?.default && pdfParse.default.PDFParse)
    if (!PDFParseClass) {
      console.error('[extractTextFromPDF] PDFParse class not found')
      return ''
    }

    try {
      const parser = new PDFParseClass({ data: fileBuffer })
      const data = await parser.getText()
      if (typeof parser.destroy === 'function') {
        try {
          await parser.destroy()
        } catch (e) {
          console.warn('[extractTextFromPDF] Warning during parser cleanup:', e.message)
        }
      }
      let text = (data && data.text) ? data.text : ''
      console.log(`[extractTextFromPDF] pdf-parse succeeded, extracted ${text.length} chars`)
      return text
    } catch (parseErr) {
      console.error('[extractTextFromPDF] pdf-parse error:', parseErr.message)
    }

    return ''
  } catch (error) {
    console.error("[extractTextFromPDF] Unexpected error:", error.message)
    return ""
  }
}

// Upload photo to GCS
router.post("/upload/photo", authenticateToken, upload.single("profilePhoto"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" })
  
  try {
    const bucketName = getGcsBucket()
    if (!bucketName) {
      return res.status(500).json({ error: 'GCS_BUCKET environment variable is not set. GCS uploads are not configured.' })
    }
    
    const ext = path.extname(req.file.originalname || '').toLowerCase() || '.jpg'
    const gcsFileName = `photos/user-${req.user.id}-${Date.now()}${ext}`
    const contentType = req.file.mimetype || 'image/jpeg'
    
    const gcsResult = await uploadFileToGCS(bucketName, gcsFileName, req.file.buffer, contentType)
    
    await db.query("UPDATE user_profiles SET profile_photo_url = ? WHERE user_id = ?", [gcsResult.url, req.user.id])
    
    return res.status(200).json({ url: gcsResult.url })
  } catch (error) {
    console.error("Failed to upload photo:", error)
    return res.status(500).json({ error: 'Photo upload failed: ' + error.message })
  }
})

// Upload resume to GCS
router.post("/upload/resume", authenticateToken, upload.single("resume"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" })
  
  try {
    console.log(`[upload/resume] Starting upload for user=${req.user.id}, file=${req.file.originalname}`)
    
    const ext = path.extname(req.file.originalname || '').toLowerCase() || '.bin'
    console.log(`[upload/resume] Detected file extension: ${ext}`)
    
    const fileBuffer = req.file.buffer
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: "Empty file uploaded" })
    }
    
    let extractedText = ""
    try {
      if (ext === '.pdf') {
        extractedText = await extractTextFromPDF(fileBuffer)
        console.log(`[upload/resume] PDF extraction succeeded, length=${(extractedText||"").length}`)
      } else if (ext === '.docx') {
        if (mammoth) {
          try {
            const result = await mammoth.extractRawText({ buffer: fileBuffer })
            extractedText = (result && result.value) ? result.value : ''
            console.log(`[upload/resume] DOCX extraction succeeded, length=${extractedText.length}`)
          } catch (mErr) {
            console.error('[upload/resume] mammoth extraction failed:', mErr.message)
            extractedText = ''
          }
        }
      }
    } catch (extractErr) {
      console.error(`[upload/resume] Extraction failed:`, extractErr.message)
      extractedText = ''
    }
    
    const bucketName = getGcsBucket()
    if (!bucketName) {
      return res.status(500).json({ error: 'GCS_BUCKET environment variable is not set. GCS uploads are not configured.' });
    }
    
    const gcsFileName = `resumes/user-${req.user.id}-${Date.now()}${ext}`
    const contentType = req.file.mimetype || 'application/octet-stream'
    console.log(`[upload/resume] Uploading to GCS: ${gcsFileName}`)
    
    const gcsResult = await uploadFileToGCS(bucketName, gcsFileName, fileBuffer, contentType)
    console.log(`[upload/resume] GCS upload successful: ${gcsResult.url}`)
    
    try {
      const [result] = await db.query(
        "UPDATE user_profiles SET resume_url = ?, resume_text = ?, updated_at = NOW() WHERE user_id = ?",
        [gcsResult.url, extractedText || null, req.user.id]
      )
      console.log(`[upload/resume] DB update affectedRows=${result?.affectedRows || 0} for user=${req.user.id}`)
      
      if (result.affectedRows === 0) {
        console.warn(`[upload/resume] No rows updated. Creating profile entry...`)
        
        // Check if user exists
        const [user] = await db.query("SELECT email, full_name FROM users WHERE id = ?", [req.user.id])
        const email = user.length > 0 ? user[0].email : ''
        const fullName = user.length > 0 ? user[0].full_name || '' : ''
        const nameParts = fullName.split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        // First check what columns exist
        const [columns] = await db.query("SHOW COLUMNS FROM user_profiles")
        const columnNames = columns.map(c => c.Field)
        
        // Build dynamic insert
        const insertData = {
          user_id: req.user.id,
          first_name: firstName,
          last_name: lastName,
          email: email,
          resume_url: gcsResult.url,
          resume_text: extractedText || null
        }
        
        const insertColumns = []
        const insertValues = []
        
        columnNames.forEach(col => {
          if (insertData.hasOwnProperty(col)) {
            insertColumns.push(col)
            insertValues.push(insertData[col])
          }
        })
        
        if (insertColumns.length > 0) {
          const placeholders = insertColumns.map(() => '?').join(', ')
          await db.query(
            `INSERT INTO user_profiles (${insertColumns.join(', ')}) VALUES (${placeholders})`,
            insertValues
          )
          console.log(`[upload/resume] Profile created with resume for user=${req.user.id}`)
        }
      }
    } catch (dbErr) {
      console.error("[upload/resume] Database error:", dbErr.message, dbErr.sql)
    }

    // ── SaarthiIQ Sync ────────────────────────────────────────────────────────
    // Fire-and-forget: syncs candidate to SaarthiIQ after a successful resume save.
    // IMPORTANT: This must NOT block the response. Even if sync fails, the upload succeeds.
    syncCandidateToSaarthiIQ(req.user.id, { resumeUrl: gcsResult.url }).catch(() => {});
    // ─────────────────────────────────────────────────────────────────────────

    return res.status(200).json({ 
      success: true,
      url: gcsResult.url, 
      resume_text_length: (extractedText||"").length,
      resume_url: gcsResult.url 
    })
  } catch (err) {
    console.error("[upload/resume] Fatal error:", err.message)
    console.error(err.stack)
    
    return res.status(500).json({ 
      error: 'Upload failed: ' + err.message,
      details: err.stack 
    })
  }
})

// Save resume URL and text
router.post("/resume", authenticateToken, async (req, res) => {
  try {
    const { resumeUrl, resumeText } = req.body || {}
    console.log(`[resume/POST] Saving resume for user=${req.user.id}`)
    
    const [profiles] = await db.query(
      `SELECT id FROM user_profiles WHERE user_id = ?`,
      [req.user.id]
    )
    
    if (profiles.length > 0) {
      await db.query(
        `UPDATE user_profiles SET resume_url = ?, resume_text = ?, updated_at = NOW() WHERE user_id = ?`,
        [resumeUrl || null, resumeText || null, req.user.id]
      )
    } else {
      const [user] = await db.query("SELECT email, full_name FROM users WHERE id = ?", [req.user.id])
      const email = user.length > 0 ? user[0].email : ''
      const fullName = user.length > 0 ? user[0].full_name || '' : ''
      const nameParts = fullName.split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      const [columns] = await db.query("SHOW COLUMNS FROM user_profiles")
      const columnNames = columns.map(c => c.Field)
      
      const insertData = {
        user_id: req.user.id,
        first_name: firstName,
        last_name: lastName,
        email: email,
        resume_url: resumeUrl || null,
        resume_text: resumeText || null
      }
      
      const insertColumns = []
      const insertValues = []
      
      columnNames.forEach(col => {
        if (insertData.hasOwnProperty(col)) {
          insertColumns.push(col)
          insertValues.push(insertData[col])
        }
      })
      
      if (insertColumns.length > 0) {
        const placeholders = insertColumns.map(() => '?').join(', ')
        await db.query(
          `INSERT INTO user_profiles (${insertColumns.join(', ')}) VALUES (${placeholders})`,
          insertValues
        )
      }
    }
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[resume/POST] Failed to save resume:', error.message, error.sql)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// Delete photo
router.delete("/delete/photo", authenticateToken, async (req, res) => {
  try {
    await db.query("UPDATE user_profiles SET profile_photo_url = NULL WHERE user_id = ?", [req.user.id])
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error("Failed to delete profile photo:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Delete resume
router.delete("/delete/resume", authenticateToken, async (req, res) => {
  try {
    await db.query("UPDATE user_profiles SET resume_url = NULL, resume_text = NULL WHERE user_id = ?", [req.user.id])
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error("Failed to delete resume:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// GET /api/userprofile - Fetch or create profile
router.get("/", authenticateToken, async (req, res) => {
  console.log("📥 GET /api/userprofile for user:", req.user.id);
  
  try {
    // First check if profile exists
    const [profiles] = await db.query("SELECT * FROM user_profiles WHERE user_id = ?", [req.user.id]);
    
    if (profiles.length === 0) {
      console.log("No profile found, creating one for user:", req.user.id);
      
      // Get user details from users table
      const [user] = await db.query("SELECT email, full_name FROM users WHERE id = ?", [req.user.id]);
      
      if (user.length === 0) {
        return res.status(404).json({ error: "User not found in users table" });
      }
      
      // Split full_name into first_name and last_name
      const fullName = user[0].full_name || '';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Get actual table structure
      const [columns] = await db.query("SHOW COLUMNS FROM user_profiles");
      const columnNames = columns.map(c => c.Field);
      
      console.log("Table columns:", columnNames);
      
      // Define default values for common columns
      const defaultValues = {
        user_id: req.user.id,
        first_name: firstName,
        last_name: lastName,
        email: user[0].email,
        phone: '',
        city: '',
        state: '',
        country: '',
        expected_salary: '',
        gender: 'Prefer not to say',
        job_type: 'Full-time',
        preferred_location: '',
        profile_summary: null,
        profile_photo_url: null,
        resume_url: null,
        resume_file: null,
        resume_text: null,
        age: 0
      };
      
      // Build insert query dynamically based on existing columns
      const insertColumns = [];
      const insertValues = [];
      
      columnNames.forEach(col => {
        if (defaultValues.hasOwnProperty(col)) {
          insertColumns.push(col);
          insertValues.push(defaultValues[col]);
        } else {
          console.log(`Column ${col} exists in table but not in default values - skipping`);
        }
      });
      
      console.log("Insert columns:", insertColumns);
      console.log("Insert values:", insertValues);
      
      if (insertColumns.length === 0) {
        throw new Error("No columns to insert");
      }
      
      const placeholders = insertColumns.map(() => '?').join(', ');
      const insertQuery = `INSERT INTO user_profiles (${insertColumns.join(', ')}) VALUES (${placeholders})`;
      
      console.log("Insert query:", insertQuery);
      
      await db.query(insertQuery, insertValues);
      console.log("✅ Profile created successfully");
      
      // Fetch and return the newly created profile
      const [newProfile] = await db.query("SELECT * FROM user_profiles WHERE user_id = ?", [req.user.id]);
      return res.status(200).json(newProfile[0]);
    }
    
    console.log("✅ Profile found for user:", req.user.id);
    return res.status(200).json(profiles[0]);
    
  } catch (error) {
    console.error("❌ ERROR in GET /api/userprofile:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error sql:", error.sql);
    console.error("Error sqlMessage:", error.sqlMessage);
    console.error("Full error:", error);
    
    return res.status(500).json({ 
      error: "Internal server error", 
      details: error.message,
      sqlMessage: error.sqlMessage || null
    });
  }
});

// Save/Update PUT
router.put("/", authenticateToken, async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    city,
    state,
    country,
    age,
    expectedSalary,
    gender,
    jobType,
    preferredLocation,
    profileSummary,
    profilePhotoUrl,
    resumeUrl,
  } = req.body

  const required = [
    firstName,
    lastName,
    email,
    phone,
    city,
    state,
    country,
    age,
    expectedSalary,
    gender,
    jobType,
    preferredLocation,
  ]
  
  if (required.some((v) => !v || (typeof v === "string" && v.trim() === ""))) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  try {
    // First check what columns exist
    const [columns] = await db.query("SHOW COLUMNS FROM user_profiles");
    const columnNames = columns.map(c => c.Field);
    
    // Build dynamic update
    const updateData = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      city: city,
      state: state,
      country: country,
      age: age,
      expected_salary: expectedSalary,
      gender: gender,
      job_type: jobType,
      preferred_location: preferredLocation,
      profile_summary: profileSummary || null,
      profile_photo_url: profilePhotoUrl || null,
      resume_url: resumeUrl || null,
      updated_at: new Date()
    };
    
    const updatePairs = [];
    const updateValues = [];
    
    columnNames.forEach(col => {
      if (updateData.hasOwnProperty(col) && col !== 'user_id' && col !== 'id') {
        updatePairs.push(`${col} = ?`);
        updateValues.push(updateData[col]);
      }
    });
    
    updateValues.push(req.user.id);
    
    const updateQuery = `UPDATE user_profiles SET ${updatePairs.join(', ')} WHERE user_id = ?`;
    
    console.log("Update query:", updateQuery);
    console.log("Update values:", updateValues);
    
    await db.query(updateQuery, updateValues);
    
    return res.status(200).json({ message: "Profile updated successfully" })
  } catch (error) {
    console.error("Error in PUT /api/userprofile:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message })
  }
})

export default router