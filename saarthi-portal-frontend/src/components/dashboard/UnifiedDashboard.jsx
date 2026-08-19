import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Briefcase,
  Search,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ArrowRight,
  PlusCircle,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  Clock,
  ExternalLink,
  ChevronRight,
  FileText,
  Mail
} from 'lucide-react';

export default function UnifiedDashboard() {
  const { user, role, defaultDashboard, isAdmin, isEmployer, isSeeker, isRecruitment, isBD, isIQAnalyst } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (defaultDashboard && defaultDashboard !== '/dashboard') {
      navigate(defaultDashboard, { replace: true });
    }
  }, [role, defaultDashboard, navigate]);

  const [stats, setStats] = useState({
    candidateCount: '24,850+',
    activeJobsCount: '18',
    totalApplications: '142',
    scheduledInterviews: '9',
    pendingApprovals: '4',
  });

  const userName = user?.name || user?.email?.split('@')[0] || 'Team Member';
  const userRole = user?.role?.replace('_', ' ') || 'User';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* 1. Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white p-6 sm:p-8 lg:p-10 shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 -mb-12 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 mb-4 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Saarthi Unified Enterprise Platform</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-indigo-200 to-white">{userName}</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            Access candidate intelligence, manage job pipelines, review applications, and coordinate team operations seamlessly from your unified command center.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Link
              to="/iq/advanced-filter"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all cursor-pointer"
            >
              <Search className="w-4 h-4 mr-2" />
              Search IQ Database
            </Link>

            {isEmployer || isAdmin ? (
              <Link
                to="/jobs/posting-job"
                className="inline-flex items-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Post a Job
              </Link>
            ) : (
              <Link
                to="/jobs/jobs"
                className="inline-flex items-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Browse Jobs
              </Link>
            )}

            <Link
              to="/jobs/calendar"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md border border-white/10 transition-all"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Interview Calendar
            </Link>

            <Link
              to="/jobs/resume-scorer"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold backdrop-blur-md transition-all"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Resume Scorer
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Platform Overview Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* IQ Metric */}
        <Link
          to="/iq/advanced-filter"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-purple-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">IQ Intel</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 leading-none">{stats.candidateCount}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Candidates in IQ</p>
        </Link>

        {/* Active Jobs Metric */}
        <Link
          to={isEmployer || isAdmin ? "/jobs/active-jobs" : "/jobs/jobs"}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Jobs</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 leading-none">{stats.activeJobsCount}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Active Job Posts</p>
        </Link>

        {/* Applications Metric */}
        <Link
          to={isEmployer || isAdmin ? "/jobs/applicants" : "/jobs/my-jobs"}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Pipeline</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 leading-none">{stats.totalApplications}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Total Applications</p>
        </Link>

        {/* Calendar Metric */}
        <Link
          to="/jobs/calendar"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-emerald-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Interviews</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 leading-none">{stats.scheduledInterviews}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Interviews Scheduled</p>
        </Link>

        {/* Admin Approvals Metric */}
        {isAdmin && (
          <Link
            to="/admin/employer-approvals"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-rose-200 transition-all group col-span-2 md:col-span-4 lg:col-span-1"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">Admin</span>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 leading-none">{stats.pendingApprovals}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Pending Approvals</p>
          </Link>
        )}
      </div>

      {/* 3. Core Functional Modules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Saarthi IQ + Recruitment Operations */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Saarthi IQ Intelligence Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  IQ
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 leading-tight">Candidate Intelligence (Saarthi IQ)</h2>
                  <p className="text-xs text-slate-500">Filter, evaluate, and extract candidate analytics</p>
                </div>
              </div>
              <Link
                to="/iq/dashboard"
                className="text-xs font-bold text-purple-600 hover:text-purple-700 inline-flex items-center"
              >
                Open IQ <ChevronRight className="w-4 h-4 ml-0.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                to="/iq/advanced-filter"
                className="p-4 rounded-2xl bg-purple-50/60 hover:bg-purple-50 border border-purple-100 transition-colors flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center mb-3">
                    <Search className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Advanced Search</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Search by skills, experience, location, and department remarks.</p>
                </div>
                <span className="text-xs font-bold text-purple-700 mt-4 inline-flex items-center group-hover:translate-x-1 transition-transform">
                  Launch Search <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </span>
              </Link>

              <Link
                to="/iq/reports"
                className="p-4 rounded-2xl bg-purple-50/60 hover:bg-purple-50 border border-purple-100 transition-colors flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Activity Reports</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Export PDF/Excel updates, remarks history, and recruiter click logs.</p>
                </div>
                <span className="text-xs font-bold text-purple-700 mt-4 inline-flex items-center group-hover:translate-x-1 transition-transform">
                  View Reports <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </span>
              </Link>

              <Link
                to="/iq/dashboard"
                className="p-4 rounded-2xl bg-purple-50/60 hover:bg-purple-50 border border-purple-100 transition-colors flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center mb-3">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">IQ Overview</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Department metrics across Business Development, Recruitment, and Franchise.</p>
                </div>
                <span className="text-xs font-bold text-purple-700 mt-4 inline-flex items-center group-hover:translate-x-1 transition-transform">
                  Open Overview <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </span>
              </Link>
            </div>
          </div>

          {/* Recruitment Operations Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 leading-tight">Recruitment & Job Operations</h2>
                  <p className="text-xs text-slate-500">Pipeline management, postings, and applicant tracking</p>
                </div>
              </div>
              <Link
                to={isEmployer ? "/jobs/poster-dashboard" : "/jobs/jobs"}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center"
              >
                Explore <ChevronRight className="w-4 h-4 ml-0.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {isEmployer || isAdmin ? (
                <>
                  <Link
                    to="/jobs/active-jobs"
                    className="p-4 rounded-2xl bg-blue-50/60 hover:bg-blue-50 border border-blue-100 transition-colors flex flex-col justify-between group"
                  >
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-3">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mb-1">Active Job Posts</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">Manage open positions, edit descriptions, and close filled roles.</p>
                    </div>
                    <span className="text-xs font-bold text-blue-700 mt-4 inline-flex items-center group-hover:translate-x-1 transition-transform">
                      Manage Jobs <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </span>
                  </Link>

                  <Link
                    to="/jobs/applicants"
                    className="p-4 rounded-2xl bg-blue-50/60 hover:bg-blue-50 border border-blue-100 transition-colors flex flex-col justify-between group"
                  >
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-3">
                        <Users className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mb-1">Applicants Pipeline</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">Review incoming candidates, shortlist, and trigger interview scheduling.</p>
                    </div>
                    <span className="text-xs font-bold text-blue-700 mt-4 inline-flex items-center group-hover:translate-x-1 transition-transform">
                      Review Applicants <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/jobs/jobs"
                    className="p-4 rounded-2xl bg-blue-50/60 hover:bg-blue-50 border border-blue-100 transition-colors flex flex-col justify-between group"
                  >
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-3">
                        <Search className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mb-1">Explore Job Openings</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">Search verified jobs matching your skills and experience level.</p>
                    </div>
                    <span className="text-xs font-bold text-blue-700 mt-4 inline-flex items-center group-hover:translate-x-1 transition-transform">
                      Find Jobs <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </span>
                  </Link>

                  <Link
                    to="/jobs/my-jobs"
                    className="p-4 rounded-2xl bg-blue-50/60 hover:bg-blue-50 border border-blue-100 transition-colors flex flex-col justify-between group"
                  >
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-3">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mb-1">My Applications</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">Track application progress, review statuses, and interview requests.</p>
                    </div>
                    <span className="text-xs font-bold text-blue-700 mt-4 inline-flex items-center group-hover:translate-x-1 transition-transform">
                      Track Status <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </span>
                  </Link>
                </>
              )}

              <Link
                to="/jobs/resume-scorer"
                className="p-4 rounded-2xl bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-100 transition-colors flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center mb-3">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">AI Resume Scorer</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Calculate match score between resumes and job descriptions instantly.</p>
                </div>
                <span className="text-xs font-bold text-indigo-700 mt-4 inline-flex items-center group-hover:translate-x-1 transition-transform">
                  Score Resume <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Administration & Calendar Quick Panel */}
        <div className="space-y-8">
          
          {/* Interview Calendar Quick Widget */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">Upcoming Calendar</h3>
              </div>
              <Link to="/jobs/calendar" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                View All
              </Link>
            </div>
            
            <p className="text-xs text-slate-500 mb-4">You have {stats.scheduledInterviews} interview sessions lined up this week.</p>
            
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Senior React Developer</p>
                    <p className="text-[11px] text-slate-500">Technical Round • 2:00 PM</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">Today</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Product Manager</p>
                    <p className="text-[11px] text-slate-500">Culture Fit • 4:30 PM</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">Tomorrow</span>
              </div>
            </div>

            <Link
              to="/jobs/calendar"
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center"
            >
              Open Interactive Calendar
            </Link>
          </div>

          {/* Admin Tools Widget (if Admin) */}
          {isAdmin && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
              <div className="flex items-center space-x-2.5 mb-4">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-900">Admin Control Center</h3>
              </div>

              <p className="text-xs text-slate-500 mb-4">Administrative quick tools for system management</p>

              <div className="space-y-2">
                <Link
                  to="/admin/employer-approvals"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold">Employer Approvals</span>
                  </div>
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">4 Pending</span>
                </Link>

                <Link
                  to="/admin/send-email"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-rose-50 text-slate-700 hover:text-rose-800 border border-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <Mail className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-bold">Broadcast Campaigns</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  to="/admin/users"
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 text-slate-700 border border-slate-100 transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <Users className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold">User Directory</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
