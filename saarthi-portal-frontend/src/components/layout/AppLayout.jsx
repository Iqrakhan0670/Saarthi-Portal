import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Search,
  FileSpreadsheet,
  Briefcase,
  PlusCircle,
  Users,
  Bookmark,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Mail,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Building2,
  Clock
} from 'lucide-react';

export default function AppLayout() {
  const { user, logout, isAdmin, isEmployer, isSeeker, isEmployee } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [iqOpen, setIqOpen] = useState(true);
  const [recruitmentOpen, setRecruitmentOpen] = useState(true);
  const [managementOpen, setManagementOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);

  const pathname = location.pathname;
  const canAccessEmployerTools = isEmployer || isAdmin;
  const canAccessManagement = isAdmin || isEmployee;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = isAdmin
    ? 'Administrator'
    : isEmployer
    ? 'Employer / Recruiter'
    : isEmployee
    ? 'Operations Staff'
    : 'Job Seeker';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* Top Application Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Left: Mobile Toggle & Branding */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label="Toggle navigation"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-700 to-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-sm group-hover:scale-105 transition-transform">
                S
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold text-slate-900 leading-none tracking-tight">
                  Saarthi<span className="text-blue-600 font-semibold text-sm ml-1.5 px-2 py-0.5 bg-blue-50 rounded-md border border-blue-200">PORTAL</span>
                </span>
                <span className="text-xs text-slate-400 font-medium">Enterprise Unified Platform</span>
              </div>
            </Link>
          </div>

          {/* Center: Global Quick Section Links */}
          <div className="hidden xl:flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
            <Link
              to="/dashboard"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                pathname === '/dashboard' || pathname === '/'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/iq/advanced-filter"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                pathname.startsWith('/iq')
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Saarthi IQ
            </Link>
            <Link
              to={isEmployer ? "/jobs/poster-dashboard" : "/jobs/dashboard"}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                pathname.startsWith('/jobs')
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recruitment
            </Link>
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  pathname.startsWith('/admin')
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin Center
              </Link>
            )}
          </div>

          {/* Right: Actions, Role Badge & User Account */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Role Badge */}
            <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border border-blue-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-2 animate-pulse"></span>
              {roleLabel}
            </span>

            {/* Quick Calendar Link */}
            <Link
              to="/jobs/calendar"
              className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors relative"
              title="Interview Calendar"
            >
              <Calendar className="w-5 h-5" />
            </Link>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-blue-700 text-white font-bold rounded-xl flex items-center justify-center shadow-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                </div>
                <div className="text-left hidden lg:block max-w-[130px]">
                  <p className="text-xs font-bold text-slate-800 truncate leading-tight">{user?.name || 'My Account'}</p>
                  <p className="text-[11px] text-slate-500 truncate leading-tight">{user?.email || 'user@saarthi.com'}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Signed in as</p>
                    <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{user?.name || 'User'}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/dashboard"
                      className="flex items-center px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-3 text-slate-400" /> Dashboard
                    </Link>
                    <Link
                      to={isEmployer ? "/jobs/poster-profile" : "/jobs/profile"}
                      className="flex items-center px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <User className="w-4 h-4 mr-3 text-slate-400" /> Profile Settings
                    </Link>
                    <Link
                      to="/jobs/calendar"
                      className="flex items-center px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <Calendar className="w-4 h-4 mr-3 text-slate-400" /> Calendar & Interviews
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 my-1"></div>

                  <div className="px-2 py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-3" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container with Persistent Navigation Sidebar */}
      <div className="flex-1 flex max-w-full w-full mx-auto">
        
        {/* Desktop Persistent Sidebar */}
        <aside className="hidden lg:flex flex-col w-72 border-r border-slate-200 bg-white py-6 px-4 shrink-0 min-h-[calc(100vh-4rem)]">
          <div className="flex-1 space-y-6 overflow-y-auto pr-1">
            
            {/* Primary Dashboard Link */}
            <div>
              <Link
                to="/dashboard"
                className={`flex items-center px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  pathname === '/dashboard' || pathname === '/'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 mr-3" />
                <span>Dashboard</span>
              </Link>
            </div>

            {/* SECTION 1: Candidate Intelligence (Saarthi IQ) */}
            <div className="space-y-1">
              <button
                onClick={() => setIqOpen(!iqOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <span>Candidate Intelligence</span>
                </div>
                {iqOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {iqOpen && (
                <div className="space-y-1 pl-2 pt-1 border-l-2 border-purple-100 ml-3">
                  <Link
                    to="/iq/advanced-filter"
                    className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      pathname === '/iq/advanced-filter'
                        ? 'bg-purple-50 text-purple-800'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>Candidate Search & Filters</span>
                  </Link>

                  <Link
                    to="/iq/reports"
                    className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      pathname === '/iq/reports'
                        ? 'bg-purple-50 text-purple-800'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>Activity Reports</span>
                  </Link>

                  <Link
                    to="/iq/upload"
                    className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      pathname === '/iq/upload'
                        ? 'bg-purple-50 text-purple-800'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>Upload Data</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/iq/manage-users"
                      className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        pathname === '/iq/manage-users'
                          ? 'bg-purple-50 text-purple-800'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>Manage IQ Users</span>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 2: Recruitment & Jobs */}
            <div className="space-y-1">
              <button
                onClick={() => setRecruitmentOpen(!recruitmentOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span>Recruitment & Jobs</span>
                </div>
                {recruitmentOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {recruitmentOpen && (
                <div className="space-y-1 pl-2 pt-1 border-l-2 border-blue-100 ml-3">
                  <Link
                    to="/jobs/jobs"
                    className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      pathname === '/jobs/jobs' || pathname === '/jobs'
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Search className="w-4 h-4 mr-2.5 text-blue-500" />
                    <span>Job Board</span>
                  </Link>

                  {canAccessEmployerTools ? (
                    <>
                      <Link
                        to="/jobs/poster-dashboard"
                        className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          pathname === '/jobs/poster-dashboard'
                            ? 'bg-blue-50 text-blue-800'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2.5 text-blue-500" />
                        <span>Employer Pipeline</span>
                      </Link>
                      <Link
                        to="/jobs/posting-job"
                        className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          pathname === '/jobs/posting-job'
                            ? 'bg-blue-50 text-blue-800'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <PlusCircle className="w-4 h-4 mr-2.5 text-blue-500" />
                        <span>Post a New Job</span>
                      </Link>
                      <Link
                        to="/jobs/active-jobs"
                        className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          pathname === '/jobs/active-jobs'
                            ? 'bg-blue-50 text-blue-800'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Briefcase className="w-4 h-4 mr-2.5 text-blue-500" />
                        <span>Active Job Posts</span>
                      </Link>
                      <Link
                        to="/jobs/applicants"
                        className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          pathname === '/jobs/applicants'
                            ? 'bg-blue-50 text-blue-800'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Users className="w-4 h-4 mr-2.5 text-blue-500" />
                        <span>Applicants Pipeline</span>
                      </Link>
                      <Link
                        to="/jobs/find-candidate"
                        className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          pathname === '/jobs/find-candidate'
                            ? 'bg-blue-50 text-blue-800'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Search className="w-4 h-4 mr-2.5 text-blue-500" />
                        <span>Find Candidates</span>
                      </Link>
                      <Link
                        to="/jobs/saved-candidates"
                        className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          pathname === '/jobs/saved-candidates'
                            ? 'bg-blue-50 text-blue-800'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Bookmark className="w-4 h-4 mr-2.5 text-blue-500" />
                        <span>Saved Candidates</span>
                      </Link>
                      <Link
                        to="/jobs/view-analytics"
                        className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          pathname === '/jobs/view-analytics'
                            ? 'bg-blue-50 text-blue-800'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <TrendingUp className="w-4 h-4 mr-2.5 text-blue-500" />
                        <span>Hiring Analytics</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/jobs/dashboard"
                        className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          pathname === '/jobs/dashboard'
                            ? 'bg-blue-50 text-blue-800'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2.5 text-blue-500" />
                        <span>Candidate Hub</span>
                      </Link>
                      <Link
                        to="/jobs/my-jobs"
                        className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          pathname === '/jobs/my-jobs'
                            ? 'bg-blue-50 text-blue-800'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Briefcase className="w-4 h-4 mr-2.5 text-blue-500" />
                        <span>My Applications</span>
                      </Link>
                    </>
                  )}

                  <Link
                    to="/jobs/calendar"
                    className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      pathname === '/jobs/calendar'
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Calendar className="w-4 h-4 mr-2.5 text-blue-500" />
                    <span>Interview Calendar</span>
                  </Link>

                  <Link
                    to="/jobs/resume-scorer"
                    className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      pathname === '/jobs/resume-scorer'
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 mr-2.5 text-indigo-500" />
                    <span>AI Resume Scorer</span>
                  </Link>
                </div>
              )}
            </div>

            {/* SECTION 3: Management & Approvals */}
            {canAccessManagement && (
              <div className="space-y-1">
                <button
                  onClick={() => setManagementOpen(!managementOpen)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Management</span>
                  </div>
                  {managementOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {managementOpen && (
                  <div className="space-y-1 pl-2 pt-1 border-l-2 border-emerald-100 ml-3">
                    <Link
                      to="/admin/employer-approvals"
                      className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        pathname === '/admin/employer-approvals'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2.5 text-emerald-500" />
                      <span>Employer Approvals</span>
                    </Link>
                    <Link
                      to="/admin/users"
                      className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        pathname === '/admin/users'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Users className="w-4 h-4 mr-2.5 text-emerald-500" />
                      <span>User Moderation</span>
                    </Link>
                    <Link
                      to="/admin/jobs"
                      className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        pathname === '/admin/jobs'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Briefcase className="w-4 h-4 mr-2.5 text-emerald-500" />
                      <span>Job Moderation</span>
                    </Link>
                    <Link
                      to="/admin/resumes"
                      className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        pathname === '/admin/resumes'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="w-4 h-4 mr-2.5 text-emerald-500" />
                      <span>Resume Database</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 4: Platform Administration (Admin Only) */}
            {isAdmin && (
              <div className="space-y-1">
                <button
                  onClick={() => setAdminOpen(!adminOpen)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    <span>Administration</span>
                  </div>
                  {adminOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {adminOpen && (
                  <div className="space-y-1 pl-2 pt-1 border-l-2 border-rose-100 ml-3">
                    <Link
                      to="/admin/dashboard"
                      className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        pathname === '/admin/dashboard'
                          ? 'bg-rose-50 text-rose-800'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 mr-2.5 text-rose-500" />
                      <span>Admin Overview</span>
                    </Link>
                    <Link
                      to="/admin/admins"
                      className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        pathname === '/admin/admins'
                          ? 'bg-rose-50 text-rose-800'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 mr-2.5 text-rose-500" />
                      <span>Admin Privileges</span>
                    </Link>
                    <Link
                      to="/admin/send-email"
                      className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        pathname === '/admin/send-email'
                          ? 'bg-rose-50 text-rose-800'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Mail className="w-4 h-4 mr-2.5 text-rose-500" />
                      <span>Broadcast Email</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="pt-4 border-t border-slate-200 mt-4 space-y-1">
            <Link
              to={isEmployer ? "/jobs/poster-profile" : "/jobs/profile"}
              className="flex items-center px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <User className="w-4 h-4 mr-2.5 text-slate-400" />
              <span>My Profile</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Mobile Slide-over Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div 
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" 
              onClick={() => setSidebarOpen(false)} 
            />
            <div className="relative bg-white w-80 max-w-[85vw] h-full p-6 shadow-2xl flex flex-col justify-between z-10 overflow-y-auto">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold">
                      S
                    </div>
                    <span className="font-extrabold text-slate-900">Saarthi Portal</span>
                  </div>
                  <button 
                    onClick={() => setSidebarOpen(false)} 
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <Link
                    to="/dashboard"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-3 py-2 rounded-xl text-sm font-bold ${
                      pathname === '/dashboard' || pathname === '/'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
                  </Link>

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3">Candidate Intelligence</p>
                    <Link
                      to="/iq/advanced-filter"
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-purple-50"
                    >
                      Candidate Search
                    </Link>
                    <Link
                      to="/iq/reports"
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-purple-50"
                    >
                      Activity Reports
                    </Link>
                    <Link
                      to="/iq/upload"
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-purple-50"
                    >
                      Upload Data
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/iq/manage-users"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-purple-50"
                      >
                        Manage IQ Users
                      </Link>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3">Recruitment</p>
                    <Link
                      to="/jobs/jobs"
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50"
                    >
                      <Search className="w-4 h-4 mr-2.5 text-blue-500" /> Job Board
                    </Link>
                    {canAccessEmployerTools ? (
                      <>
                        <Link
                          to="/jobs/posting-job"
                          onClick={() => setSidebarOpen(false)}
                          className="flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50"
                        >
                          <PlusCircle className="w-4 h-4 mr-2.5 text-blue-500" /> Post a Job
                        </Link>
                        <Link
                          to="/jobs/applicants"
                          onClick={() => setSidebarOpen(false)}
                          className="flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50"
                        >
                          <Users className="w-4 h-4 mr-2.5 text-blue-500" /> Applicants
                        </Link>
                        <Link
                          to="/jobs/find-candidate"
                          onClick={() => setSidebarOpen(false)}
                          className="flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50"
                        >
                          <Search className="w-4 h-4 mr-2.5 text-blue-500" /> Find Talent
                        </Link>
                      </>
                    ) : (
                      <Link
                        to="/jobs/my-jobs"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50"
                      >
                        <Briefcase className="w-4 h-4 mr-2.5 text-blue-500" /> My Applications
                      </Link>
                    )}
                    <Link
                      to="/jobs/calendar"
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50"
                    >
                      <Calendar className="w-4 h-4 mr-2.5 text-blue-500" /> Calendar
                    </Link>
                    <Link
                      to="/jobs/resume-scorer"
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50"
                    >
                      <Sparkles className="w-4 h-4 mr-2.5 text-indigo-500" /> AI Resume Scorer
                    </Link>
                  </div>

                  {isAdmin && (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3">Administration</p>
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-rose-50"
                      >
                        <ShieldCheck className="w-4 h-4 mr-2.5 text-rose-500" /> Admin Center
                      </Link>
                      <Link
                        to="/admin/employer-approvals"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-emerald-50"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2.5 text-emerald-500" /> Approvals
                      </Link>
                      <Link
                        to="/admin/users"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-emerald-50"
                      >
                        <Users className="w-4 h-4 mr-2.5 text-emerald-500" /> Users
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
