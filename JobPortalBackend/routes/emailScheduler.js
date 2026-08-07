import express from 'express';
import { google } from 'googleapis';  // For Gmail API
import { getEnv } from '../utils/envLoader.js'; // Import getEnv

const router = express.Router();

let oAuth2ClientInstance = null;
let gmailInstance = null;

// Lazy initialize OAuth2 client
const getOAuth2Client = () => {
  if (oAuth2ClientInstance) {
    return oAuth2ClientInstance;
  }
  
  try {
    const clientId = getEnv('CLIENT_ID', false);
    const clientSecret = getEnv('CLIENT_SECRET', false);
    const redirectUri = getEnv('REDIRECT_URI', false);
    const refreshToken = getEnv('OAUTH_REFRESH_TOKEN', false);

    if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
      throw new Error('Email OAuth credentials not configured');
    }

    oAuth2ClientInstance = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
    oAuth2ClientInstance.setCredentials({ refresh_token: refreshToken });
    return oAuth2ClientInstance;
  } catch (error) {
    console.error('❌ Failed to initialize OAuth2 client:', error.message);
    throw error;
  }
};

// Lazy initialize Gmail API client
const getGmailClient = () => {
  if (gmailInstance) {
    return gmailInstance;
  }
  gmailInstance = google.gmail({ version: 'v1', auth: getOAuth2Client() });
  return gmailInstance;
};

// Send email (shared) – Using Gmail API (raw message)
const sendEmail = async (data) => {
  try {
    const oAuth2Client = getOAuth2Client();
    const gmail = getGmailClient();
    const emailHost = getEnv('EMAIL_HOST', false);

    if (!emailHost) {
      throw new Error('EMAIL_HOST not configured');
    }

    // Get fresh access token
    const { token: accessToken } = await oAuth2Client.getAccessToken();
    console.log('🔍 Token refreshed OK');

    // Build raw email (base64url encoded MIME)
    const htmlBody = data.html || data.text.replace(/\n/g, '<br>');  // Fix: Replace \n with <br> for HTML line breaks
    const emailLines = [
      `From: "Talent Corner JobPortal" <${emailHost}>`,
      `To: ${data.to}`,
      `Subject: ${data.subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: 7bit`,
      '',
      htmlBody,
    ].join('\r\n');
    const rawEmail = Buffer.from(emailLines).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    // Send via Gmail API
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawEmail,
      },
    });

    console.log(`✅ Email sent to ${data.to}: ${res.data.id}`);
    return { success: true, messageId: res.data.id };
  } catch (error) {
    console.error('❌ Gmail API Send Error:', error.message);
    return { success: false, error: error.message };
  }
};

// === SEND NOW (Immediate) ===
router.post('/send-now', async (req, res) => {
  const { to, subject, text, html } = req.body;

  if (!to || !subject || (!text && !html)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const result = await sendEmail({ to, subject, text, html });

  if (result.success) {
    res.json({ success: true, messageId: result.messageId });
  } else {
    res.status(500).json({ error: result.error });
  }
});

export default router;