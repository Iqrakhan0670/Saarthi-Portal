import express from "express";
import { forgotPassword, resetPassword } from "../controller/authControllers.js";

const router = express.Router();

// Password recovery routes
// NOTE: These routes are also available at /api/signup/forgot-password and /api/signup/reset-password
// These are kept for backward compatibility but may be deprecated in future

router.post("/forgot-password", async (req, res, next) => {
  try {
    // Validate email presence
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Call the controller
    await forgotPassword(req, res, next);
  } catch (error) {
    console.error('[Auth] Error in forgot-password:', error.message);
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    // Validate required fields
    const { token, password, confirmPassword } = req.body;
    const errors = [];

    if (!token) errors.push("Token is required");
    if (!password) errors.push("Password is required");
    if (!confirmPassword) errors.push("Confirm password is required");

    if (errors.length > 0) {
      return res.status(400).json({ message: "Validation error", errors });
    }

    // Call the controller
    await resetPassword(req, res, next);
  } catch (error) {
    console.error('[Auth] Error in reset-password:', error.message);
    next(error);
  }
});

export default router;
