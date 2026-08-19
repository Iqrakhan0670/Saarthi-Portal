import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ROLE_NAV_ITEMS, ROLE_LABELS, normalizeRole, getDefaultDashboard } from '../../config/rbac';
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
  Clock,
  Sun,
  Moon
} from 'lucide-react';

const ICON_MAP = {
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
  TrendingUp,
  Building2,
  Clock,
  User,
};

const renderIcon = (iconName, className = "w-4 h-4 mr-2.5 text-blue-500") => {
  const IconComponent = ICON_MAP[iconName] || Briefcase;
  return <IconComponent className={className} />;
};

export default function AppLayout() {
  const { user, logout, role, isAdmin, isEmployer } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const pathname = location.pathname;
  const currentRole = role || normalizeRole(user?.role);
  const roleLabel = ROLE_LABELS[currentRole] || 'User';

  const navGroups = ROLE_NAV_ITEMS[currentRole] || ROLE_NAV_ITEMS.job_seeker;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const dashboardPath = getDefaultDashboard(currentRole);

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased ${isDark ? 'bg-[#0b0f19] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      {/* Top Application Header */}
      <header className={`border-b sticky top-0 z-40 shadow-xs ${isDark ? 'bg-[#0e1525] border-slate-700/50' : 'bg-white border-slate-200'}`}>
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

            <Link to={dashboardPath} className="flex items-center space-x-3 group">
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
              to={dashboardPath}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                pathname === '/dashboard' || pathname === dashboardPath
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dashboard
            </Link>

            {(isAdmin || currentRole === 'iq_analyst' || currentRole === 'recruitment' || currentRole === 'bd') && (
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
            )}

            {(isAdmin || currentRole === 'employer' || currentRole === 'recruitment' || currentRole === 'bd' || currentRole === 'job_seeker') && (
              <Link
                to={isEmployer || currentRole === 'recruitment' ? "/jobs/poster-dashboard" : "/jobs/dashboard"}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  pathname.startsWith('/jobs')
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {currentRole === 'job_seeker' ? 'Job Portal' : 'Recruitment'}
              </Link>
            )}

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
            <span className="hidden md:inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900 border border-blue-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 mr-2 animate-pulse"></span>
              Role: {roleLabel}
            </span>

            {/* Quick Calendar Link */}
            <Link
              to="/jobs/calendar"
              className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors relative"
              title="Interview Calendar"
            >
              <Calendar className="w-5 h-5" />
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`relative p-2 rounded-xl transition-all duration-300 cursor-pointer ${
                isDark
                  ? 'bg-slate-800 text-amber-400 hover:bg-slate-700 border border-slate-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${
                isDark ? 'opacity-100' : 'opacity-0'
              } bg-amber-400/10`} />
              {isDark ? (
                <Sun className="w-5 h-5 relative z-10" />
              ) : (
                <Moon className="w-5 h-5 relative z-10" />
              )}
            </button>

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
                  <p className="text-[11px] text-slate-500 truncate leading-tight">{roleLabel}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div 
                  className={`absolute right-0 mt-2 w-64 rounded-2xl shadow-xl border py-2 z-50 animate-in fade-in slide-in-from-top-1 ${isDark ? 'bg-[#161f30] border-slate-700/60 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Signed in as</p>
                    <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{user?.name || 'User'}</p>
                    <p className="text-xs text-blue-600 font-semibold truncate">{roleLabel}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to={dashboardPath}
                      className="flex items-center px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-3 text-slate-400" /> My Dashboard
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
        <aside className={`hidden lg:flex flex-col w-72 border-r py-6 px-4 shrink-0 min-h-[calc(100vh-4rem)] ${isDark ? 'bg-[#0e1525] border-slate-700/50' : 'bg-white border-slate-200'}`}>
          <div className="flex-1 space-y-6 overflow-y-auto pr-1">
            
            {/* Dynamic Role Navigation Groups */}
            {navGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-2">
                <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.group}
                </p>
                <div className="space-y-1">
                  {group.items.map((item, itemIdx) => {
                    const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path + '?'));
                    return (
                      <Link
                        key={itemIdx}
                        to={item.path}
                        className={`flex items-center px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {renderIcon(item.icon, `w-4 h-4 mr-3 ${isActive ? 'text-white' : 'text-slate-500'}`)}
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="pt-4 border-t border-slate-200 mt-4 space-y-1">
            <Link
              to={isEmployer ? "/jobs/poster-profile" : "/jobs/profile"}
              className="flex items-center px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <User className="w-4 h-4 mr-3 text-slate-400" />
              <span>My Profile</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-3" />
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
            <div className={`relative w-80 max-w-[85vw] h-full p-6 shadow-2xl flex flex-col justify-between z-10 overflow-y-auto ${isDark ? 'bg-[#0e1525] text-slate-200' : 'bg-white text-slate-800'}`}>
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

                {/* Mobile Dynamic Nav Groups */}
                <div className="space-y-6">
                  {navGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="space-y-2">
                      <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {group.group}
                      </p>
                      <div className="space-y-1">
                        {group.items.map((item, itemIdx) => (
                          <Link
                            key={itemIdx}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className="flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50"
                          >
                            {renderIcon(item.icon, "w-4 h-4 mr-2.5 text-blue-500")}
                            <span>{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
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
        <main className={`flex-1 min-w-0 ${isDark ? 'bg-[#0b0f19]' : 'bg-slate-50'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
