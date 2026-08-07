"use client";

import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ReCAPTCHA from "react-google-recaptcha";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Briefcase,
  User,
  ArrowRight,
} from "lucide-react";
import { getRecaptchaSiteKey } from "../utils/recaptchaConfig";

// --- CONFIGURATION ---
// Use relative path for localhost/development (Vite Proxy handles it), full URL for production
const isDevelopment =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  import.meta.env.DEV;

// On localhost/development, use relative path (Vite proxy forwards to backend:8080)
// On production, use the environment variable
const API_BASE_URL = isDevelopment
  ? ""
  : import.meta.env.VITE_API_URL || "http://localhost:8080";
const SITE_KEY = getRecaptchaSiteKey(); // Dynamically select key based on domain

const Login = () => {
  const navigate = useNavigate();
  const captchaRef = useRef(null);

  // 'seeker' = Left side active, 'poster' = Right side active
  const [activeRole, setActiveRole] = useState("seeker");

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [captchaToken, setCaptchaToken] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
  };

  // Helper to fully reset captcha state and widget
  const resetCaptcha = () => {
    setCaptchaToken(null);
    if (captchaRef.current) {
      captchaRef.current.reset();
    }
  };

  const handleCaptchaExpired = () => {
    resetCaptcha();
    toast.error("Captcha expired. Please check the box again.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password)
      return toast.error("Please fill in all fields");
    if (!captchaToken) return toast.error("Please verify you are not a robot");

    setLoading(true);

    try {
      // Use relative path (/api/login) so Vite Proxy handles the port forwarding
      const res = await axios.post(`${API_BASE_URL}/api/login`, {
        email: formData.email,
        password: formData.password,
        role: activeRole, // Optional: Backend usually ignores this for login, but good for context
        captchaToken: captchaToken,
      });

      if (res.data.success) {
        // --- STRICT ROLE CHECK ---
        // Backend returns "job_poster" or "job_seeker". We normalize it.
        const actualRole = res.data.user.role?.toLowerCase().trim();
        const isPosterAccount =
          actualRole === "job_poster" ||
          actualRole === "recruiter" ||
          actualRole === "poster";

        // 1. Trying to login as Employer, but account is Seeker
        if (activeRole === "poster" && !isPosterAccount) {
          toast.error(
            "Access Denied: This is a Job Seeker account. Please use the Seeker login.",
          );
          setLoading(false);
          resetCaptcha(); // Force user to re-verify
          return;
        }

        // 2. Trying to login as Seeker, but account is Employer
        if (activeRole === "seeker" && isPosterAccount) {
          toast.error(
            "Access Denied: This is an Employer account. Please use the Employer login.",
          );
          setLoading(false);
          resetCaptcha(); // Force user to re-verify
          return;
        }

        // --- LOGIN SUCCESS ---
        toast.success("Login Successful!");

        // Save to LocalStorage// Save to LocalStorage
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        // Also set individual items for other parts of the app
        const userData = res.data.user;
        if (userData) {
          localStorage.setItem("userRole", userData.role || actualRole);
          localStorage.setItem("userId", userData.id);

          // If the user object has these fields, set them too
          if (userData.email) localStorage.setItem("userEmail", userData.email);
          if (userData.name) localStorage.setItem("userName", userData.name);
        }

        console.log("User role set:", actualRole);
        console.log("User ID set:", userData?.id);

        // Redirect based on role
        setTimeout(() => {
          if (isPosterAccount) {
            navigate("/poster-dashboard");
          } else {
            navigate("/jobs");
          }
        }, 1000);
      }
    } catch (err) {
      console.error("Login Error:", err);

      // Check if employer account is not approved
      if (
        err.response?.status === 403 &&
        err.response?.data?.requiresApproval
      ) {
        toast.error(
          "Your employer account is awaiting admin approval. Please check back later or contact support.",
        );
      } else {
        const errorMsg =
          err.response?.data?.message || "Login Failed. Please try again.";
        toast.error(errorMsg);
      }

      // CRITICAL: Reset Captcha on error so user can try again immediately
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  // Reset form when switching tabs
  const switchRole = (role) => {
    setActiveRole(role);
    setFormData({ email: "", password: "" });
    resetCaptcha();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <ToastContainer position="top-center" autoClose={3000} />

      {/* Main Card Container */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] transition-all duration-500">
        {/* LEFT SIDE: JOB SEEKER */}
        <div
          className={`relative flex-1 flex flex-col justify-center p-8 transition-all duration-500 cursor-pointer ${
            activeRole === "seeker"
              ? "bg-white flex-[1.5]"
              : "bg-blue-600 text-white flex-1 hover:flex-[1.1]"
          }`}
          onClick={() => activeRole !== "seeker" && switchRole("seeker")}
        >
          {activeRole !== "seeker" && (
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          )}

          <div
            className={`max-w-md mx-auto w-full transition-all duration-500 ${activeRole !== "seeker" ? "text-center" : ""}`}
          >
            {/* Header Content */}
            <div className="mb-8">
              <div
                className={`inline-flex p-3 rounded-2xl mb-4 ${activeRole === "seeker" ? "bg-blue-100 text-blue-600" : "bg-white/20 text-white"}`}
              >
                <User className="w-8 h-8" />
              </div>
              <h2
                className={`text-3xl font-bold mb-2 ${activeRole === "seeker" ? "text-gray-800" : "text-white"}`}
              >
                Job Seeker
              </h2>
              <p
                className={`${activeRole === "seeker" ? "text-gray-500" : "text-blue-100"}`}
              >
                {activeRole === "seeker"
                  ? "Welcome back! Login to continue your search."
                  : "Click here to login as a Candidate"}
              </p>
            </div>

            {/* FORM (Only visible if active) */}
            {activeRole === "seeker" && (
              <LoginForm
                role="seeker"
                formData={formData}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                captchaRef={captchaRef}
                handleCaptchaChange={handleCaptchaChange}
                handleCaptchaExpired={handleCaptchaExpired}
                loading={loading}
                SITE_KEY={SITE_KEY}
              />
            )}

            {/* Inactive State Button */}
            {activeRole !== "seeker" && (
              <button className="mt-4 px-6 py-2 border-2 border-white text-white rounded-full font-semibold hover:bg-white hover:text-blue-600 transition-colors">
                Login as Seeker
              </button>
            )}
          </div>
        </div>

        {/* RIGHT SIDE: JOB POSTER */}
        <div
          className={`relative flex-1 flex flex-col justify-center p-8 transition-all duration-500 cursor-pointer ${
            activeRole === "poster"
              ? "bg-white flex-[1.5]"
              : "bg-slate-900 text-white flex-1 hover:flex-[1.1]"
          }`}
          onClick={() => activeRole !== "poster" && switchRole("poster")}
        >
          {activeRole !== "poster" && (
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          )}

          <div
            className={`max-w-md mx-auto w-full transition-all duration-500 ${activeRole !== "poster" ? "text-center" : ""}`}
          >
            <div className="mb-8">
              <div
                className={`inline-flex p-3 rounded-2xl mb-4 ${activeRole === "poster" ? "bg-indigo-100 text-indigo-600" : "bg-white/20 text-white"}`}
              >
                <Briefcase className="w-8 h-8" />
              </div>
              <h2
                className={`text-3xl font-bold mb-2 ${activeRole === "poster" ? "text-gray-800" : "text-white"}`}
              >
                Employer
              </h2>
              <p
                className={`${activeRole === "poster" ? "text-gray-500" : "text-slate-300"}`}
              >
                {activeRole === "poster"
                  ? "Login to manage your job postings and candidates."
                  : "Click here to login as an Employer"}
              </p>
            </div>

            {/* FORM (Only visible if active) */}
            {activeRole === "poster" && (
              <LoginForm
                role="poster"
                formData={formData}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                captchaRef={captchaRef}
                handleCaptchaChange={handleCaptchaChange}
                handleCaptchaExpired={handleCaptchaExpired}
                loading={loading}
                SITE_KEY={SITE_KEY}
              />
            )}

            {/* Inactive State Button */}
            {activeRole !== "poster" && (
              <button className="mt-4 px-6 py-2 border-2 border-white text-white rounded-full font-semibold hover:bg-white hover:text-slate-900 transition-colors">
                Login as Employer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Form Component
const LoginForm = ({
  role,
  formData,
  handleChange,
  handleSubmit,
  showPassword,
  setShowPassword,
  captchaRef,
  handleCaptchaChange,
  handleCaptchaExpired,
  loading,
  SITE_KEY,
}) => {
  const themeColor = role === "seeker" ? "blue" : "indigo";

  return (
    <form
      className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500"
      onSubmit={handleSubmit}
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 focus:border-transparent outline-none transition-all`}
            placeholder="name@example.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            value={formData.password}
            onChange={handleChange}
            className={`w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 focus:border-transparent outline-none transition-all`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        <div className="flex justify-end mt-1">
          <Link
            to="/forgot-password"
            className={`text-sm font-medium text-${themeColor}-600 hover:text-${themeColor}-500`}
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <div className="flex justify-center py-2">
        <ReCAPTCHA
          ref={captchaRef}
          sitekey={SITE_KEY}
          onChange={handleCaptchaChange}
          onExpired={handleCaptchaExpired}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full flex justify-center items-center py-3.5 px-4 rounded-xl font-bold text-white transition-all transform active:scale-[0.98] shadow-lg ${
          loading
            ? "bg-gray-400 cursor-not-allowed"
            : role === "seeker"
              ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
              : "bg-slate-900 hover:bg-slate-800 shadow-slate-200"
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
            Signing in...
          </>
        ) : (
          <span className="flex items-center">
            Sign In
            <ArrowRight className="ml-2 w-5 h-5" />
          </span>
        )}
      </button>

      <div className="text-center pt-2">
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className={`font-bold text-${themeColor}-600 hover:underline`}
          >
            Create one here
          </Link>
        </p>
      </div>
    </form>
  );
};

export default Login;
