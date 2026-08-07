"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  X,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { getApiBaseUrl } from "../utils/apiConfig";

// API Configuration
const API_BASE_URL = getApiBaseUrl();

const ResetPassword = () => {
  // BUG FIX #2: useSearchParams returns an array [searchParams, setSearchParams], not just searchParams
  // The original code was missing array destructuring, causing searchParams.get() to fail
  // Correct syntax: const [searchParams] = useSearchParams()
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState("success"); // success or error
  const [tokenValid, setTokenValid] = useState(true);

  useEffect(() => {
    // Validate token on mount
    if (!token) {
      setTokenValid(false);
      setAlertMsg(
        "Invalid or missing reset token. Requesting a new password reset link.",
      );
      setAlertType("error");
      setShowAlert(true);
    }
  }, [token]);

  const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@!%*?&]{8,}$/;
    return regex.test(password);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    // Validate passwords
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!validatePassword(formData.password)) {
      newErrors.password =
        "Password must be at least 8 characters with uppercase, lowercase, and number";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0 && token) {
      setIsSubmitting(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/reset-password`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              password: formData.password,
              confirmPassword: formData.confirmPassword,
            }),
          },
        );

        const responseData = await response.json();

        if (!response.ok) {
          setAlertMsg(
            responseData.message ||
              "Failed to reset password. Please try again.",
          );
          setAlertType("error");
          setShowAlert(true);
          return;
        }

        setAlertMsg("Password reset successful! Redirecting to login...");
        setAlertType("success");
        setShowAlert(true);

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } catch (error) {
        setAlertMsg("An error occurred. Please try again later.");
        setAlertType("error");
        setShowAlert(true);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-4">
              <X className="text-red-600 w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-[#0b2147] tracking-tight">
              Invalid Link
            </h2>
            <p className="text-slate-500 font-medium mt-1">
              The password reset link is invalid or expired
            </p>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-slate-200 p-10 text-center">
            <p className="text-slate-600 font-medium mb-8">
              This link has expired or is no longer valid. Please request a new
              password reset.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-[#0b2147] text-white py-4 rounded-2xl font-black tracking-widest uppercase flex items-center justify-center gap-3 hover:bg-blue-900 transition-all shadow-xl shadow-blue-900/20"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full">
        {/* Office Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0b2147] rounded-2xl mb-4 shadow-xl">
            <ShieldCheck className="text-cyan-400 w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-[#0b2147] tracking-tight">
            SaarthiJobs
          </h2>
          <p className="text-slate-500 font-medium mt-1">Reset Your Password</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-slate-200 p-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Password Field */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                New Password
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"
                  size={20}
                />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full pl-12 pr-12 py-4 bg-slate-50 border-2 rounded-2xl outline-none transition-all ${
                    errors.password
                      ? "border-red-500"
                      : "border-transparent focus:border-blue-600 focus:bg-white"
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 ml-1 text-xs font-bold text-red-500">
                  {errors.password}
                </p>
              )}
              {formData.password && !errors.password && (
                <p className="mt-2 ml-1 text-xs font-medium text-green-600 flex items-center gap-1">
                  <Check size={14} /> Password meets requirements
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Confirm Password
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"
                  size={20}
                />
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full pl-12 pr-12 py-4 bg-slate-50 border-2 rounded-2xl outline-none transition-all ${
                    errors.confirmPassword
                      ? "border-red-500"
                      : "border-transparent focus:border-blue-600 focus:bg-white"
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 ml-1 text-xs font-bold text-red-500">
                  {errors.confirmPassword}
                </p>
              )}
              {formData.confirmPassword &&
                !errors.confirmPassword &&
                formData.password === formData.confirmPassword && (
                  <p className="mt-2 ml-1 text-xs font-medium text-green-600 flex items-center gap-1">
                    <Check size={14} /> Passwords match
                  </p>
                )}
            </div>

            {/* Password Requirements Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-xs font-bold text-blue-900 mb-2">
                Password Requirements:
              </p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span> At least 8
                  characters
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span> One uppercase
                  letter (A-Z)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span> One lowercase
                  letter (a-z)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span> One number (0-9)
                </li>
              </ul>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !tokenValid}
              className="w-full bg-[#0b2147] text-white py-4 rounded-2xl font-black tracking-widest uppercase flex items-center justify-center gap-3 hover:bg-blue-900 transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Resetting..." : "Reset Password"}
              {!isSubmitting && <ArrowRight size={20} />}
            </button>

            {/* Footer Link */}
            <div className="pt-6 border-t border-slate-100">
              <p className="text-center text-sm text-slate-500 font-medium">
                Remember your password?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-blue-600 font-black hover:underline"
                >
                  Sign In
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Alert Modal */}
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
              {alertType === "success" ? "Success" : "Notice"}
            </h3>
            <p className="text-slate-500 font-medium mb-8">{alertMsg}</p>
            <button
              onClick={() => {
                setShowAlert(false);
                if (alertType === "error") {
                  navigate("/login");
                }
              }}
              className="w-full py-4 bg-[#0b2147] text-white rounded-2xl font-black tracking-widest uppercase shadow-lg shadow-blue-900/20"
            >
              {alertType === "success" ? "Got it" : "Back to Login"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResetPassword;
