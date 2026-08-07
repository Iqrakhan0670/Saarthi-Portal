import express from 'express';
import { google } from 'googleapis';
import { getEnv } from '../utils/envLoader.js';

const router = express.Router();

// Daily email tracking storage
const DAILY_EMAIL_LIMIT = 300;
const EMAIL_INTERVAL_MS = 72000; // 1.2 minutes (72 seconds) between emails

// In-memory storage
let dailyEmailCount = { date: new Date().toDateString(), count: 0 };
let emailProgressStore = new Map();
let emailAccountsCache = null;

// Safe getEnv wrapper that never throws
const safeGetEnv = (name) => {
  try {
    return getEnv(name, false);
  } catch (e) {
    return undefined;
  }
};

// Lazy load email accounts configuration
const getEmailAccounts = () => {
  if (emailAccountsCache !== null) {
    return emailAccountsCache;
  }

  try {
    const accounts = [
      {
        id: 'account1',
        name: 'Primary Account',
        email: safeGetEnv('EMAIL_HOST'),
        clientId: safeGetEnv('CLIENT_ID'),
        clientSecret: safeGetEnv('CLIENT_SECRET'),
        redirectUri: safeGetEnv('REDIRECT_URI'),
        refreshToken: safeGetEnv('OAUTH_REFRESH_TOKEN')
      },
      {
        id: 'account2',
        name: 'Secondary Account',
        email: safeGetEnv('EMAIL_HOST_2'),
        clientId: safeGetEnv('CLIENT_ID_2'),
        clientSecret: safeGetEnv('CLIENT_SECRET_2'),
        redirectUri: safeGetEnv('REDIRECT_URI_2'),
        refreshToken: safeGetEnv('OAUTH_REFRESH_TOKEN_2')
      },
      {
        id: 'account3',
        name: 'Tertiary Account',
        email: safeGetEnv('EMAIL_HOST_3'),
        clientId: safeGetEnv('CLIENT_ID_3'),
        clientSecret: safeGetEnv('CLIENT_SECRET_3'),
        redirectUri: safeGetEnv('REDIRECT_URI_3'),
        refreshToken: safeGetEnv('OAUTH_REFRESH_TOKEN_3')
      },
      {
        id: 'account4',
        name: 'Fourth Account',
        email: safeGetEnv('EMAIL_HOST_4'),
        clientId: safeGetEnv('CLIENT_ID_4'),
        clientSecret: safeGetEnv('CLIENT_SECRET_4'),
        redirectUri: safeGetEnv('REDIRECT_URI_4'),
        refreshToken: safeGetEnv('OAUTH_REFRESH_TOKEN_4')
      }
    ];

    // Filter out accounts that don't have all required fields
    emailAccountsCache = accounts.filter(account => {
      const isValid = account.email && account.clientId && account.refreshToken;
      return isValid;
    });

    console.log('📧 Email accounts configured:', emailAccountsCache.length);
  } catch (error) {
    console.error('❌ Error loading email accounts:', error.message);
    emailAccountsCache = [];
  }

  return emailAccountsCache;
};

// Helper functions for daily count
function getDailyCount() {
  const today = new Date().toDateString();
  if (dailyEmailCount.date !== today) {
    dailyEmailCount = { date: today, count: 0 };
  }
  return dailyEmailCount.count;
}

function incrementDailyCount() {
  const today = new Date().toDateString();
  if (dailyEmailCount.date !== today) {
    dailyEmailCount = { date: today, count: 0 };
  }
  dailyEmailCount.count++;
  return dailyEmailCount.count;
}

// Encode non-ASCII header values per RFC 2047
function encodeHeaderRFC2047(text) {
  try {
    if (typeof text !== 'string') return '';
    return /[^\x00-\x7F]/.test(text)
      ? `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`
      : text;
  } catch {
    return text || '';
  }
}

// Middleware to verify admin token
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  next();
};

// Function to get Gmail client for a specific account
const getGmailClient = (accountId) => {
  const emailAccounts = getEmailAccounts();
  const account = emailAccounts.find(acc => acc.id === accountId);
  
  if (!account) {
    throw new Error(`Email account ${accountId} not found or not configured`);
  }

  if (!account.clientId || !account.clientSecret || !account.redirectUri || !account.refreshToken) {
    throw new Error(`Email account ${accountId} is missing required credentials`);
  }

  const oAuth2Client = new google.auth.OAuth2(
    account.clientId,
    account.clientSecret,
    account.redirectUri
  );
  oAuth2Client.setCredentials({ refresh_token: account.refreshToken });

  return {
    gmail: google.gmail({ version: 'v1', auth: oAuth2Client }),
    oAuth2Client,
    account
  };
};

// Get list of available email accounts
router.get('/email-accounts', verifyAdmin, (req, res) => {
  try {
    const emailAccounts = getEmailAccounts();
    const accounts = emailAccounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      email: acc.email
    }));
    res.json({ accounts });
  } catch (error) {
    console.error('❌ Error getting email accounts:', error.message);
    res.status(500).json({ error: 'Failed to load email accounts', details: error.message });
  }
});

// Get daily email count and limits
router.get('/daily-email-count', verifyAdmin, (req, res) => {
  try {
    const dailyCount = getDailyCount();
    const remaining = Math.max(0, DAILY_EMAIL_LIMIT - dailyCount);

    res.json({
      dailyCount,
      dailyLimit: DAILY_EMAIL_LIMIT,
      remaining,
      canSendMore: remaining > 0
    });
  } catch (error) {
    console.error('❌ Error getting daily count:', error.message);
    res.status(500).json({ error: 'Failed to get daily count' });
  }
});

// Get email sending progress
router.get('/email-progress/:sessionId', verifyAdmin, (req, res) => {
  try {
    const { sessionId } = req.params;
    const progress = emailProgressStore.get(sessionId);

    if (!progress) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(progress);
  } catch (error) {
    console.error('❌ Error getting email progress:', error.message);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// Cancel email sending session
router.post('/cancel-email/:sessionId', verifyAdmin, (req, res) => {
  try {
    const { sessionId } = req.params;
    const progress = emailProgressStore.get(sessionId);

    if (!progress) {
      return res.status(404).json({ error: 'Session not found' });
    }

    progress.cancelled = true;
    progress.status = 'cancelled';
    emailProgressStore.set(sessionId, progress);

    res.json({ success: true, message: 'Email sending cancelled' });
  } catch (error) {
    console.error('❌ Error cancelling email:', error.message);
    res.status(500).json({ error: 'Failed to cancel' });
  }
});

// Send promotional email with rate limiting and progress tracking
router.post('/send-email', verifyAdmin, async (req, res) => {
  try {
    const { recipients, subject, message, emailAccountId = 'account1' } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Recipients array is required' });
    }

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Check daily limit
    const dailyCount = getDailyCount();
    if (dailyCount >= DAILY_EMAIL_LIMIT) {
      return res.status(429).json({ 
        error: 'Daily email limit reached',
        dailyCount,
        dailyLimit: DAILY_EMAIL_LIMIT,
        message: 'You have reached the daily limit of 300 emails. Please try again tomorrow.'
      });
    }

    // Limit recipients to first 50 if more than 50
    const limitedRecipients = recipients.slice(0, 50);
    if (recipients.length > 50) {
      console.log(`📧 Limiting recipients from ${recipients.length} to 50`);
    }

    // Check if remaining daily limit can accommodate the request
    const remainingDaily = DAILY_EMAIL_LIMIT - dailyCount;
    const finalRecipients = limitedRecipients.slice(0, remainingDaily);
    
    if (finalRecipients.length < limitedRecipients.length) {
      console.log(`📧 Further limiting recipients to ${finalRecipients.length} due to daily limit`);
    }

    // Get Gmail client for selected account
    let gmailClient, oAuth2Client, account;
    try {
      const clients = getGmailClient(emailAccountId);
      gmailClient = clients.gmail;
      oAuth2Client = clients.oAuth2Client;
      account = clients.account;
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    // Preflight check: ensure Gmail API is reachable with current credentials
    try {
      await gmailClient.users.getProfile({ userId: 'me' });
    } catch (preflightErr) {
      console.error('❌ Gmail preflight failed:', preflightErr?.message || preflightErr);
      return res.status(503).json({
        error: 'Unable to send emails right now',
        details: preflightErr?.message || 'Gmail API not available',
        suggestion: 'Please try switching the sending account or try again later.'
      });
    }

    // Create session ID for progress tracking
    const sessionId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize progress tracking
    const progressData = {
      sessionId,
      totalEmails: finalRecipients.length,
      sentCount: 0,
      failedCount: 0,
      currentEmail: 0,
      status: 'sending',
      startTime: new Date().toISOString(),
      estimatedEndTime: new Date(Date.now() + finalRecipients.length * EMAIL_INTERVAL_MS).toISOString(),
      cancelled: false,
      errors: []
    };
    
    emailProgressStore.set(sessionId, progressData);

    console.log(`📧 Admin starting email send session ${sessionId} to ${finalRecipients.length} recipient(s) using ${account.email}`);

    // Return session info immediately and process emails in background
    res.json({
      success: true,
      sessionId,
      totalEmails: finalRecipients.length,
      limitedFrom: recipients.length,
      dailyLimit: DAILY_EMAIL_LIMIT,
      dailyCount: dailyCount,
      remainingDaily: remainingDaily,
      estimatedDuration: Math.ceil(finalRecipients.length * EMAIL_INTERVAL_MS / 60000),
      message: `Email sending started. Session ID: ${sessionId}`
    });

    // Process emails in background with rate limiting
    setImmediate(async () => {
      try {
        for (let i = 0; i < finalRecipients.length; i++) {
          const recipient = finalRecipients[i];
          const progress = emailProgressStore.get(sessionId);

          if (progress && progress.cancelled) {
            console.log(`📧 Email sending cancelled for session ${sessionId}`);
            break;
          }

          const currentDailyCount = getDailyCount();
          if (currentDailyCount >= DAILY_EMAIL_LIMIT) {
            if (progress) {
              progress.status = 'daily_limit_reached';
              progress.errors.push({ recipient, error: 'Daily limit reached' });
              progress.failedCount++;
              emailProgressStore.set(sessionId, progress);
            }
            console.log(`📧 Daily limit reached during sending for session ${sessionId}`);
            break;
          }

          try {
            if (progress) {
              progress.currentEmail = i + 1;
              progress.currentRecipient = recipient;
              emailProgressStore.set(sessionId, progress);
            }

            const htmlBody = message.replace(/\n/g, '<br>');
            const emailLines = [
              `From: "Talent Corner JobPortal" <${account.email}>`,
              `To: ${recipient}`,
              `Subject: ${encodeHeaderRFC2047(subject)}`,
              `List-Unsubscribe: <mailto:unsubscribe@talentcorner.in?subject=unsub>`,
              `MIME-Version: 1.0`,
              `Content-Type: text/html; charset=utf-8`,
              `Content-Transfer-Encoding: 7bit`,
              '',
              htmlBody,
            ].join('\r\n');

            const rawEmail = Buffer.from(emailLines)
              .toString('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_');

            await oAuth2Client.getAccessToken();

            const result = await gmailClient.users.messages.send({
              userId: 'me',
              requestBody: { raw: rawEmail },
            });

            console.log(`✅ Email sent to ${recipient}: ${result.data.id}`);
            if (progress) {
              progress.sentCount++;
              incrementDailyCount();
            }

          } catch (emailError) {
            console.error(`❌ Failed to send email to ${recipient}:`, emailError?.message || String(emailError));
            if (progress) {
              progress.failedCount++;
              progress.errors.push({ recipient, error: emailError?.message || String(emailError) });

              if (i === 0 && progress.sentCount === 0) {
                progress.status = 'error';
                emailProgressStore.set(sessionId, progress);
                console.error(`📧 Session ${sessionId} marked as error due to first-email failure.`);
                break;
              }
            }
          }

          if (progress) {
            emailProgressStore.set(sessionId, progress);
          }

          if (i < finalRecipients.length - 1) {
            await new Promise(resolve => setTimeout(resolve, EMAIL_INTERVAL_MS));
          }
        }

        const finalProgress = emailProgressStore.get(sessionId);
        if (finalProgress) {
          if (finalProgress.status !== 'error' && finalProgress.status !== 'daily_limit_reached' && !finalProgress.cancelled) {
            finalProgress.status = 'completed';
          } else if (finalProgress.cancelled) {
            finalProgress.status = 'cancelled';
          }
          finalProgress.endTime = new Date().toISOString();
          emailProgressStore.set(sessionId, finalProgress);
          console.log(`📧 Email sending session ${sessionId} completed. Sent: ${finalProgress.sentCount}, Failed: ${finalProgress.failedCount}`);
        }
      } catch (err) {
        console.error(`💥 Unhandled error in background sender for session ${sessionId}:`, err?.message || String(err));
        const finalProgress = emailProgressStore.get(sessionId);
        if (finalProgress) {
          finalProgress.status = 'error';
          finalProgress.errors = finalProgress.errors || [];
          finalProgress.errors.push({ error: err?.message || String(err) });
          finalProgress.endTime = new Date().toISOString();
          emailProgressStore.set(sessionId, finalProgress);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error in send-email route:', error);
    res.status(500).json({ error: 'Failed to start email sending', details: error.message });
  }
});

export default router;
