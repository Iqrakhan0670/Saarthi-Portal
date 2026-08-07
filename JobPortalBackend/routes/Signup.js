import express from "express";
// Import the functions from the new file we just created
import { sendOtp, registerUser, forgotPassword, resetPassword } from "../controller/authControllers.js";

const router = express.Router();

// 1. Route to request the OTP
router.post("/send-otp", sendOtp);

// 2. Route to submit OTP + All Details
router.post("/verify", registerUser);

// 3. Route for forgot password (send reset link)
router.post("/forgot-password", forgotPassword);

// 4. Route for reset password (update password with token)
router.post("/reset-password", resetPassword);

export default router;