import https from 'https';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEnv, getJsonEnv } from '../utils/envLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedToken = null;
let tokenExpiry = null;
let serviceAccountInstance = null;


// Lazy load service account from GCS_KEY_JSON env or GCS_KEY_PATH file
const getServiceAccount = () => {
  if (serviceAccountInstance) {
    return serviceAccountInstance;
  }

  try {
    console.log('[GCS] getServiceAccount: Loading credentials...');
    // First try to load from GCS_KEY_JSON environment variable
    const envKey = process.env.GCS_KEY_JSON;

    if (envKey) {
      try {
        serviceAccountInstance = JSON.parse(envKey);
        console.log('[GCS] Loaded from GCS_KEY_JSON env');
      } catch (parseErr) {
        console.error('[GCS] Failed to parse GCS_KEY_JSON:', parseErr.message);
      }
    }

    // If not in env, try to load from file path
    if (!serviceAccountInstance) {
      const keyPath = process.env.GCS_KEY_PATH;
      console.log('[GCS] Key path from env:', keyPath);

      if (keyPath) {
        // Try multiple possible locations
        const possiblePaths = [
          path.resolve(process.cwd(), keyPath),
          path.resolve(process.cwd(), 'backend', keyPath),
          path.resolve(__dirname, '..', keyPath),
          path.resolve(__dirname, keyPath),
        ];
        console.log('[GCS] Resolving key path. Possible paths:', possiblePaths);

        for (const tryPath of possiblePaths) {
          if (fs.existsSync(tryPath)) {
            console.log('[GCS] Found key file at:', tryPath);
            const fileContent = fs.readFileSync(tryPath, 'utf8');
            serviceAccountInstance = JSON.parse(fileContent);
            break;
          }
        }
      }
    }

    if (!serviceAccountInstance) {
      console.error('[GCS] No service account credentials found!');
      return null;
    }

    // Fix private key format - replace literal \n with actual newlines
    if (serviceAccountInstance.private_key) {
      const originalKey = serviceAccountInstance.private_key;
      serviceAccountInstance.private_key = originalKey.replace(/\\n/g, '\n');
      console.log('[GCS] Service account loaded successfully for email:', serviceAccountInstance.client_email);
    } else {
      console.error('[GCS] Service account missing private_key!');
      return null;
    }

    return serviceAccountInstance;
  } catch (err) {
    console.error(`[GCS] Fatal error loading service account: ${err.message}`);
    return null;
  }
};


// Get OAuth2 token for GCS authentication
async function getAccessToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    console.log('[GCS] Using cached access token');
    return cachedToken;
  }

  console.log('[GCS] Requesting new access token...');
  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    throw new Error('Service account key not configured via GCS_KEY_JSON environment variable.');
  }

  return new Promise((resolve, reject) => {
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: serviceAccount.token_uri,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000)
    };

    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    // Simple base64url encode
    const base64url = (str) => Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // Sign JWT using crypto
    const sign = crypto.createSign('RSA-SHA256');

    const message = base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(payload));
    sign.update(message);
    const signature = base64url(sign.sign(serviceAccount.private_key));
    const jwt = message + '.' + signature;

    // Exchange JWT for access token
    const tokenPayload = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`;

    const tokenOptions = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(tokenPayload)
      }
    };

    console.log('[GCS] Sending token exchange request to oauth2.googleapis.com...');
    const tokenReq = https.request(tokenOptions, (res) => {
      let data = '';
      console.log('[GCS] Token response status:', res.statusCode);
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          cachedToken = parsed.access_token;
          tokenExpiry = Date.now() + (parsed.expires_in - 60) * 1000; // Refresh 60s before expiry
          console.log('[GCS] Access token successfully acquired');
          resolve(cachedToken);
        } catch (err) {
          console.error('[GCS] Token response parse error. Response data:', data);
          reject(new Error(`Failed to parse token response: ${data}`));
        }
      });
    });

    tokenReq.on('error', (err) => {
      console.error('[GCS] Token request error:', err);
      reject(err);
    });
    tokenReq.write(tokenPayload);
    tokenReq.end();
  });
}

// Upload file to GCS
export async function uploadFileToGCS(bucketName, fileName, fileBuffer, contentType = 'application/octet-stream') {
  console.log(`[GCS] uploadFileToGCS called. Bucket: ${bucketName}, File: ${fileName}, Size: ${fileBuffer.length} bytes`);
  if (!bucketName || typeof bucketName !== 'string' || bucketName.trim() === '') {
    throw new Error('Invalid bucket name. Bucket name must be a non-empty string.');
  }

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    throw new Error('GCS not configured. Set GCS_KEY_JSON environment variable.');
  }

  const token = await getAccessToken();
  console.log('[GCS] Token acquired. Starting file upload request...');

  return new Promise((resolve, reject) => {
    const uploadPath = `/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(fileName)}`;

    const options = {
      hostname: 'www.googleapis.com',
      path: uploadPath,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length
      }
    };

    console.log('[GCS] Sending request to www.googleapis.com...');
    const req = https.request(options, (res) => {
      let data = '';
      console.log('[GCS] Upload response status:', res.statusCode);
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            console.log('[GCS] Upload succeeded. Object URL:', `https://storage.googleapis.com/${bucketName}/${fileName}`);
            resolve({
              name: parsed.name,
              bucket: parsed.bucket,
              url: `https://storage.googleapis.com/${bucketName}/${fileName}`
            });
          } catch (err) {
            resolve({ name: fileName, bucket: bucketName, url: `https://storage.googleapis.com/${bucketName}/${fileName}` });
          }
        } else {
          console.error('[GCS] Upload failed with status:', res.statusCode, 'response data:', data);
          reject(new Error(`GCS upload failed: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('[GCS] Upload request error:', err);
      reject(err);
    });
    req.write(fileBuffer);
    req.end();
  });
}

// Download file from GCS
export async function downloadFileFromGCS(bucketName, fileName) {
  if (!bucketName || typeof bucketName !== 'string' || bucketName.trim() === '') {
    throw new Error('Invalid bucket name. Bucket name must be a non-empty string.');
  }

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    throw new Error('GCS not configured. Set GCS_KEY_JSON environment variable.');
  }

  const token = await getAccessToken();

  return new Promise((resolve, reject) => {
    const downloadPath = `/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media`;

    const options = {
      hostname: 'www.googleapis.com',
      path: downloadPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        const chunks = [];
        res.on('data', chunk => { chunks.push(chunk); });
        res.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      } else {
        reject(new Error(`GCS download failed: ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.end();
  });
}

// Generate signed URL for direct download
export async function getSignedUrlForFile(bucketName, fileName, expirationMinutes = 60) {
  if (!bucketName || typeof bucketName !== 'string' || bucketName.trim() === '') {
    throw new Error('Invalid bucket name. Bucket name must be a non-empty string.');
  }

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    throw new Error('GCS not configured. Set GCS_KEY_JSON environment variable.');
  }

  const token = await getAccessToken();
  const expiration = Math.floor(Date.now() / 1000) + (expirationMinutes * 60);

  return new Promise((resolve, reject) => {
    const signPath = `/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}/signedUrl?expiration=${expiration}`;

    const options = {
      hostname: 'www.googleapis.com',
      path: signPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.signedUrl || `https://storage.googleapis.com/${bucketName}/${fileName}`);
        } catch (err) {
          // Fallback to public URL
          resolve(`https://storage.googleapis.com/${bucketName}/${fileName}`);
        }
      });
    });

    req.on('error', () => {
      // Fallback to public URL if signing fails
      resolve(`https://storage.googleapis.com/${bucketName}/${fileName}`);
    });
    req.end();
  });
}

export default {
  uploadFileToGCS,
  downloadFileFromGCS,
  getSignedUrlForFile
};
