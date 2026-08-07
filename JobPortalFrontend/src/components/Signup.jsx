"use client";

import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ReCAPTCHA from "react-google-recaptcha";
import {
  User,
  Mail,
  Lock,
  Phone,
  Briefcase,
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { getRecaptchaSiteKey } from "../utils/recaptchaConfig";

// Use relative path for localhost/development (Vite Proxy handles it), full URL for production
const isDevelopment =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  import.meta.env.DEV;

const API_BASE_URL = isDevelopment ? "" : import.meta.env.VITE_API_URL || "";
const SITE_KEY = getRecaptchaSiteKey(); // Dynamically select key based on domain

const Signup = () => {
  const navigate = useNavigate();
  const captchaRef = useRef(null);

  const [activeRole, setActiveRole] = useState("seeker");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    mobile_number: "",
    work_status: "", // Only for seekers
    company_name: "", // Add this line for posters
  });

  const [otp, setOtp] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);

  // Handlers
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
  };

  const switchRole = (role) => {
    setActiveRole(role);
    setStep(1);
    setFormData({
      full_name: "",
      email: "",
      password: "",
      mobile_number: "",
      work_status: "",
      company_name: "", // Add this line
    });
    setCaptchaToken(null);
    setOtp("");
    if (captchaRef.current) captchaRef.current.reset();
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();

    // Validate all required fields
    if (
      !formData.full_name ||
      !formData.email ||
      !formData.password ||
      !formData.mobile_number
    ) {
      return toast.error("Please fill in all fields");
    }

    // Validate password strength
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      return toast.error(
        "Password must be at least 8 characters with uppercase, lowercase, and number",
      );
    }

    // Validate mobile number (Indian 10-digit)
    const mobileRegex = /^(?:\+91)?[6-9]\d{9}$/;
    if (!mobileRegex.test(formData.mobile_number.replace(/\s+/g, ""))) {
      return toast.error("Please enter a valid 10-digit Indian mobile number");
    }

    if (activeRole === "seeker" && !formData.work_status) {
      return toast.error("Please select your work status");
    }

    if (activeRole === "poster" && !formData.company_name) {
      return toast.error("Please enter company name");
    }

    if (!captchaToken) return toast.error("Please verify you are not a robot");

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/signup/send-otp`, {
        email: formData.email,
        captchaToken,
      });

      if (res.data.success) {
        toast.success("OTP sent to your email!");
        setStep(2);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to send OTP");
      setCaptchaToken(null);
      if (captchaRef.current) captchaRef.current.reset();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error("Please enter the OTP");

    setLoading(true);
    try {
      const requestData = {
        fullName: formData.full_name,
        email: formData.email,
        password: formData.password,
        mobileNumber: formData.mobile_number,
        userType: activeRole === "seeker" ? "job_seeker" : "job_poster",
        otp: otp.trim(),
        sendUpdates: false,
      };

      // Add workStatus only for seekers
      if (activeRole === "seeker" && formData.work_status) {
        requestData.workStatus = formData.work_status;
      }

      // Add companyName for posters
      if (activeRole === "poster" && formData.company_name) {
        requestData.companyName = formData.company_name;
      }

      console.log("Sending to backend:", requestData);

      const res = await axios.post(
        `${API_BASE_URL}/api/signup/verify`,
        requestData,
      );

      if (res.data.success) {
        // Show different message for employers vs job seekers
        if (res.data.requiresApproval) {
          toast.info(
            "Account created! Your employer account is awaiting admin approval. Please check your email for updates.",
            { autoClose: 5000 },
          );
        } else {
          toast.success("Account Created Successfully!");
        }

        setTimeout(
          () => {
            navigate("/login");
          },
          res.data.requiresApproval ? 3000 : 1500,
        );
      }
    } catch (err) {
      console.error("Error:", err.response?.data || err.message);

      // Handle validation errors (object with field-specific errors)
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        // Show the first error message
        const firstError = Object.values(errors)[0];
        toast.error(firstError);
      } else {
        // Handle other error types
        toast.error(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Invalid OTP. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
      <ToastContainer position="top-center" autoClose={3000} />

      {/* Main Card Container - Taller than login to fit extra fields */}
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[750px] transition-all duration-500">
        {/* --- LEFT SIDE: JOB SEEKER --- */}
        <div
          className={`relative flex-1 flex flex-col justify-center p-6 lg:p-10 transition-all duration-500 cursor-pointer overflow-hidden ${
            activeRole === "seeker"
              ? "bg-white flex-[1.5]"
              : "bg-blue-600 text-white flex-1 hover:flex-[1.1]"
          }`}
          onClick={() => activeRole !== "seeker" && switchRole("seeker")}
        >
          {/* Background Pattern for Inactive State */}
          {activeRole !== "seeker" && (
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          )}

          <div
            className={`max-w-md mx-auto w-full transition-all duration-500 ${activeRole !== "seeker" ? "text-center" : ""}`}
          >
            {/* Header */}
            <div className="mb-6">
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
                  ? step === 1
                    ? "Create an account to find your dream job."
                    : "Enter the OTP sent to your email."
                  : "Click here to register as a Candidate"}
              </p>
            </div>

            {/* FORM */}
            {activeRole === "seeker" && (
              <SignupForm
                role="seeker"
                step={step}
                formData={formData}
                handleChange={handleChange}
                handleSendOtp={handleSendOtp}
                handleVerifyOtp={handleVerifyOtp}
                otp={otp}
                setOtp={setOtp}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                captchaRef={captchaRef}
                handleCaptchaChange={handleCaptchaChange}
                loading={loading}
                SITE_KEY={SITE_KEY}
              />
            )}

            {/* Inactive Button */}
            {activeRole !== "seeker" && (
              <button className="mt-4 px-6 py-2 border-2 border-white text-white rounded-full font-semibold hover:bg-white hover:text-blue-600 transition-colors">
                Register as Seeker
              </button>
            )}
          </div>
        </div>

        {/* --- RIGHT SIDE: JOB POSTER --- */}
        <div
          className={`relative flex-1 flex flex-col justify-center p-6 lg:p-10 transition-all duration-500 cursor-pointer overflow-hidden ${
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
            <div className="mb-6">
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
                  ? step === 1
                    ? "Create an account to hire top talent."
                    : "Enter the OTP sent to your email."
                  : "Click here to register as an Employer"}
              </p>
            </div>

            {/* FORM */}
            {activeRole === "poster" && (
              <SignupForm
                role="poster"
                step={step}
                formData={formData}
                handleChange={handleChange}
                handleSendOtp={handleSendOtp}
                handleVerifyOtp={handleVerifyOtp}
                otp={otp}
                setOtp={setOtp}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                captchaRef={captchaRef}
                handleCaptchaChange={handleCaptchaChange}
                loading={loading}
                SITE_KEY={SITE_KEY}
              />
            )}

            {/* Inactive Button */}
            {activeRole !== "poster" && (
              <button className="mt-4 px-6 py-2 border-2 border-white text-white rounded-full font-semibold hover:bg-white hover:text-slate-900 transition-colors">
                Register as Employer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- REUSABLE FORM COMPONENT ---
const SignupForm = ({
  role,
  step,
  formData,
  handleChange,
  handleSendOtp,
  handleVerifyOtp,
  otp,
  setOtp,
  showPassword,
  setShowPassword,
  captchaRef,
  handleCaptchaChange,
  loading,
  SITE_KEY,
}) => {
  const themeColor = role === "seeker" ? "blue" : "indigo";

  // STEP 2: OTP FORM
  if (step === 2) {
    return (
      <form
        className="space-y-6 animate-in fade-in zoom-in duration-300"
        onSubmit={handleVerifyOtp}
      >
        <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-green-700 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
          <p className="text-sm">
            We've sent a verification code to <strong>{formData.email}</strong>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Enter OTP
          </label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 outline-none text-center text-2xl tracking-widest font-mono`}
            placeholder="123456"
            maxLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3.5 rounded-xl font-bold text-white transition-all shadow-lg ${
            loading
              ? "bg-gray-400"
              : role === "seeker"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-slate-900 hover:bg-slate-800"
          }`}
        >
          {loading ? "Verifying..." : "Verify & Create Account"}
        </button>
      </form>
    );
  }

  // STEP 1: REGISTRATION FORM
  return (
    <form
      className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
      onSubmit={handleSendOtp}
    >
      {/* Full Name */}
      <div>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            name="full_name"
            required
            value={formData.full_name}
            onChange={handleChange}
            className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 outline-none`}
            placeholder="Full Name"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 outline-none`}
            placeholder="Email Address"
          />
        </div>
      </div>

      {/* Mobile */}
      <div>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            name="mobile_number"
            type="tel"
            required
            value={formData.mobile_number}
            onChange={handleChange}
            className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 outline-none`}
            placeholder="Mobile Number"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            value={formData.password}
            onChange={handleChange}
            className={`w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 outline-none`}
            placeholder="Create Password"
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
      </div>

      {/* Work Status (Seeker Only) */}
      {role === "seeker" && (
        <div>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              name="work_status"
              value={formData.work_status}
              onChange={handleChange}
              className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 outline-none text-gray-600 appearance-none`}
            >
              <option value="">Select Work Status</option>
              <option value="fresher">I am a Fresher</option>
              <option value="experienced">I am Experienced</option>
            </select>
          </div>
        </div>
      )}

      {/* Company Name (Poster Only) */}
      {role === "poster" && (
        <div>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              name="company_name"
              type="text"
              required
              value={formData.company_name || ""}
              onChange={handleChange}
              className={`w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 outline-none`}
              placeholder="Company Name (As per Agreement)"
            />
          </div>
        </div>
      )}

      {/* Captcha */}
      <div className="flex justify-center pt-2">
        <ReCAPTCHA
          ref={captchaRef}
          sitekey={SITE_KEY}
          onChange={handleCaptchaChange}
        />
      </div>

      {/* Submit Button */}
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
            Sending OTP...
          </>
        ) : (
          <span className="flex items-center">
            Continue
            <ArrowRight className="ml-2 w-5 h-5" />
          </span>
        )}
      </button>

      {/* Footer Link */}
      <div className="text-center pt-1">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className={`font-bold text-${themeColor}-600 hover:underline`}
          >
            Login here
          </Link>
        </p>
      </div>
    </form>
  );
};

export default Signup;
