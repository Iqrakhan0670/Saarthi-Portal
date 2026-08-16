import React, { useState } from "react";
import axios from "axios";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { getApiBaseUrl } from "../utils/apiConfig";

const API_BASE_URL = getApiBaseUrl();

const ResumeScorer = () => {
  const [file, setFile] = useState(null);
  const [jobDesc, setJobDesc] = useState("");
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(""); // Clear errors when new file selected
  };

  const handleAnalyze = async () => {
    if (!file || !jobDesc) {
      setError("Please upload a resume and enter a job description.");
      return;
    }

    setLoading(true);
    setError("");
    setScore(null);

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("job_description", jobDesc);

    try {
      // ✅ Use POST, not GET
      const res = await axios.post(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/resume-match`, formData);

      if (res.data.success) {
        setScore(res.data.match_percentage);
      }
    } catch (err) {
      console.error("Error:", err);
      console.error("Response:", err.response?.data);
      setError(err.response?.data?.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <FileText className="text-blue-600" /> AI Resume Scorer
        </h1>
        <p className="text-gray-500 mb-8">
          Test your Python Microservice integration
        </p>

        {/* 1. File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Resume (PDF)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center hover:bg-blue-50 transition-colors">
            <Upload className="text-gray-400 w-10 h-10 mb-2" />
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>

        {/* 2. Job Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Job Description
          </label>
          <textarea
            rows="4"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Paste the job description here (e.g. 'We are looking for a React developer...')"
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
          ></textarea>
        </div>

        {/* 3. Action Button */}
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className={`w-full py-4 rounded-lg font-bold text-white text-lg transition-all ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 shadow-md"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" /> Analyzing...
            </span>
          ) : (
            "Analyze Resume"
          )}
        </button>

        {/* 4. Results Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle /> {error}
          </div>
        )}

        {score !== null && (
          <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-xl text-center">
            <h2 className="text-gray-600 font-medium uppercase tracking-wide text-sm">
              Match Score
            </h2>
            <div className="text-6xl font-extrabold text-green-600 my-2">
              {score}%
            </div>
            <p className="text-green-800 flex items-center justify-center gap-1">
              <CheckCircle size={18} /> Analysis Complete
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeScorer;
