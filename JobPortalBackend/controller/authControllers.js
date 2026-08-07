import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import validator from 'validator';
import { sendOtpEmail } from '../utils/emailService.js';
import axios from 'axios';
import { getEnv } from '../utils/envLoader.js';
import nodemailer from 'nodemailer';

// --- CONFIGURATION ---
// Google's official reCAPTCHA v2 test secret key - ALWAYS PASSES verification on localhost
const TEST_RECAPTCHA_SECRET_KEY = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

const getRecaptchaSecretKey = () => {
  const nodeEnv = (getEnv('NODE_ENV', false) || process.env.NODE_ENV || '').toLowerCase();
  const isLocalhost = nodeEnv === 'development' || 
                       nodeEnv === 'local' || 
                       nodeEnv === 'dev' || 
                       nodeEnv === '' || 
                       !nodeEnv;

  const configuredKey = getEnv('RECAPTCHA_SECRET_KEY', false) || process.env.RECAPTCHA_SECRET_KEY;
  if (configuredKey) return configuredKey;
  if (isLocalhost) return TEST_RECAPTCHA_SECRET_KEY;
  return null;
};

// --- VALIDATION HELPER ---
const validateSignupData = (data) => {
  const errors = {};
  if (!data.fullName || !data.fullName.trim()) errors.fullName = "Full name is required";
  if (!data.email) {
    errors.email = "Email is required";
  } else if (!validator.isEmail(data.email)) {
    errors.email = "Please enter a valid email address";
  }
  if (!data.password) {
    errors.password = "Password is required";
  } else {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@!%*?&]{8,}$/;
    if (!passwordRegex.test(data.password)) {
      errors.password = "Password must be at least 8 characters with uppercase, lowercase, and number";
    }
  }
  if (!data.mobileNumber) {
    errors.mobileNumber = "Mobile number is required";
  } else {
    const mobileRegex = /^(?:\+91)?[6-9]\d{9}$/;
    if (!mobileRegex.test(data.mobileNumber.replace(/\s+/g, ""))) {
      errors.mobileNumber = "Please enter a valid 10-digit Indian mobile number";
    }
  }
  if (!data.userType || !["job_seeker", "job_poster"].includes(data.userType)) {
    errors.userType = "Please select a valid user type";
  }
  if (data.userType === "job_seeker") {
    if (!data.workStatus || !["experienced", "fresher"].includes(data.workStatus)) {
      if (!data.workStatus) errors.workStatus = "Please select a valid work status";
    }
  } else if (data.userType === "job_poster") {
    if (!data.companyName || !data.companyName.trim()) {
      errors.companyName = "Company name is required";
    }
  }
  return errors;
};

// --- CONTROLLER FUNCTIONS ---

// 1. GENERATE & SEND OTP
export const sendOtp = async (req, res) => {
  const { email, captchaToken } = req.body;
  
  console.log(`➡️ [OTP] Request received for: ${email}`);
  console.log(`🔐 [OTP] Captcha Token received: ${captchaToken ? 'YES' : 'NO'}`);

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    // A. VERIFY CAPTCHA
    console.log(`🔍 [OTP] Verifying CAPTCHA...`);
    if (!captchaToken) {
        console.error(`❌ [OTP] Missing Captcha Token`);
        return res.status(400).json({ message: "Please complete the CAPTCHA check." });
    }

    const recaptchaSecret = getRecaptchaSecretKey();

    if (!recaptchaSecret) {
        console.error(`❌ [OTP] RECAPTCHA_SECRET_KEY is missing in environment variables!`);
        return res.status(500).json({ message: "Server configuration error. Please contact support." });
    }

    console.log(`🔐 [OTP] Using RECAPTCHA_SECRET_KEY: ${recaptchaSecret.substring(0, 10)}...`);
    
    const recaptchaResponse = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${captchaToken}`
    );

    console.log(`📊 [OTP] reCAPTCHA Response - Success: ${recaptchaResponse.data.success}, Score: ${recaptchaResponse.data.score}`);

    if (!recaptchaResponse.data.success) {
        console.error(`❌ [OTP] Captcha Failed:`, recaptchaResponse.data['error-codes']);
        return res.status(400).json({ message: "CAPTCHA verification failed. Please try again." });
    }
    console.log(`✅ [OTP] CAPTCHA Verified.`);

    // B. GENERATE OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000);

    console.log(`💾 [OTP] Generated OTP for ${email}: ${otp}, expires at: ${expiresAt}`);

    // Clean up any expired OTPs for this email first
    try {
      await db.query('DELETE FROM otp_store WHERE email = ? AND expires_at < NOW()', [email]);
    } catch (cleanupErr) {
      console.log(`⚠️ [OTP] Cleanup of expired OTPs (non-critical): ${cleanupErr.message}`);
    }

    // Save OTP using INSERT with ON DUPLICATE KEY UPDATE
    const query = `
      INSERT INTO otp_store (email, otp_code, expires_at)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        otp_code = VALUES(otp_code),
        expires_at = VALUES(expires_at),
        created_at = CURRENT_TIMESTAMP
    `;

    try {
      await db.query(query, [email, otp, expiresAt]);
      console.log(`✅ [OTP] Saved to DB for ${email}`);
    } catch (dbError) {
      console.error(`❌ [OTP] Database error:`, dbError.message);
      // If the table doesn't exist or has issues, try to create it
      if (dbError.code === 'ER_NO_SUCH_TABLE') {
        console.error(`❌ [OTP] otp_store table does not exist. Please restart the server.`);
        return res.status(500).json({
          success: false,
          message: "Server configuration error. Please try again in a moment."
        });
      }
      throw dbError;
    }

    // C. SEND EMAIL
    console.log(`📧 [OTP] Attempting to send OTP email to: ${email}`);
    const emailSuccess = await sendOtpEmail(email, otp);

    if (emailSuccess) {
      console.log(`✅ [OTP] Email Sent Successfully.`);
      res.status(200).json({ success: true, message: "OTP sent successfully!" });
    } else {
      console.error(`❌ [OTP] Email Service Failed`);
      console.error(`📝 [OTP] Debug: Check backend logs for email configuration issues`);
      res.status(500).json({ 
        success: false, 
        message: "Failed to send OTP email. Please verify email configuration or try again later." 
      });
    }
  } catch (error) {
    console.error("❌ [OTP] FATAL ERROR:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

// 2. VERIFY OTP & REGISTER USER
export const registerUser = async (req, res) => {
  const { fullName, email, password, mobileNumber, workStatus, companyName, sendUpdates, userType, otp } = req.body;

  console.log(`➡️ [Register] Request received for: ${email}`); // DEBUG LOG

  // A. RUN VALIDATION (This validates password, mobile, etc. BEFORE OTP check)
  const validationErrors = validateSignupData(req.body);
  if (Object.keys(validationErrors).length > 0) {
    console.log(`⚠️ [Register] Validation Failed:`, validationErrors);
    return res.status(400).json({ errors: validationErrors });
  }

  // Validate OTP presence
  if (!otp) {
    return res.status(400).json({ message: "OTP is required" });
  }

  try {
    // B. VERIFY OTP
    console.log(`🔍 [Register] Checking OTP in DB...`);

    // First, clean up expired OTPs for this email
    await db.query('DELETE FROM otp_store WHERE email = ? AND expires_at < NOW()', [email]);

    // Now get the most recent OTP for this email (don't filter by expires_at here)
    const [otpRecord] = await db.query(
      'SELECT * FROM otp_store WHERE email = ? ORDER BY created_at DESC LIMIT 1',
      [email]
    );

    if (otpRecord.length === 0) {
      console.log(`❌ [Register] No OTP found for email`);
      return res.status(400).json({ message: "Invalid or expired OTP. Please request a new OTP." });
    }

    // Check if OTP is expired
    const otpExpiresAt = new Date(otpRecord[0].expires_at);
    const now = new Date();
    if (now > otpExpiresAt) {
      console.log(`❌ [Register] OTP expired. Expires: ${otpExpiresAt}, Now: ${now}`);
      // Clean up expired OTP
      await db.query('DELETE FROM otp_store WHERE email = ?', [email]);
      return res.status(400).json({ message: "OTP has expired. Please request a new OTP." });
    }

    // Normalize OTP comparison - handle both string and numeric types, remove whitespace
    const storedOtp = String(otpRecord[0].otp_code).trim().toUpperCase();
    const providedOtp = String(otp).trim().toUpperCase();

    console.log(`🔍 [Register] Comparing OTPs - Stored: ${storedOtp}, Provided: ${providedOtp}`);
    console.log(`🔍 [Register] OTP Record:`, {
      id: otpRecord[0].id,
      email: otpRecord[0].email,
      otp_code: otpRecord[0].otp_code,
      expires_at: otpRecord[0].expires_at,
      created_at: otpRecord[0].created_at
    });

    if (storedOtp !== providedOtp) {
      console.log(`❌ [Register] Invalid OTP Entered`);
      return res.status(400).json({ message: "Invalid OTP. Please check and try again." });
    }

    console.log(`✅ [Register] OTP Valid.`);

    // C. CREATE USER
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log(`💾 [Register] Inserting User into Database...`);

    // Job seekers are auto-approved, employers need admin approval
    const isApproved = userType === "job_seeker" ? 1 : 0;
    const approvalStatus = userType === "job_seeker" ? "approved" : "pending";
    
    let result;
    try {
      // Try to insert with new columns
      [result] = await db.query(
        `INSERT INTO users (full_name, email, password, mobile_number, work_status, company_name, send_updates, user_type, is_approved, approval_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fullName,
          email,
          hashedPassword,
          mobileNumber,
          userType === "job_seeker" ? workStatus : null,
          userType === "job_poster" ? companyName : null,
          sendUpdates ? 1 : 0,
          userType,
          isApproved,
          approvalStatus,
        ]
      );
    } catch (innerError) {
      // If columns don't exist, fall back to old INSERT (without approval columns)
      if (innerError.code === 'ER_BAD_FIELD_ERROR') {
        console.log(`⚠️ [Register] Approval columns not yet migrated, using fallback INSERT...`);
        [result] = await db.query(
          `INSERT INTO users (full_name, email, password, mobile_number, work_status, company_name, send_updates, user_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fullName,
            email,
            hashedPassword,
            mobileNumber,
            userType === "job_seeker" ? workStatus : null,
            userType === "job_poster" ? companyName : null,
            sendUpdates ? 1 : 0,
            userType,
          ]
        );
      } else {
        throw innerError;
      }
    }

    console.log(`✅ [Register] User Created. ID: ${result.insertId}`);

    // D. CLEANUP OTP
    await db.query('DELETE FROM otp_store WHERE email = ?', [email]);

    const message = userType === "job_seeker" 
      ? "User created successfully" 
      : "Employer account created. Awaiting admin approval to activate your account.";

    res.status(201).json({
      success: true,
      message: message,
      userId: result.insertId,
      requiresApproval: userType === "job_poster",
    });

  } catch (error) {
    console.error("❌ [Register] FATAL ERROR:", error); // LOOK HERE FOR SQL ERRORS
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email already exists" });
    }
    // Handle missing column errors specifically
    if (error.code === "ER_BAD_FIELD_ERROR") {
      console.error("❌ [Register] Database column error:", error.sqlMessage);
      return res.status(500).json({ error: "Database configuration error. Please contact support." });
    }
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

// 3. LOGIN USER (With CAPTCHA + Lockout)
export const loginUser = async (req, res) => {
    // ... (Login logic is fine, you can keep it as is or request logs if login fails too)
};

// 4. FORGOT PASSWORD - SEND RESET LINK
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  console.log(`➡️ [ForgotPassword] Request received for: ${email}`);

  if (!email || !validator.isEmail(email)) {
    console.log(`❌ [ForgotPassword] Invalid email provided`);
    return res.status(400).json({ message: "Please provide a valid email address" });
  }

  try {
    // A. CHECK IF USER EXISTS
    console.log(`🔍 [ForgotPassword] Checking if user exists...`);
    const [users] = await db.query('SELECT id FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      // Don't reveal if email exists (security best practice)
      console.log(`⚠️ [ForgotPassword] Email not found in DB (generic response sent)`);
      return res.status(200).json({ 
        success: true, 
        message: "If an account exists with this email, a password reset link has been sent." 
      });
    }

    const user = users[0];

    // B. GENERATE RESET TOKEN
    console.log(`🔐 [ForgotPassword] Generating reset token...`);
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60000); // 15 minutes

    // C. SAVE TOKEN TO DATABASE
    console.log(`💾 [ForgotPassword] Saving token to database...`);
    const query = `
      INSERT INTO password_reset_tokens (user_id, email, token, expires_at, used)
      VALUES (?, ?, ?, ?, FALSE)
    `;
    
    await db.query(query, [user.id, email, hashedToken, expiresAt]);
    console.log(`✅ [ForgotPassword] Token saved successfully`);

    // D. SEND RESET EMAIL
    console.log(`📧 [ForgotPassword] Attempting to send reset email...`);
    const resetUrl = `${getEnv('FRONTEND_URL', false) || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    const emailSuccess = await sendPasswordResetEmail(email, resetUrl);

    if (emailSuccess) {
      console.log(`✅ [ForgotPassword] Email sent successfully`);
      return res.status(200).json({ 
        success: true, 
        message: "If an account exists with this email, a password reset link has been sent." 
      });
    } else {
      console.error(`❌ [ForgotPassword] Email service failed`);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to send reset email. Please try again later." 
      });
    }

  } catch (error) {
    console.error("❌ [ForgotPassword] FATAL ERROR:", error.message);
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

// 5. RESET PASSWORD - UPDATE PASSWORD WITH TOKEN
export const resetPassword = async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  console.log(`➡️ [ResetPassword] Request received`);

  // A. VALIDATE INPUT
  if (!token || !password || !confirmPassword) {
    console.log(`❌ [ResetPassword] Missing required fields`);
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (password !== confirmPassword) {
    console.log(`❌ [ResetPassword] Passwords do not match`);
    return res.status(400).json({ message: "Passwords do not match" });
  }

  // B. VALIDATE PASSWORD
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    console.log(`❌ [ResetPassword] Password validation failed`);
    return res.status(400).json({ 
      message: "Password must be at least 8 characters with uppercase, lowercase, and number" 
    });
  }

  try {
    // C. HASH THE RESET TOKEN
    console.log(`🔐 [ResetPassword] Validating reset token...`);
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // D. FIND AND VALIDATE TOKEN
    const [tokenRecords] = await db.query(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE',
      [hashedToken]
    );

    if (tokenRecords.length === 0) {
      console.log(`❌ [ResetPassword] Token not found or already used`);
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    const tokenRecord = tokenRecords[0];

    // E. CHECK IF TOKEN IS EXPIRED
    if (new Date(tokenRecord.expires_at) < new Date()) {
      console.log(`❌ [ResetPassword] Token has expired`);
      return res.status(400).json({ message: "Reset link has expired. Please request a new one." });
    }

    // F. HASH NEW PASSWORD
    console.log(`🔐 [ResetPassword] Hashing new password...`);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // G. UPDATE USER PASSWORD
    console.log(`💾 [ResetPassword] Updating user password...`);
    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, tokenRecord.user_id]
    );

    // H. MARK TOKEN AS USED
    console.log(`✅ [ResetPassword] Marking token as used...`);
    await db.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = ?',
      [tokenRecord.id]
    );

    console.log(`✅ [ResetPassword] Password reset successful`);
    res.status(200).json({ 
      success: true, 
      message: "Password reset successfully. You can now login with your new password." 
    });

  } catch (error) {
    console.error("❌ [ResetPassword] FATAL ERROR:", error.message);
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

// HELPER: SEND PASSWORD RESET EMAIL
const sendPasswordResetEmail = async (email, resetUrl) => {
  const emailUser = getEnv('EMAIL_USER', false) || getEnv('EMAIL_HOST', false);

  console.log(`📧 [Email Reset] Starting password reset email to: ${email}`);

  if (!emailUser) {
    console.error('❌ [Email Reset] Email sending failed: EMAIL_USER or EMAIL_HOST not configured');
    return false;
  }

  const mailOptions = {
    from: emailUser,
    to: email,
    subject: 'Password Reset Request - Job Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0b2147 0%, #1e4d8b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">Password Reset Request</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e8f0;">
          <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">
            We received a request to reset your password for your Job Portal account.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #0b2147; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reset Your Password
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">
            Or copy this link: <br>
            <code style="background: #e0e8f0; padding: 8px; border-radius: 4px; word-break: break-all;">${resetUrl}</code>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e0e8f0; margin: 20px 0;">
          
          <p style="color: #94a3b8; font-size: 13px;">
            <strong>Security Notice:</strong> This reset link will expire in 15 minutes. If you did not request a password reset, please ignore this email and your password will remain unchanged.
          </p>
          
          <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">
            © 2024 Job Portal. All rights reserved.
          </p>
        </div>
      </div>
    `
  };

  try {
    const transporter = getTransporter();
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ [Email Reset] Email sent successfully. Message ID: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ [Email Reset] Email sending failed:');
    console.error('   Error Code:', error.code);
    console.error('   Error Message:', error.message);
    return false;
  }
};

// HELPER: GET TRANSPORTER
const getTransporter = () => {
  const emailUser = getEnv('EMAIL_USER', false) || getEnv('EMAIL_HOST', false);
  const emailPass = getEnv('EMAIL_PASS', false);

  if (!emailUser || !emailPass) {
    throw new Error('Email credentials not configured');
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: emailUser, pass: emailPass }
  });
};