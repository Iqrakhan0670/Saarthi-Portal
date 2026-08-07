// JobPortalBackend/api/ai-score.js
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';

const upload = multer({ storage: multer.memoryStorage() });

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📥 [Node.js Proxy] Received request');
    
    // Parse the multipart form data
    await new Promise((resolve, reject) => {
      upload.fields([
        { name: 'resume', maxCount: 1 },
        { name: 'job_description', maxCount: 1 }
      ])(req, res, (err) => {
        if (err) {
          console.error('❌ [Node.js Proxy] Multer error:', err);
          reject(err);
        } else {
          console.log('✅ [Node.js Proxy] Multer parsing complete');
          resolve();
        }
      });
    });

    // Log received data
    console.log('📦 [Node.js Proxy] req.files keys:', req.files ? Object.keys(req.files) : 'none');
    console.log('📦 [Node.js Proxy] req.body keys:', Object.keys(req.body));
    
    const job_description = req.body.job_description;
    
    if (!req.files?.resume) {
      console.error('❌ [Node.js Proxy] No resume file found');
      return res.status(400).json({ 
        success: false, 
        message: "No resume file uploaded." 
      });
    }

    if (!job_description) {
      console.error('❌ [Node.js Proxy] No job_description found');
      return res.status(400).json({ 
        success: false, 
        message: "Job description is required." 
      });
    }

    console.log(`✅ [Node.js Proxy] File: ${req.files.resume[0].originalname}, size: ${req.files.resume[0].size} bytes`);
    console.log(`✅ [Node.js Proxy] Job desc length: ${job_description.length}`);

    // Forward to Python function
    const formData = new FormData();
    formData.append('resume', req.files.resume[0].buffer, {
      filename: req.files.resume[0].originalname,
      contentType: req.files.resume[0].mimetype
    });
    formData.append('job_description', job_description);

    // Determine Python service URL// Determine Python service URL
let pythonUrl;
if (process.env.VERCEL_ENV === 'production') {
  pythonUrl = 'https://api.saarthijobs.com/api/python-score';
} else {
  // Local development - Python runs on port 5002
  pythonUrl = 'http://localhost:5002/api/python-score';
}
console.log(`🔄 [Node.js Proxy] Calling Python at: ${pythonUrl}`);

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(pythonUrl, {
        method: 'POST',
        body: formData,
        headers: {
          ...formData.getHeaders(),
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      console.log(`📥 [Node.js Proxy] Python response status: ${response.status}`);
      
      // Try to parse response as JSON
      let data;
      const responseText = await response.text();
      
      try {
        data = JSON.parse(responseText);
        console.log('✅ [Node.js Proxy] Python response parsed successfully');
      } catch (parseError) {
        console.error('❌ [Node.js Proxy] Failed to parse Python response:', responseText.substring(0, 200));
        return res.status(502).json({ 
          success: false, 
          message: 'Invalid response from AI service' 
        });
      }

      // Forward the response with proper status
      return res.status(response.status).json(data);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('❌ [Node.js Proxy] Python service timeout');
        return res.status(504).json({ 
          success: false, 
          message: 'AI service timeout - please try again' 
        });
      }
      
      console.error('❌ [Node.js Proxy] Fetch error:', fetchError.message);
      return res.status(502).json({ 
        success: false, 
        message: `Cannot connect to AI service: ${fetchError.message}` 
      });
    }

  } catch (error) {
    console.error('❌ [Node.js Proxy] Unhandled error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Analysis failed' 
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};