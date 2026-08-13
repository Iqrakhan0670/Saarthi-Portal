// backend/middleware/saarthiJobsAuth.js
import 'dotenv/config';

/**
 * Middleware to authenticate requests from SaarthiJobs using a static API key.
 * It checks the header 'x-api-key' or the 'Authorization' header (Bearer scheme).
 */
export function validateSaarthiJobsApiKey(req, res, next) {
  try {
    const expectedKey = process.env.SAARTHIJOBS_API_KEY;

    if (!expectedKey) {
      console.error('❌ SAARTHIJOBS_API_KEY is not configured in the environment variables.');
      return res.status(500).json({
        success: false,
        message: 'Internal server configuration error.'
      });
    }

    // Try to get key from x-api-key or Authorization header
    let apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.slice(7);
      }
    }

    if (!apiKey || apiKey !== expectedKey) {
      console.warn(`⚠️ Unauthorized access attempt from IP: ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or missing API key.'
      });
    }

    next();
  } catch (error) {
    console.error('SaarthiJobs Auth Middleware Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
}
