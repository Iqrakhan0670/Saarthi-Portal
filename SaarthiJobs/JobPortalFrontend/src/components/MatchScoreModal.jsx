import React, { useState } from "react";
import axios from "axios";
import { Upload, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { getApiBaseUrl } from "../utils/apiConfig";

const API_BASE_URL = getApiBaseUrl();

const MatchScoreModal = ({ jobDescription, onClose }) => {
  const [file, setFile] = useState(null);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!file) return setError("Please upload your resume");

    setLoading(true);
    const formData = new FormData();
    formData.append("resume", file);
    formData.append("job_description", jobDescription);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/ai/score`,
        formData,
        {},
      );
      if (res.data.success) {
        setScore(res.data.match_percentage);
      }
    } catch (err) {
      setError("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Check Your Fit
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          See how well your resume matches this job.
        </p>

        {score !== null ? (
          <div className="text-center py-6">
            <div className="text-5xl font-extrabold text-blue-600 mb-2">
              {score}%
            </div>
            <p className="text-gray-600 font-medium">Match Score</p>
            <button
              onClick={onClose}
              className="mt-6 w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center hover:bg-blue-50 transition-colors">
              <Upload className="text-blue-500 w-10 h-10 mb-2" />
              <label className="cursor-pointer">
                <span className="text-blue-600 font-semibold hover:underline">
                  Upload Resume (PDF)
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </label>
              {file && (
                <p className="mt-2 text-sm text-gray-600 font-medium">
                  {file.name}
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading || !file}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={20} />}
              {loading ? "Analyzing..." : "Calculate Score"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MatchScoreModal;
