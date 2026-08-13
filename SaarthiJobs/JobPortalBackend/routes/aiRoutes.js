// routes/aiRoutes.js
import express from 'express';
import multer from 'multer';
import { getResumeScore } from '../controller/aicrt.js';
import { parseResumeWithAI } from '../controller/aiAutofillController.js';
import jwt from 'jsonwebtoken';
import { getEnv } from '../utils/envLoader.js';

const router = express.Router();

// Configure Multer to use memory storage (serverless-compatible)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  try {
    req.user = jwt.verify(token, getEnv('JWT_SECRET'));
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token', details: err.message });
  }
};

// POST /api/ai/score — Match resume against job description
// 'resume' is the name of the form field the frontend must use
router.post('/score', upload.single('resume'), getResumeScore);

// POST /api/ai/parse-resume — Extract structured profile data from resume using Gemini AI
router.post('/parse-resume', authenticateToken, upload.single('resume'), parseResumeWithAI);

export default router;