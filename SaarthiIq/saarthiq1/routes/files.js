// backend/routes/files.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../db.js';
import { createRequire } from 'module';
import { requireAuth } from '../middleware/auth.js';
import { upsertProfiles, normalizeCity, parseExcelDate } from '../services/profileService.js';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowed = ['.xlsx', '.xls', '.csv'];
    if (!allowed.includes(ext)) {
      return cb(new Error('Only .xlsx, .xls, .csv files allowed'));
    }
    cb(null, true);
  },
});

// === BULK INSERT FUNCTION ===
async function bulkInsertProfiles(rows, userId) {
  if (rows.length === 0) return 0;

  const mappedRows = rows.map(row => {
    const name = (row.Name || row.name || '').toString().trim();
    const company = (row['Curr. Company name'] || row.Company || row.company || '').toString().trim().substring(0, 255);

    let rawLocation = row['Current Location'] || row.Location || row.location || '';
    const normalizedLocation = normalizeCity(rawLocation);

    const department = row.Department || row.department || null;
    const salaryText = row['Annual Salary'] || row.Salary || row.salary || null;
    const salaryNum = parseInt(row['Annual Salary'] || row.Salary || row.salary) || null;
    
    const rawDob = row['Date of Birth'] || row.DOB || row.dob || null;
    const parsedDob = parseExcelDate(rawDob);

    // New fields with conditional checks
    const noticePeriod = row['Notice Period'] || row.notice_period || null;
    const previousEmployer = row['Previous Employer'] || row.previous_employer || null;
    const keySkills = row['Key Skills'] || row.key_skills || row.skills || null;

    return {
      name,
      email: row['Email ID'] || row.Email || row.email || null,
      phone: row['Phone Number'] || row.Phone || row.phone || null,
      current_location: normalizedLocation,
      designation: row.Designation || row.designation || null,
      industry: row.Industry || row.industry || null,
      total_experience: parseFloat(row['Total Experience'] || row.Experience || row.experience) || null,
      annual_salary: salaryNum,
      salary_text: salaryText,
      department,
      company_name: company,
      dob: parsedDob,
      age: parseInt(row.Age || row.age) || null,
      gender: row.Gender || row.gender || null,
      last_education: row['Last Education'] || row.Education || row.education || null,
      notice_period: noticePeriod,
      previous_employer: previousEmployer,
      key_skills: keySkills
    };
  });

  try {
    const stats = await upsertProfiles(db, mappedRows, userId);
    return stats.inserted;
  } catch (err) {
    console.error('Bulk Insert Failed:', err.message);
    throw err;
  }
}

// === UPLOAD ROUTE ===
router.post('/upload', requireAuth, (req, res, next) => {
  // Block file uploads for specific departments
  // Guard against blocked departments without redeclaring variables already in scope
  const userDeptGuard = (req.user?.department || '').toLowerCase();
  const blockedDepts = ['recruitment', 'franchise development', 'franchise'];
  if (!req.user?.is_admin && blockedDepts.includes(userDeptGuard)) {
    return res.status(403).json({ success: false, error: 'Uploads are not allowed for your department' });
  }
  // Handle CORS
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // (Guard already applied above using userDeptGuard and req.user)

  upload.array('files', 5)(req, res, function (err) {
    if (err) {
      console.error('Multer error:', err.message || err);
      return res.status(400).json({ 
        success: false, 
        error: 'Upload failed', 
        details: err.message || String(err) 
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No files uploaded' 
      });
    }

    console.log(`Starting bulk upload for ${req.files.length} files.`);
    const start = Date.now();

    let totalInsertedCount = 0;
    let totalSkippedLocationCount = 0;
    let totalProcessedRows = 0;
    let fileDetails = [];

    for (const file of req.files) {
      console.log('Processing:', file.originalname);
      
      let data = [];
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (ext === '.csv') {
        const csv = fs.readFileSync(file.path, 'utf8');
        const ws = XLSX.utils.csv_to_sheet(csv);
        data = XLSX.utils.sheet_to_json(ws);
      } else {
        const workbook = XLSX.readFile(file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(sheet);
      }
      
      totalProcessedRows += data.length;
      
      const BATCH_SIZE = 500;
      let insertedCount = 0;
      let skippedLocationCount = 0;
      let currentBatch = [];

      for (const row of data) {
        const rawLocation = row['Current Location'] || row.Location || row.location || '';
        if (!normalizeCity(rawLocation)) {
          skippedLocationCount++;
          continue;
        }

        currentBatch.push(row);

        if (currentBatch.length >= BATCH_SIZE) {
          try {
            const userId = parseInt(req.body.userId) || null;
            const added = await bulkInsertProfiles(currentBatch, userId);
            insertedCount += added;
            currentBatch = [];
          } catch (batchErr) {
            console.error(`Batch insert error for ${file.originalname}:`, batchErr);
            throw batchErr;
          }
        }
      }

      if (currentBatch.length > 0) {
        try {
          const userId = parseInt(req.body.userId) || null;
          const added = await bulkInsertProfiles(currentBatch, userId);
          insertedCount += added;
        } catch (batchErr) {
          console.error(`Final batch insert error for ${file.originalname}:`, batchErr);
          throw batchErr;
        }
      }
      
      totalInsertedCount += insertedCount;
      totalSkippedLocationCount += skippedLocationCount;

      // Log to uploaded_files table
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      let safeUserId = parseInt(req.body.userId) || null;
      let uploaderName = req.body.uploaderName || 'Unknown';

      try {
        await db.query(
          `INSERT INTO uploaded_files (name, original_name, size_mb, modified, uploaded_by, user_id)
           VALUES (?, ?, ?, NOW(), ?, ?)`,
          [file.filename, file.originalname, sizeMb, uploaderName, safeUserId]
        );
      } catch (err) {
        console.error(`uploaded_files logging error for ${file.originalname}:`, err.message);
      }
      
      fileDetails.push({
        name: file.originalname,
        rows: data.length,
        inserted: insertedCount,
        skipped: skippedLocationCount,
        size: `${sizeMb} MB`
      });
      
      // Clean up file
      fs.unlink(file.path, (err) => {
        if (err) console.error(`Failed to delete file ${file.path}:`, err);
      });
      data = null;
    }

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    const duplicateOrSkipped = totalProcessedRows - totalInsertedCount - totalSkippedLocationCount;

    console.log(`Upload complete! Total New: ${totalInsertedCount}`);

    // Emit socket event for real-time updates
    if (req.app.get('socketio')) {
      req.app.get('socketio').emit('fileUploaded', {
        message: `${req.files.length} file(s) uploaded successfully`,
        inserted: totalInsertedCount,
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      message: `Uploaded ${req.files.length} file(s) in ${duration}s`,
      stats: { 
        processed: totalProcessedRows, 
        inserted: totalInsertedCount, 
        duplicates_skipped: duplicateOrSkipped,
        location_skipped: totalSkippedLocationCount
      },
      files_processed: fileDetails,
    });
  } catch (err) {
    console.error('Upload handler error', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Upload failed', 
      details: err.message || String(err) 
    });
  }
});

// GET uploaded files - FIXED RESPONSE STRUCTURE
// GET uploaded files - RETURN ALL FILES
router.get('/', async (req, res) => {
  try {
    res.header('Access-Control-Allow-Origin', '*');
    
    // Simple query without LIMIT - get ALL files
    const [rows] = await db.query(`
      SELECT 
        id, 
        name, 
        original_name, 
        size_mb, 
        modified, 
        uploaded_by, 
        user_id
      FROM uploaded_files 
      ORDER BY modified DESC
    `);
    
    console.log(`Returning ${rows.length} files to dashboard`);
    
    res.json({
      success: true,
      files: rows || []  // Return all files
    });
    
  } catch (err) {
    console.error('Fetch files error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch files',
      files: []  // Return empty array on error
    });
  }
});

// DELETE a file
router.delete('/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    // First get file info
    const [fileRows] = await db.query(
      'SELECT name FROM uploaded_files WHERE id = ?',
      [fileId]
    );
    
    if (fileRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    const fileName = fileRows[0].name;
    const filePath = path.join(uploadDir, fileName);
    
    // Delete from database
    await db.query('DELETE FROM uploaded_files WHERE id = ?', [fileId]);
    
    // Delete from filesystem
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
    
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file'
    });
  }
});

// GET file info
router.get('/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    const [rows] = await db.query(`
      SELECT 
        id, name, original_name, size_mb, modified, uploaded_by, user_id
      FROM uploaded_files 
      WHERE id = ?
    `, [fileId]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    res.json({
      success: true,
      file: rows[0]
    });
  } catch (err) {
    console.error('Get file error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch file'
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Files route is working',
    uploadDir,
    timestamp: new Date().toISOString()
  });
});

export default router;
