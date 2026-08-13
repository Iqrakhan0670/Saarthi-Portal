"use client";

import { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  Clock,
  Building2,
  Bookmark,
  Filter,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles, // 1. Imported Sparkles icon
} from "lucide-react";
import {
  getUserIdFromToken,
  getUserSpecificData,
  setUserSpecificData,
} from "../utils/tokenUtils";
import MatchScoreModal from "../components/MatchScoreModal";
import { getApiBaseUrl } from "../utils/apiConfig";

// API Configuration
const API_BASE_URL = getApiBaseUrl();

const Jobs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);

  // 3. New State for AI Scorer
  const [selectedJobForScan, setSelectedJobForScan] = useState(null);

  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationData, setApplicationData] = useState({
    name: "",
    email: "",
    mobile: "",
    city: "",
    state: "",
    cv: null,
    experience: "",
  });
  const [showPreview, setShowPreview] = useState(false);
  const [savedJobs, setSavedJobs] = useState(new Set());
  const [filters, setFilters] = useState({
    workMode: [],
    department: [],
    salary: "",
    roleCategory: "",
    company: "",
    location: "",
    experience: "",
    jobType: [],
    datePosted: "",
  });
  const [expandedFilters, setExpandedFilters] = useState({
    workMode: true,
    department: true,
    salary: true,
    roleCategory: true,
    company: true,
    location: true,
    experience: true,
    jobType: true,
    datePosted: true,
  });
  const [jobs, setJobs] = useState([]);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [prefillError, setPrefillError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDuplicateError, setShowDuplicateError] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [userSkills, setUserSkills] = useState([]);
  const [userEducation, setUserEducation] = useState([]);
  const [userEmployments, setUserEmployments] = useState([]);
  const [userInternships, setUserInternships] = useState([]);

  useEffect(() => {
    // Load saved jobs for current user
    const savedJobIds = getUserSpecificData("savedJobs", []);
    setSavedJobs(new Set(savedJobIds));
  }, []);

  // Fetch user profile data for personalization
  useEffect(() => {
    const fetchUserProfileData = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          localStorage.getItem("authToken") ||
          localStorage.getItem("jwt") ||
          localStorage.getItem("accessToken");

        if (!token) return;

        const headers = { Authorization: `Bearer ${token}` };

        // Fetch basic profile
        const profileRes = await fetch(`${API_BASE_URL}/api/userprofile`, {
          headers,
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setUserProfile(profile);
        }

        // Fetch skills
        const skillsRes = await fetch(`${API_BASE_URL}/api/userskills`, {
          headers,
        });
        if (skillsRes.ok) {
          const skills = await skillsRes.json();
          setUserSkills(
            skills.map((s) => s.skill_name || s.name).filter(Boolean),
          );
        }

        // Fetch education
        const educationRes = await fetch(`${API_BASE_URL}/api/usereducations`, {
          headers,
        });
        if (educationRes.ok) {
          const education = await educationRes.json();
          setUserEducation(education);
        }

        // Fetch employment
        const employmentRes = await fetch(
          `${API_BASE_URL}/api/useremployments`,
          { headers },
        );
        if (employmentRes.ok) {
          const employment = await employmentRes.json();
          setUserEmployments(employment);
        }

        // Fetch internships
        const internshipRes = await fetch(
          `${API_BASE_URL}/api/userinternships`,
          { headers },
        );
        if (internshipRes.ok) {
          const internships = await internshipRes.json();
          setUserInternships(internships);
        }
      } catch (error) {
        console.error("Error fetching user profile data:", error);
      }
    };

    fetchUserProfileData();
  }, []);

  // Real-time listener for saved jobs updates from other components
  useEffect(() => {
    const handleSavedJobsUpdate = () => {
      const updatedSavedJobIds = getUserSpecificData("savedJobs", []);
      setSavedJobs(new Set(updatedSavedJobIds));
    };

    window.addEventListener("savedJobsUpdated", handleSavedJobsUpdate);

    return () => {
      window.removeEventListener("savedJobsUpdated", handleSavedJobsUpdate);
    };
  }, []);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/jobs/browse/all`);
        if (!response.ok) {
          throw new Error("Failed to fetch jobs");
        }
        const data = await response.json();
        const normalizedJobs = data.map((job) => ({
          ...job,
          job_description: job.job_description || job.description || "",
          job_type: Array.isArray(job.job_type)
            ? job.job_type
            : job.job_type
              ? [job.job_type]
              : [],
        }));
        setJobs(normalizedJobs);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      }
    };
    fetchJobs();
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  const filterOptions = {
    salary: ["0-3 lakh", "3-6 lakh", "6-10 lakh", "10-15 lakh", "15+ lakh"],
    jobType: [
      "Full-time",
      "Part-time",
      "Contract",
      "Fresher",
      "Internship",
      "Freelance",
    ],
    datePosted: ["Last 24 hours", "Last 3 days", "Last week", "Last month"],
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => {
      if (Array.isArray(prev[filterType])) {
        const newArray = prev[filterType].includes(value)
          ? prev[filterType].filter((item) => item !== value)
          : [...prev[filterType], value];
        return { ...prev, [filterType]: newArray };
      } else {
        return { ...prev, [filterType]: value };
      }
    });
  };

  const toggleSaveJob = (jobId) => {
    setSavedJobs((prev) => {
      const newSet = new Set(prev);
      const job = jobs.find((j) => j.id === jobId);

      if (newSet.has(jobId)) {
        newSet.delete(jobId);
        const savedJobsData = getUserSpecificData("savedJobsData", []);
        const updatedJobsData = savedJobsData.filter((j) => j.id !== jobId);
        setUserSpecificData("savedJobsData", updatedJobsData);
      } else {
        newSet.add(jobId);
        const savedJobsData = getUserSpecificData("savedJobsData", []);
        if (job && !savedJobsData.find((j) => j.id === jobId)) {
          savedJobsData.push(job);
          setUserSpecificData("savedJobsData", savedJobsData);
        }
      }

      setUserSpecificData("savedJobs", [...newSet]);
      window.dispatchEvent(
        new CustomEvent("savedJobsUpdated", {
          detail: { jobId, saved: newSet.has(jobId) },
        }),
      );

      return newSet;
    });
  };

  const toggleFilterExpansion = (filterType) => {
    setExpandedFilters((prev) => ({
      ...prev,
      [filterType]: !prev[filterType],
    }));
  };

  const calculateJobRelevanceScore = (job) => {
    let score = 0;
    if (userEmployments.length > 0) {
      const lastEmployment = userEmployments[0];
      if (lastEmployment.position && job.job_title) {
        const positionMatch =
          job.job_title
            .toLowerCase()
            .includes(lastEmployment.position.toLowerCase()) ||
          lastEmployment.position
            .toLowerCase()
            .includes(job.job_title.toLowerCase());
        if (positionMatch) score += 100;
      }
      if (lastEmployment.company_name && job.company_name) {
        if (
          lastEmployment.company_name.toLowerCase() ===
          job.company_name.toLowerCase()
        ) {
          score += 50;
        }
      }
    }

    userEducation.forEach((edu) => {
      if (edu.field_of_study && job.education) {
        if (
          job.education
            .toLowerCase()
            .includes(edu.field_of_study.toLowerCase()) ||
          edu.field_of_study.toLowerCase().includes(job.education.toLowerCase())
        ) {
          score += 60;
        }
      }
      if (edu.degree && job.education) {
        if (job.education.toLowerCase().includes(edu.degree.toLowerCase())) {
          score += 40;
        }
      }
    });

    userInternships.forEach((internship) => {
      if (internship.position && job.job_title) {
        if (
          job.job_title
            .toLowerCase()
            .includes(internship.position.toLowerCase())
        ) {
          score += 50;
        }
      }
    });

    if (userSkills.length > 0 && job.skills) {
      const jobSkillsList = job.skills
        .split(",")
        .map((s) => s.trim().toLowerCase());
      const matchingSkills = userSkills.filter((skill) =>
        jobSkillsList.some(
          (jobSkill) =>
            jobSkill.includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(jobSkill),
        ),
      );
      score += matchingSkills.length * 30;
    }

    return score;
  };

  const handleApply = async (_jobId) => {
    setIsPrefilling(true);
    setPrefillError("");
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt") ||
        "";

      const res = await fetch(`${API_BASE_URL}/api/userprofile`, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const profile = await res.json();
        const firstName = profile?.first_name || "";
        const lastName = profile?.last_name || "";
        const fullName =
          firstName || lastName
            ? [firstName, lastName].filter(Boolean).join(" ")
            : profile?.name || "";

        setApplicationData({
          name: fullName,
          email: profile?.email || "",
          mobile: profile?.phone || profile?.mobile || "",
          city: profile?.city || "",
          state: profile?.state || "",
          cv: null,
          experience: profile?.profile_summary || profile?.experience || "",
        });
      } else {
        const body = await res.text().catch(() => "");
        if (res.status === 401 || res.status === 403) {
          setPrefillError(
            "Sign in required to prefill your application. You can still edit fields manually.",
          );
        } else {
          setPrefillError(
            "Could not prefill from your profile. You can continue by entering details manually.",
          );
        }
        setApplicationData((prev) => ({
          ...prev,
          name: "",
          email: "",
          mobile: "",
          city: "",
          state: "",
          experience: "",
          cv: null,
        }));
      }
    } catch (err) {
      setPrefillError(
        "Network error while fetching your profile. Please fill the form manually.",
      );
    } finally {
      setIsPrefilling(false);
      setShowApplicationForm(true);
    }
  };

  const handleApplicationChange = (field, value) => {
    setApplicationData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    setApplicationData((prev) => ({ ...prev, cv: file }));
  };

  const handleSubmitApplication = async () => {
    if (!selectedJob?.id) {
      setSubmitError("No job selected.");
      return;
    }
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt") ||
        "";

      const fd = new FormData();
      fd.append("applicant_name", (applicationData.name || "").trim());
      fd.append("applicant_email", (applicationData.email || "").trim());
      fd.append("applicant_mobile", (applicationData.mobile || "").trim());
      fd.append("city", (applicationData.city || "").trim());
      fd.append("state", (applicationData.state || "").trim());
      fd.append("experience", applicationData.experience || "");
      fd.append("job_id", String(selectedJob.id));
      if (applicationData.cv) {
        fd.append("cv", applicationData.cv);
      }

      const res = await fetch(`${API_BASE_URL}/api/applications`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
      });

      if (res.ok) {
        setShowSuccess(true);
        setShowApplicationForm(false);
        setShowPreview(false);
        setSelectedJob(null);
        setApplicationData({
          name: "",
          email: "",
          mobile: "",
          city: "",
          state: "",
          cv: null,
          experience: "",
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.error === "You have already applied for this job") {
          setShowDuplicateError(true);
          setShowApplicationForm(false);
          setShowPreview(false);
          setSelectedJob(null);
          setApplicationData({
            name: "",
            email: "",
            mobile: "",
            city: "",
            state: "",
            cv: null,
            experience: "",
          });
        } else {
          setSubmitError(
            errorData.error ||
              "There was a problem submitting your application.",
          );
        }
      }
    } catch (err) {
      setSubmitError(
        (err && err.message) ||
          "There was a problem submitting your application.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const FilterSection = ({ title, type, options, isArray = true }) => (
    <div className="border-b border-gray-200 pb-4">
      <button
        onClick={() => toggleFilterExpansion(type)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {expandedFilters[type] ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {expandedFilters[type] && (
        <div className="mt-3 space-y-2">
          {isArray ? (
            options.map((option) => (
              <label
                key={option}
                className="flex items-center space-x-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={filters[type].includes(option)}
                  onChange={() => handleFilterChange(type, option)}
                  className="rounded border-gray-300 text-blue-800 focus:ring-blue-500"
                />
                <span className="text-gray-600">{option}</span>
              </label>
            ))
          ) : (
            <select
              value={filters[type]}
              onChange={(e) => handleFilterChange(type, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">Select {title}</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );

  const JobCard = ({ job }) => {
    const getRelevanceBadge = () => {
      if (job.relevanceScore === 0) return null;
      let color = "bg-gray-100 text-gray-700";
      let label = "";

      if (job.relevanceScore >= 100) {
        color = "bg-green-100 text-green-700";
        label = "⭐ Highly Recommended";
      } else if (job.relevanceScore >= 60) {
        color = "bg-blue-100 text-blue-700";
        label = "✓ Matches Your Profile";
      } else if (job.relevanceScore > 0) {
        color = "bg-yellow-100 text-yellow-700";
        label = "→ Relevant";
      }
      return { color, label };
    };

    const badge = getRelevanceBadge();

    return (
      <div
        className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer relative group"
        onClick={() => setSelectedJob(job)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4 flex-1">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-2xl">
              {job.logo || "💼"}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-700 mb-1 text-left">
                {job.job_title || "N/A"}
              </h3>
              <div className="flex items-center space-x-2 text-gray-600 mb-2">
                <Building2 className="w-4 h-4" />
                <span className="text-sm">{job.company_name || "N/A"}</span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{job.job_location || "N/A"}</span>
                </div>
                <div className="flex space-x-1">
                  {job.job_type.slice(0, 2).map((type, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
                    >
                      {type}
                    </span>
                  ))}
                  {job.job_type.length > 2 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                      +{job.job_type.length - 2}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>
                  Posted{" "}
                  {job.created_at
                    ? new Date(job.created_at).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
              {badge && (
                <div
                  className={`mt-3 inline-block px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}
                >
                  {badge.label}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSaveJob(job.id);
              }}
              className={`p-2 rounded-lg transition-colors ${
                savedJobs.has(job.id)
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              <Bookmark
                className={`w-5 h-5 ${savedJobs.has(job.id) ? "fill-current" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* 4. AI Match Button on Job Card */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedJobForScan(job);
            }}
            className="text-sm flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
          >
            <Sparkles size={16} /> Check Match Score
          </button>
        </div>
      </div>
    );
  };

  const filteredJobs = jobs
    .filter((job) => {
      const matchesSearch =
        !searchTerm ||
        job.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.job_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.skills?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSalary =
        !filters.salary ||
        (job.pay_min &&
          job.pay_max &&
          filters.salary.split("-").reduce((acc, val) => {
            const [min, max] = val.split(" lakh").map(Number);
            return (
              acc ||
              (job.pay_min >= min * 100000 &&
                (max ? job.pay_max <= max * 100000 : true))
            );
          }, false));

      const matchesRoleCategory =
        !filters.roleCategory ||
        job.job_title
          ?.toLowerCase()
          .includes(filters.roleCategory.toLowerCase());
      const matchesCompany =
        !filters.company ||
        job.company_name?.toLowerCase().includes(filters.company.toLowerCase());
      const matchesLocation =
        !filters.location ||
        job.job_location
          ?.toLowerCase()
          .includes(filters.location.toLowerCase());
      const matchesJobType =
        filters.jobType.length === 0 ||
        filters.jobType.some((type) => job.job_type.includes(type));
      const matchesDatePosted =
        !filters.datePosted ||
        {
          "Last 24 hours": () =>
            new Date(job.created_at) >
            new Date(Date.now() - 24 * 60 * 60 * 1000),
          "Last 3 days": () =>
            new Date(job.created_at) >
            new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          "Last week": () =>
            new Date(job.created_at) >
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          "Last month": () =>
            new Date(job.created_at) >
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        }[filters.datePosted]();

      return (
        matchesSearch &&
        matchesSalary &&
        matchesRoleCategory &&
        matchesCompany &&
        matchesLocation &&
        matchesJobType &&
        matchesDatePosted
      );
    })
    .map((job) => ({
      ...job,
      relevanceScore: calculateJobRelevanceScore(job),
    }))
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

  return (
    <div className="bg-white min-h-screen">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white py-12">
        <div className="w-full px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-700 mb-4 text-center">
              Find Your Perfect <span className="text-blue-800">Job</span>
            </h1>
            <p className="text-lg text-gray-600 text-center mb-8">
              Discover thousands of opportunities from top companies
            </p>
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                <input
                  placeholder="Search jobs, companies, or skills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="w-full px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-8">
              {/* Filters Sidebar */}
              <div className="w-80 flex-shrink-0">
                <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
                  <div className="flex items-center space-x-2 mb-6">
                    <Filter className="w-5 h-4 text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-700">
                      Filters
                    </h2>
                  </div>
                  <div className="space-y-6">
                    <FilterSection
                      title="Salary"
                      type="salary"
                      options={filterOptions.salary}
                      isArray={false}
                    />
                    <div className="border-b border-gray-200 pb-4">
                      <button
                        onClick={() => toggleFilterExpansion("roleCategory")}
                        className="flex items-center justify-between w-full text-left"
                      >
                        <h3 className="text-sm font-semibold text-gray-700">
                          Role Category
                        </h3>
                        {expandedFilters.roleCategory ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                      {expandedFilters.roleCategory && (
                        <div className="mt-3">
                          <input
                            type="text"
                            placeholder="Enter role category"
                            value={filters.roleCategory}
                            onChange={(e) =>
                              handleFilterChange("roleCategory", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>
                      )}
                    </div>
                    <div className="border-b border-gray-200 pb-4">
                      <button
                        onClick={() => toggleFilterExpansion("company")}
                        className="flex items-center justify-between w-full text-left"
                      >
                        <h3 className="text-sm font-semibold text-gray-700">
                          Company
                        </h3>
                        {expandedFilters.company ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                      {expandedFilters.company && (
                        <div className="mt-3">
                          <input
                            type="text"
                            placeholder="Enter company name"
                            value={filters.company}
                            onChange={(e) =>
                              handleFilterChange("company", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>
                      )}
                    </div>
                    <div className="border-b border-gray-200 pb-4">
                      <button
                        onClick={() => toggleFilterExpansion("location")}
                        className="flex items-center justify-between w-full text-left"
                      >
                        <h3 className="text-sm font-semibold text-gray-700">
                          Location
                        </h3>
                        {expandedFilters.location ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                      {expandedFilters.location && (
                        <div className="mt-3">
                          <input
                            type="text"
                            placeholder="Enter location"
                            value={filters.location}
                            onChange={(e) =>
                              handleFilterChange("location", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>
                      )}
                    </div>
                    <FilterSection
                      title="Job Type"
                      type="jobType"
                      options={filterOptions.jobType}
                    />
                    <FilterSection
                      title="Date Posted"
                      type="datePosted"
                      options={filterOptions.datePosted}
                      isArray={false}
                    />
                  </div>
                </div>
              </div>

              {/* Jobs List */}
              <div className="flex-1">
                <div className="space-y-4">
                  {filteredJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedJob(null);
            }}
          />
          <div
            className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            style={{ zIndex: 51 }}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-700">Job Details</h2>
              <div className="flex items-center space-x-4">
                {/* 5. AI Match Button in Job Details */}
                <button
                  onClick={() => setSelectedJobForScan(selectedJob)}
                  className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Check Match Score</span>
                </button>

                <button
                  onClick={() => handleApply(selectedJob.id)}
                  disabled={isPrefilling}
                  className={`px-6 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors flex items-center space-x-2 ${isPrefilling ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{isPrefilling ? "Preparing..." : "Apply"}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedJob(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                  style={{ zIndex: 52 }}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start space-x-4 mb-6">
                <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center text-3xl">
                  {selectedJob.logo || "💼"}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-gray-700 mb-2 text-left">
                    {selectedJob.job_title || "N/A"}
                  </h3>
                  <div className="flex items-center space-x-4 text-gray-600 mb-2">
                    <div className="flex items-center space-x-1">
                      <Building2 className="w-4 h-4" />
                      <span>{selectedJob.company_name || "N/A"}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedJob.job_location || "N/A"}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      {selectedJob.job_type.map((type, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                      {selectedJob.work_experience || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-3 text-left">
                    Skills
                  </h4>
                  <div className="flex flex-wrap gap-2 justify-start">
                    {selectedJob.skills ? (
                      selectedJob.skills.split(",").map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          {skill.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-600">N/A</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-3 text-left">
                    Education
                  </h4>
                  <p className="text-gray-600 text-sm text-left">
                    {selectedJob.education || "N/A"}
                  </p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-3 text-left">
                    Languages
                  </h4>
                  <div className="space-y-1 text-left">
                    {selectedJob.languages ? (
                      selectedJob.languages
                        .split(",")
                        .map((language, index) => (
                          <p
                            key={index}
                            className="text-gray-600 text-sm text-left"
                          >
                            {language.trim()}
                          </p>
                        ))
                    ) : (
                      <p className="text-gray-600">N/A</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-3 text-left">
                    Pay
                  </h4>
                  <div className="flex items-center space-x-2 justify-start">
                    <span className="w-4 h-4 text-green-600 font-medium">
                      ₹
                    </span>
                    <span className="text-gray-700 font-medium">
                      {selectedJob.pay_min && selectedJob.pay_max
                        ? `${selectedJob.pay_min} - ${selectedJob.pay_max}`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-700 mb-3 text-left">
                  Description
                </h4>
                <p className="text-gray-600 leading-relaxed text-left">
                  {selectedJob.job_description || "N/A"}
                </p>
              </div>
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-700 mb-3 text-left">
                  Responsibilities
                </h4>
                <ul className="space-y-2 text-left">
                  {selectedJob.responsibilities ? (
                    selectedJob.responsibilities
                      .split(",")
                      .map((responsibility, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="w-1.5 h-1.5 bg-blue-800 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-gray-600 text-sm text-left">
                            {responsibility.trim()}
                          </span>
                        </li>
                      ))
                  ) : (
                    <li className="text-gray-600">N/A</li>
                  )}
                </ul>
              </div>
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-700 mb-3 text-left">
                  Benefits
                </h4>
                <ul className="space-y-2 text-left">
                  {selectedJob.benefits ? (
                    selectedJob.benefits.split(",").map((benefit, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-gray-600 text-sm text-left">
                          {benefit.trim()}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-600">N/A</li>
                  )}
                </ul>
              </div>
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-700 mb-3 text-left">
                  About Company
                </h4>
                <p className="text-gray-600 leading-relaxed text-left">
                  {selectedJob.about_company || "N/A"}
                </p>
              </div>
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-700 mb-3 text-left">
                  Company Info
                </h4>
                <p className="text-gray-600 leading-relaxed text-left">
                  {selectedJob.company_info || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Application Form Modal */}
      {showApplicationForm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowApplicationForm(false);
            }}
          />
          <div
            className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            style={{ zIndex: 61 }}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-700">
                Apply for {selectedJob?.job_title || "N/A"}
              </h2>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowApplicationForm(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                style={{ zIndex: 62 }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              {!showPreview ? (
                <div className="space-y-6">
                  {prefillError && (
                    <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                      {prefillError}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={applicationData.name}
                          onChange={(e) =>
                            handleApplicationChange("name", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={applicationData.email}
                          onChange={(e) =>
                            handleApplicationChange("email", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your email address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          value={applicationData.mobile}
                          onChange={(e) =>
                            handleApplicationChange("mobile", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your mobile number"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      Location Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          value={applicationData.city}
                          onChange={(e) =>
                            handleApplicationChange("city", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your city"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State *
                        </label>
                        <input
                          type="text"
                          value={applicationData.state}
                          onChange={(e) =>
                            handleApplicationChange("state", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your state"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      Upload CV
                    </h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="cv-upload"
                      />
                      <label htmlFor="cv-upload" className="cursor-pointer">
                        <div className="text-gray-600">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                          >
                            <path
                              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <p className="mt-2 text-sm">
                            <span className="font-medium text-blue-600 hover:text-blue-500">
                              Click to upload
                            </span>{" "}
                            or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">
                            PDF, DOC, DOCX up to 10MB
                          </p>
                        </div>
                      </label>
                      {applicationData.cv && (
                        <p className="mt-2 text-sm text-green-600">
                          Selected: {applicationData.cv.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      Job Relevant Experience
                    </h3>
                    <textarea
                      value={applicationData.experience}
                      onChange={(e) =>
                        handleApplicationChange("experience", e.target.value)
                      }
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe your relevant experience for this position..."
                    />
                  </div>
                  <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowApplicationForm(false);
                      }}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setShowPreview(true)}
                      className="px-6 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                    >
                      Review Application
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">
                    Review Your Application
                  </h3>
                  {submitError && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                      {submitError}
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-700">Name</h4>
                        <p className="text-gray-600">{applicationData.name}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700">Email</h4>
                        <p className="text-gray-600">{applicationData.email}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700">Mobile</h4>
                        <p className="text-gray-600">
                          {applicationData.mobile}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700">Location</h4>
                        <p className="text-gray-600">
                          {applicationData.city}, {applicationData.state}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700">CV</h4>
                        <p className="text-gray-600">
                          {applicationData.cv?.name || "No file selected"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">
                        Experience
                      </h4>
                      <p className="text-gray-600 whitespace-pre-wrap">
                        {applicationData.experience}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPreview(false);
                      }}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      disabled={isSubmitting}
                    >
                      Back to Edit
                    </button>
                    <button
                      onClick={handleSubmitApplication}
                      disabled={isSubmitting}
                      className={`px-6 py-2 bg-green-600 text-white rounded-lg transition-colors ${isSubmitting ? "opacity-60 cursor-not-allowed" : "hover:bg-green-700"}`}
                    >
                      {isSubmitting ? "Submitting..." : "Submit Application"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowSuccess(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-green-700 mb-2">
              Success!
            </h3>
            <p className="text-gray-600 mb-4">
              Your application has been submitted successfully.
            </p>
            <button
              onClick={() => setShowSuccess(false)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showDuplicateError && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowDuplicateError(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Already Applied!
            </h3>
            <p className="text-gray-600 mb-4">
              You have already applied for this job.
            </p>
            <button
              onClick={() => setShowDuplicateError(false)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 6. AI Match Score Modal - Renders when a job is selected for scanning */}
      {selectedJobForScan && (
        <MatchScoreModal
          jobDescription={
            selectedJobForScan?.job_description ??
            selectedJobForScan?.description ??
            ""
          }
          onClose={() => setSelectedJobForScan(null)}
        />
      )}
    </div>
  );
};

export default Jobs;
