// backend/test-email.js
import { sendOtpEmail } from './utils/emailService.js';

console.log('⏳ Sending test email...');

// Replace this with your OTHER email address to test receiving
sendOtpEmail('tikamkrutik@gmail.com', '123456');