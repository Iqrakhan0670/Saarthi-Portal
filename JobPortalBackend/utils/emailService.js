import nodemailer from 'nodemailer';
import { getEnv } from '../utils/envLoader.js';

let transporterInstance = null;

const getTransporter = () => {
  if (transporterInstance) {
    return transporterInstance;
  }
  
  // Try to get email credentials - use EMAIL_HOST as fallback for EMAIL_USER
  const emailUser = getEnv('EMAIL_USER', false) || getEnv('EMAIL_HOST', false);
  const emailPass = getEnv('EMAIL_PASS', false);
  
  console.log(`📧 [Email] Initializing transporter with user: ${emailUser ? emailUser.substring(0, 5) + '...' : 'NOT SET'}`);
  
  if (!emailUser || !emailPass) {
    const error = new Error('Email credentials not configured. Please set EMAIL_USER/EMAIL_HOST and EMAIL_PASS in .env');
    console.error(`❌ [Email] ${error.message}`);
    throw error;
  }
  
  try {
    transporterInstance = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // TLS
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
    
    console.log(`✅ [Email] Transporter created successfully`);
  } catch (error) {
    console.error(`❌ [Email] Failed to create transporter:`, error.message);
    throw error;
  }
  
  return transporterInstance;
};

export const sendOtpEmail = async (email, otp) => {
  const emailUser = getEnv('EMAIL_USER', false) || getEnv('EMAIL_HOST', false);
  
  console.log(`📧 [Email OTP] Starting OTP email send to: ${email}`);
  
  if (!emailUser) {
    console.error('❌ [Email OTP] Email sending failed: EMAIL_USER or EMAIL_HOST not configured');
    return false;
  }
  
  const mailOptions = {
    from: emailUser,
    to: email,
    subject: 'Your Verification Code - Job Portal',
    text: `Your OTP for registration is: ${otp}. It expires in 10 minutes.`,
    html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`
  };

  try {
    console.log(`📧 [Email OTP] Getting transporter...`);
    const transporter = getTransporter();
    console.log(`📧 [Email OTP] Sending mail from: ${emailUser}, to: ${email}`);
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ [Email OTP] Email sent successfully. Message ID: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ [Email OTP] Email sending failed with error:');
    console.error('   Error Code:', error.code);
    console.error('   Error Message:', error.message);
    console.error('   Response:', error.response);
    if (error.code === 'EAUTH') {
      console.error('   💡 Hint: Gmail authentication failed. Make sure you are using an App Password, not your regular password.');
    }
    return false;
  }
};

export const sendEmployerApprovalEmail = async (email, companyName, isApproved, notes = '') => {
  const emailUser = getEnv('EMAIL_USER', false) || getEnv('EMAIL_HOST', false);
  
  console.log(`📧 [Email Approval] Starting approval email send to: ${email}`);
  
  if (!emailUser) {
    console.error('❌ [Email Approval] Email sending failed: EMAIL_USER or EMAIL_HOST not configured');
    return false;
  }

  const subject = isApproved 
    ? '🎉 Your Employer Account Has Been Approved! - Job Portal'
    : '❌ Your Employer Account Application - Job Portal';

  const htmlContent = isApproved 
    ? `<h2>Welcome, ${companyName}!</h2>
       <p>Great news! Your employer account has been <strong>approved</strong> by our admin team.</p>
       <p>You can now log in and start posting job listings.</p>
       ${notes ? `<p><strong>Admin Notes:</strong> ${notes}</p>` : ''}
       <p>Best regards,<br>Job Portal Team</p>`
    : `<h2>Employer Account Application Status</h2>
       <p>Thank you for your interest in posting jobs on our platform.</p>
       <p>Unfortunately, your employer account application has been <strong>rejected</strong>.</p>
       ${notes ? `<p><strong>Reason:</strong> ${notes}</p>` : ''}
       <p>If you believe this is a mistake, please contact our support team.</p>
       <p>Best regards,<br>Job Portal Team</p>`;

  const textContent = isApproved
    ? `Your employer account for ${companyName} has been approved. You can now log in and start posting jobs.${notes ? `\nAdmin Notes: ${notes}` : ''}`
    : `Your employer account application has been rejected.${notes ? `\nReason: ${notes}` : ''}`;

  const mailOptions = {
    from: emailUser,
    to: email,
    subject: subject,
    text: textContent,
    html: htmlContent
  };

  try {
    console.log(`📧 [Email Approval] Getting transporter...`);
    const transporter = getTransporter();
    console.log(`📧 [Email Approval] Sending ${isApproved ? 'approval' : 'rejection'} email from: ${emailUser}, to: ${email}`);
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ [Email Approval] Email sent successfully. Message ID: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ [Email Approval] Email sending failed with error:`);
    console.error('   Error Code:', error.code);
    console.error('   Error Message:', error.message);
    console.error('   Response:', error.response);
    if (error.code === 'EAUTH') {
      console.error('   💡 Hint: Gmail authentication failed. Make sure you are using an App Password, not your regular password.');
    }
    return false;
  }
};