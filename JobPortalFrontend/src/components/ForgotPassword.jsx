"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Check,
  AlertCircle,
} from "lucide-react";
import { getApiBaseUrl } from "../utils/apiConfig";

// --- CONFIGURATION ---
const API_BASE_URL = getApiBaseUrl();

/**
 * ForgotPassword Component
 *
 * BUG FIX #1: This component was missing, causing a 404 error when users clicked
 * the "Forgot password?" link in Login.jsx (line 292).
 *
 * This component allows users to request a password reset email by entering
 * their registered email address. It makes an API call to POST /api/auth/forgot-password
 * and displays success/error feedback to the user.
 *
 * Styling follows the same patterns as Login.jsx and ResetPassword.jsx:
 * - Uses the same theme color system (#0b2147 primary, cyan accents)
 * - Same rounded corners (rounded-2xl, rounded-[2.5rem])
 * - Same shadow styles (shadow-2xl, shadow-blue-900/10)
 * - Same typography patterns (font-black, tracking-widest uppercase)
 */
const ForgotPassword = () => {
  const navigate = useNavigate();

  // Form state for email input
  const [email, setEmail] = useState("");

  // UI state for loading, success, and error handling
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState("success"); // "success" or "error"

  /**
   * Handle form submission
   * Sends POST request to /api/auth/forgot-password with the user's email
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate email is not empty
    if (!email) {
      setAlertMsg("Please enter your email address");
      setAlertType("error");
      setShowAlert(true);
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAlertMsg("Please enter a valid email address");
      setAlertType("error");
      setShowAlert(true);
      return;
    }

    setLoading(true);

    try {
      // API call to request password reset
      // Endpoint: POST /api/auth/forgot-password
      // Body: { email: string }
      // Returns: { success: true, message: "..." } on success
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle API error response
        setAlertMsg(
          responseData.message ||
            "Failed to send reset email. Please try again.",
        );
        setAlertType("error");
        setShowAlert(true);
        return;
      }

      // Success - show confirmation message
      setAlertMsg(
        responseData.message ||
          "Password reset email sent! Check your inbox for further instructions.",
      );
      setAlertType("success");
      setShowAlert(true);
    } catch (error) {
      console.error("Forgot Password Error:", error);
      setAlertMsg("An error occurred. Please try again later.");
      setAlertType("error");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Close alert modal and navigate to login on success
   */
  const handleAlertClose = () => {
    setShowAlert(false);
    if (alertType === "success") {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full">
        {/* Header with branding - matches ResetPassword.jsx styling */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0b2147] rounded-2xl mb-4 shadow-xl">
            <ShieldCheck className="text-cyan-400 w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-[#0b2147] tracking-tight">
            SaarthiJobs
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            Forgot Your Password?
          </p>
        </div>

        {/* Main card - matches ResetPassword.jsx styling */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-slate-200 p-10">
          {/* Info message */}
          <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <p className="text-sm text-blue-800 font-medium">
              Enter your registered email address and we'll send you a link to
              reset your password.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Input Field */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"
                  size={20}
                />
                <input
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl outline-none transition-all focus:border-blue-600 focus:bg-white"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Submit Button - matches ResetPassword.jsx styling */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0b2147] text-white py-4 rounded-2xl font-black tracking-widest uppercase flex items-center justify-center gap-3 hover:bg-blue-900 transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Sending...
                </>
              ) : (
                <>
                  Send Reset Link
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            {/* Footer Link - matches ResetPassword.jsx styling */}
            <div className="pt-6 border-t border-slate-100">
              <p className="text-center text-sm text-slate-500 font-medium">
                Remember your password?{" "}
                <Link
                  to="/login"
                  className="text-blue-600 font-black hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Alert Modal - matches ResetPassword.jsx alert styling */}
      {showAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center max-w-sm w-full">
            <div
              className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 ${
                alertType === "success"
                  ? "bg-green-100 text-green-600"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {alertType === "success" ? (
                <Check size={40} />
              ) : (
                <AlertCircle size={40} />
              )}
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">
              {alertType === "success" ? "Email Sent" : "Notice"}
            </h3>
            <p className="text-slate-500 font-medium mb-8">{alertMsg}</p>
            <button
              onClick={handleAlertClose}
              className="w-full py-4 bg-[#0b2147] text-white rounded-2xl font-black tracking-widest uppercase shadow-lg shadow-blue-900/20"
            >
              {alertType === "success" ? "Back to Login" : "Try Again"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgotPassword;
