// Load environment variables from .env file FIRST (must be before other imports)
import dotenv from 'dotenv';
dotenv.config();

// Initialize environment cache after dotenv loads
import { initEnvCache } from './utils/envLoader.js';
initEnvCache();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { downloadFileFromGCS } from './config/gcsStorage.js';
import multer from "multer";

import aiRoutes from './routes/aiRoutes.js';
import { getEnv } from './utils/envLoader.js'; // Import getEnv

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer configuration using memory storage (serverless-compatible)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
    files: 1,
  },
});

// Import admin routes
import adminAuthRouter from './routes/AdminAuth.js';
import adminDashboardRouter from './routes/AdminDashboard.js';
import adminUsersRouter from './routes/AdminUsers.js';
import adminJobsRouter from './routes/AdminJobs.js';
import adminResumesRouter from './routes/AdminResumes.js';
import adminSendEmailRouter from './routes/AdminSendEmail.js';

// Import existing routes
import signupRoutes from './routes/Signup.js';
import loginRoutes from './routes/Login.js';
import authRoutes from './routes/Auth.js';
import postJobsRoutes from './routes/PostJobs.js';
import postingProfileRoutes from './routes/PostingProfile.js';
import applicationsRoutes from './routes/Applications.js';
import scheduleInterviewRoutes from './routes/ScheduleInterview.js';
import messagesRoutes from './routes/PosterMessage.js';

import searchCandidatesRoutes from './routes/SearchCandidates.js';
import savedCandidatesRouter from "./routes/savedCandidates.js";

import jobRecommendationsRoute from "./routes/jobRecommendations.js";

import emailScheduler from './routes/emailScheduler.js';

import userBasicProfileInfoRoutes from './routes/UserBasicProfileInfo.js';       
import userProfileSkillsRoutes from './routes/UserProfileSkills.js';            
import userProfileLanguagesRoutes from './routes/UserProfileLanguages.js';       
import userProfileAccomplishmentsRoutes from './routes/UserProfileAccomplishments.js'; 
import userProfileInternshipsRoutes from './routes/UserProfileInternships.js';   
import userProfileProjectsRoutes from './routes/UserProfileProjects.js';        
import userProfileEducationsRoutes from './routes/UserProfileEducations.js';    
import userProfileEmploymentsRoutes from './routes/UserProfileEmployments.js';   
import analyticsRoutes from './routes/Analytics.js';
import settingsRoutes from './routes/Settings.js';
import userProfileAutofillRoutes from './routes/UserProfileAutofill.js';

const app = express();

console.log("Loading routes:", { signupRoutes, loginRoutes, postJobsRoutes, postingProfileRoutes });

// Make upload available globally for routes
app.set('upload', upload);

// --- CORS CONFIGURATION (MUST BE FIRST MIDDLEWARE) ---
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // List of allowed origins - includes both local and production domains
  const allowedOrigins = [
    // Production
    "https://saarthijobs.com",
    "https://www.saarthijobs.com",
    "https://admin.saarthijobs.com",
    "https://api.saarthijobs.com",
    // Local development
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
  ];

  // Add environment-based domains
  const envFrontend = getEnv('FRONTEND_URL', false);
  const envAdmin = getEnv('ADMIN_FRONTEND_URL', false);
  if (envFrontend && !allowedOrigins.includes(envFrontend)) allowedOrigins.push(envFrontend);
  if (envAdmin && !allowedOrigins.includes(envAdmin)) allowedOrigins.push(envAdmin);

  // If origin is in allowed list, set CORS headers
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  } else {
    // For any other origin, don't set CORS header (blocks it)
    console.log(`⚠️ [CORS] Origin not allowed: ${origin}`);
  }

  // Always set these headers
  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With");
  res.header("Access-Control-Max-Age", "86400");

  // Log CORS requests for debugging
  if (req.method === "OPTIONS") {
    console.log(`📍 [CORS-OPTIONS] Origin: ${origin} | Allowed: ${allowedOrigins.includes(origin)}`);
  }

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Also use the cors middleware as backup
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "https://saarthijobs.com",
        "https://www.saarthijobs.com",
        "https://saarthijobs.vercel.app",
        "https://admin.saarthijobs.com",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
      ];

      const envFrontend = getEnv('FRONTEND_URL', false);
      const envAdmin = getEnv('ADMIN_FRONTEND_URL', false);
      if (envFrontend) allowedOrigins.push(envFrontend);
      if (envAdmin) allowedOrigins.push(envAdmin);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`❌ [CORS-BLOCKED] Origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// ✅ MOVED LOGGER HERE (TOP OF MIDDLEWARE CHAIN)
// This ensures every request is logged BEFORE it tries to find a route.
app.use((req, res, next) => {
  console.log(`➡️ [LOG] ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log(`Headers:`, req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`Body:`, JSON.stringify(req.body, null, 2));
  }
  next();
});

// Parse incoming JSON with increased limit for file uploads
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Handle downloads from GCS URLs (authenticated proxy)
app.get('/download', async (req, res) => {
  try {
    const gcsUrl = req.query.url;
    if (!gcsUrl || !gcsUrl.includes('storage.googleapis.com')) {
      console.log('[Download] Invalid or missing GCS URL:', gcsUrl);
      return res.status(400).json({ error: 'Invalid GCS URL' });
    }

    console.log('[Download] Processing authenticated GCS download for:', gcsUrl);

    const urlParts = gcsUrl.replace('https://storage.googleapis.com/', '').split('/');
    const bucketName = urlParts[0];
    const fileName = urlParts.slice(1).join('/');

    console.log('[Download] Bucket:', bucketName, 'File:', fileName);

    const fileBuffer = await downloadFileFromGCS(bucketName, fileName);

    console.log('[Download] Successfully downloaded', fileBuffer.length, 'bytes');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Content-Disposition', `inline; filename="resume.pdf"`);
    res.send(fileBuffer);
  } catch (err) {
    console.error('[Download] Error:', err.message);
    res.status(500).json({ error: 'Download failed: ' + err.message });
  }
});

// TEMPORARY DEBUG ROUTE - Add this before other routes
app.get('/api/debug/userprofile-table', async (req, res) => {
  try {
    const [columns] = await db.query("SHOW COLUMNS FROM user_profiles");
    const [sample] = await db.query("SELECT * FROM user_profiles LIMIT 1");
    res.json({
      columns: columns.map(c => ({
        Field: c.Field,
        Type: c.Type,
        Null: c.Null,
        Default: c.Default
      })),
      sampleData: sample.length > 0 ? sample[0] : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- ABSOLUTE-SAFE ROUTES FOR VERCEL COLD STARTS ---
// Root route
app.get('/', (req, res) => {
  res.status(200).send('JobPortal Backend is running.');
});

// Favicon routes
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No Content
});

app.get('/favicon.png', (req, res) => {
  res.status(204).end(); // No Content
});

// Health check route
app.get('/api/health', (req, res) => {
  console.log('Health check hit successfully');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});




// API routes
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/admin/dashboard', adminDashboardRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/jobs', adminJobsRouter);
app.use('/api/admin/resumes', adminResumesRouter);
app.use('/api/admin', adminSendEmailRouter);

app.use('/api/signup', signupRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/postingprofile', postingProfileRoutes);
app.use('/api/jobs', postJobsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/scheduled-interviews', scheduleInterviewRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/search/candidates', searchCandidatesRoutes);
app.use("/api/saved-candidates", savedCandidatesRouter);
app.use("/api/recommendations", jobRecommendationsRoute);
app.use('/api/email', emailScheduler);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/userprofile', userBasicProfileInfoRoutes); 
app.use('/api/usereducations', userProfileEducationsRoutes); 
app.use('/api/userprojects', userProfileProjectsRoutes);
app.use('/api/userinternships', userProfileInternshipsRoutes); 
app.use('/api/useremployments', userProfileEmploymentsRoutes);
app.use('/api/userskills', userProfileSkillsRoutes); 
app.use('/api/userlanguages', userProfileLanguagesRoutes); 
app.use('/api/useraccomplishments', userProfileAccomplishmentsRoutes);
app.use('/api/profile', userProfileAutofillRoutes);

// Debug route to list all registered routes
app.get("/api/debug/routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === "router") {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods),
          });
        }
      });
    }
  });
  res.json({ routes });
});

// Debug endpoint: serverless storage info
app.get('/api/debug/uploads', (req, res) => {
  if (getEnv('NODE_ENV', false) === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }

  return res.json({ 
    message: 'Serverless mode: Files are stored in Google Cloud Storage, not local filesystem',
    storage: 'GCS (Google Cloud Storage)',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("🔥 Global error handler:", error);
  res.status(500).json({
    error: "Internal server error",
    message: getEnv('NODE_ENV', false) === "development" ? error.message : "Something went wrong", // Use getEnv for NODE_ENV
  });
});



// Start the server (only if not in a serverless environment or if we need to listen locally)
// Vercel handles its own listening.
const PORT = getEnv('PORT', false) || 8080;
if (getEnv('VERCEL_ENV', false) === undefined) { // Check if VERCEL_ENV is not set, meaning we're not on Vercel
    app.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
        console.log(`🔍 Debug routes: http://localhost:${PORT}/api/debug/routes`);
        console.log(`📋 All routes loaded successfully`);
    });
}


// For Vercel, export the app
export default app;