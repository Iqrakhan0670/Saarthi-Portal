// controller/aicrt.js
import axios from 'axios';
import FormData from 'form-data';

// This function receives the file from the Frontend
export const getResumeScore = async (req, res) => {
  console.log("🔥 [getResumeScore] Function started");
  console.log("Request file:", req.file ? {
    originalname: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  } : 'No file');
  console.log("Request body:", req.body);
  console.log("Request body keys:", Object.keys(req.body));

  try {
    // 1. Check if file exists
    if (!req.file) {
      console.log("❌ No resume file uploaded");
      return res.status(400).json({ message: "No resume file uploaded" });
    }
    
    // 2. Check for job description in either field name
    const jobDescription = req.body.job_description || req.body.jobDescription;
    console.log("Job description found:", jobDescription ? jobDescription.substring(0, 50) + '...' : 'undefined');
    
    if (!jobDescription) {
      console.log("❌ No Job Description provided");
      return res.status(400).json({ 
        message: "No Job Description provided. Expected field: job_description or jobDescription" 
      });
    }

    console.log("✅ File and job description received");

    // 3. Prepare the data to send to Python
    const formData = new FormData();
    formData.append('resume', req.file.buffer, {
      filename: req.file.originalname || 'resume.pdf',
      contentType: req.file.mimetype || 'application/pdf'
    });
    formData.append('job_description', jobDescription); // Python expects this name

    console.log("✅ FormData prepared");

    // 4. Determine Python service URL
    let pythonServiceUrl;
    
    if (process.env.VERCEL_URL) {
      pythonServiceUrl = `https://${process.env.VERCEL_URL}/api/python-score`;
      console.log("🏭 Using Vercel URL:", pythonServiceUrl);
    } else if (process.env.NODE_ENV === 'production') {
      pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5002/api/python-score';
      console.log("🏭 Using production URL:", pythonServiceUrl);
    } else {
      pythonServiceUrl = 'http://127.0.0.1:5002/api/python-score';
      console.log("💻 Using local URL:", pythonServiceUrl);
    }

    console.log(`📞 Calling Python service at: ${pythonServiceUrl}`);

    // 5. Send to Python AI Server
    console.log("⏳ Sending request to Python...");
    const pythonResponse = await axios.post(pythonServiceUrl, formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000
    });

    console.log("✅ Python response received, status:", pythonResponse.status);
    console.log("✅ Python response data:", pythonResponse.data);

    // 6. Return the score to the Frontend
    res.json(pythonResponse.data);

  } catch (error) {
    console.error("❌ AI Service Error:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    
    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response data:", error.response.data);
      
      res.status(error.response.status).json({ 
        message: "AI Service error", 
        details: error.response.data 
      });
    } else if (error.request) {
      console.error("No response received from Python server");
      res.status(504).json({ 
        message: "No response from AI Service. Is the Python server running on port 5000?", 
        details: error.message 
      });
    } else {
      console.error("Error setting up request:", error.message);
      res.status(500).json({ 
        message: "Error calculating score", 
        details: error.message 
      });
    }
  }
};