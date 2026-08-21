import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

import {
  ROLE_NAV_ITEMS,
  ROLE_LABELS,
  normalizeRole,
  getDefaultDashboard,
} from '../../config/rbac';

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
  TrendingUp,
  Building2,
  Clock,
  Sun,
  Moon,
} from 'lucide-react';

/*
 * ---------------------------------------------------------
 * ICON MAP
 * ---------------------------------------------------------
 */

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

const renderIcon = (
  iconName,
  className = 'w-4 h-4 mr-2.5 text-neutral-500'
) => {
  const IconComponent = ICON_MAP[iconName] || Briefcase;

  return <IconComponent className={className} />;
};

/*
 * ---------------------------------------------------------
 * APP LAYOUT
 * ---------------------------------------------------------
 */

export default function AppLayout() {
  const {
    user,
    logout,
    role,
    isAdmin,
    isEmployer,
  } = useAuth();

  const {
    toggleTheme,
    isDark,
  } = useTheme();

  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const pathname = location.pathname;

  /*
   * ---------------------------------------------------------
   * SECURITY: ROLE MUST COME FROM AUTH CONTEXT
   * ---------------------------------------------------------
   *
   * Do NOT read the role directly from localStorage.
   *
   * AuthContext is responsible for restoring/verifying the
   * authenticated session and obtaining the user's role.
   */

  const rawRole = role || user?.role;

  const currentRole = rawRole
    ? normalizeRole(rawRole)
    : null;

  /*
   * ---------------------------------------------------------
   * SECURITY: NEVER FALL BACK TO JOB SEEKER
   * ---------------------------------------------------------
   *
   * The old code used:
   *
   * ROLE_NAV_ITEMS[currentRole] || ROLE_NAV_ITEMS.job_seeker
   *
   * That is dangerous because an invalid/missing role could
   * accidentally receive Job Seeker permissions.
   */

  const navGroups = currentRole
    ? ROLE_NAV_ITEMS[currentRole] || []
    : [];

  /*
   * ---------------------------------------------------------
   * INVALID ROLE PROTECTION
   * ---------------------------------------------------------
   */

  if (!currentRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-zinc-950 px-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl shadow-sm p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>

          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Access Denied
          </h1>

          <p className="text-sm text-neutral-500 dark:text-zinc-400 mt-2">
            Your account does not have a valid role assigned.
            Please contact the administrator.
          </p>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="mt-5 px-4 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * ROLE LABEL
   * ---------------------------------------------------------
   */

  const roleLabel =
    ROLE_LABELS[currentRole] || 'User';

  /*
   * ---------------------------------------------------------
   * LOGOUT
   * ---------------------------------------------------------
   */

  const handleLogout = () => {
    setUserDropdownOpen(false);
    setSidebarOpen(false);

    logout();

    navigate('/login', {
      replace: true,
    });
  };

  /*
   * ---------------------------------------------------------
   * ROLE DASHBOARD
   * ---------------------------------------------------------
   */

  const dashboardPath =
    getDefaultDashboard(currentRole);

  /*
   * ---------------------------------------------------------
   * QUICK NAVIGATION
   * ---------------------------------------------------------
   */

  const quickNavLinks = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      to: dashboardPath,
      visible: Boolean(dashboardPath),
      isActive:
        pathname === '/dashboard' ||
        pathname === dashboardPath,
    },

    {
      key: 'candidates',
      label: 'Candidate Search',
      to: '/jobs/find-candidate',

      visible:
        isAdmin ||
        currentRole === 'iq_analyst' ||
        currentRole === 'recruitment' ||
        currentRole === 'bd',

      isActive:
        pathname.startsWith('/jobs/find-candidate'),
    },

    {
      key: 'jobs',

      label:
        currentRole === 'job_seeker'
          ? 'Job Portal'
          : 'Recruitment',

      to:
        isEmployer ||
        currentRole === 'recruitment'
          ? '/jobs/poster-dashboard'
          : '/jobs/dashboard',

      visible:
        isAdmin ||
        currentRole === 'employer' ||
        currentRole === 'recruitment' ||
        currentRole === 'bd' ||
        currentRole === 'job_seeker',

      isActive:
        pathname.startsWith('/jobs'),
    },

    {
      key: 'admin',
      label: 'Admin Center',
      to: '/admin/dashboard',

      /*
       * Only Admin can see the Admin Center.
       *
       * Super Admin is intentionally not supported.
       */
      visible: isAdmin,

      isActive:
        pathname.startsWith('/admin'),
    },
  ];

  /*
   * ---------------------------------------------------------
   * ACCOUNT MENU
   * ---------------------------------------------------------
   */

  const accountMenuItems = [
    {
      key: 'dashboard',
      label: 'My Dashboard',
      to: dashboardPath,
      icon: LayoutDashboard,
    },

    {
      key: 'profile',
      label: 'Profile settings',

      to:
        isEmployer
          ? '/jobs/poster-profile'
          : '/jobs/profile',

      icon: User,
    },

    {
      key: 'calendar',
      label: 'Calendar & interviews',
      to: '/jobs/calendar',
      icon: Calendar,
    },
  ];

  /*
   * ---------------------------------------------------------
   * ACCESSIBILITY / FOCUS STYLES
   * ---------------------------------------------------------
   */

  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2';

  const focusRingDark =
    isDark
      ? 'focus-visible:ring-offset-zinc-950'
      : 'focus-visible:ring-offset-white';

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <div
      className={`min-h-screen flex flex-col font-sans antialiased ${
        isDark
          ? 'bg-zinc-950 text-zinc-200'
          : 'bg-neutral-50 text-neutral-900'
      }`}
    >

      {/* =====================================================
          TOP APPLICATION HEADER
         ===================================================== */}

      <header
        className={`border-b sticky top-0 z-40 ${
          isDark
            ? 'bg-zinc-950 border-zinc-800'
            : 'bg-white border-neutral-200'
        }`}
      >
        <div className="max-w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* LEFT */}
          <div className="flex items-center space-x-3">

            {/* Mobile menu */}
            <button
              type="button"
              onClick={() =>
                setSidebarOpen(!sidebarOpen)
              }
              className={`lg:hidden p-2 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors ${focusRing} ${focusRingDark}`}
              aria-label="Toggle navigation"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            {/* Logo */}
            <Link
              to={dashboardPath}
              className={`flex items-center space-x-3 rounded-md ${focusRing} ${focusRingDark}`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-base ${
                  isDark
                    ? 'bg-white text-zinc-950'
                    : 'bg-neutral-900 text-white'
                }`}
              >
                S
              </div>

              <div className="flex flex-col leading-tight">
                <span
                  className={`text-sm font-semibold tracking-tight ${
                    isDark
                      ? 'text-white'
                      : 'text-neutral-900'
                  }`}
                >
                  Saarthi Portal
                </span>

                <span className="text-[11px] text-neutral-400 font-medium">
                  Enterprise Unified Platform
                </span>
              </div>
            </Link>
          </div>

          {/* =================================================
              CENTER QUICK NAVIGATION
             ================================================= */}

          <nav
            aria-label="Primary"
            className={`hidden xl:flex items-center gap-1 rounded-md border p-1 ${
              isDark
                ? 'border-zinc-800 bg-zinc-900/50'
                : 'border-neutral-200 bg-neutral-50'
            }`}
          >
            {quickNavLinks
              .filter((link) => link.visible)
              .map((link) => (
                <Link
                  key={link.key}
                  to={link.to}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${focusRing} ${focusRingDark} ${
                    link.isActive
                      ? 'bg-indigo-600 text-white'
                      : isDark
                        ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
          </nav>

          {/* =================================================
              RIGHT HEADER
             ================================================= */}

          <div className="flex items-center space-x-2 sm:space-x-3">

            {/* Role badge */}
            <span
              className={`hidden md:inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                isDark
                  ? 'border-zinc-800 text-zinc-300'
                  : 'border-neutral-200 text-neutral-600'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2"
                aria-hidden="true"
              />

              {roleLabel}
            </span>

            {/* Calendar */}
            <Link
              to="/jobs/calendar"
              className={`p-2 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors ${focusRing} ${focusRingDark}`}
              title="Interview Calendar"
            >
              <Calendar className="w-[18px] h-[18px]" />
            </Link>

            {/* Theme */}
            <button
              type="button"
              onClick={toggleTheme}
              title={
                isDark
                  ? 'Switch to Light Mode'
                  : 'Switch to Dark Mode'
              }
              className={`p-2 rounded-md border transition-colors ${focusRing} ${focusRingDark} ${
                isDark
                  ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  : 'border-neutral-200 text-neutral-500 hover:bg-neutral-100'
              }`}
            >
              {isDark ? (
                <Sun className="w-[18px] h-[18px]" />
              ) : (
                <Moon className="w-[18px] h-[18px]" />
              )}
            </button>

            {/* User dropdown */}
            <div className="relative">

              <button
                type="button"
                onClick={() =>
                  setUserDropdownOpen(
                    !userDropdownOpen
                  )
                }
                aria-haspopup="menu"
                aria-expanded={userDropdownOpen}
                className={`flex items-center space-x-2 p-1 rounded-md hover:bg-neutral-100 transition-colors ${focusRing} ${focusRingDark}`}
              >
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'bg-neutral-900 text-white'
                  }`}
                >
                  {user?.name ? (
                    user.name
                      .charAt(0)
                      .toUpperCase()
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>

                <div className="text-left hidden lg:block max-w-[130px]">
                  <p className="text-xs font-medium text-neutral-900 truncate leading-tight">
                    {user?.name || 'My Account'}
                  </p>

                  <p className="text-[11px] text-neutral-400 truncate leading-tight">
                    {roleLabel}
                  </p>
                </div>

                <ChevronDown className="w-4 h-4 text-neutral-400" />
              </button>

              {/* User dropdown menu */}
              {userDropdownOpen && (
                <div
                  role="menu"
                  className={`absolute right-0 mt-2 w-64 rounded-lg border py-1.5 z-50 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_24px_-8px_rgba(0,0,0,0.10)] ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-200'
                      : 'bg-white border-neutral-200 text-neutral-800'
                  }`}
                  onClick={() =>
                    setUserDropdownOpen(false)
                  }
                >

                  <div
                    className={`px-3.5 py-2.5 border-b ${
                      isDark
                        ? 'border-zinc-800'
                        : 'border-neutral-100'
                    }`}
                  >
                    <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                      Signed in as
                    </p>

                    <p className="text-sm font-medium text-neutral-900 truncate mt-0.5">
                      {user?.name || 'User'}
                    </p>

                    <p className="text-xs text-neutral-400 truncate">
                      {roleLabel}
                    </p>
                  </div>

                  <div className="py-1">
                    {accountMenuItems
                      .filter((item) => Boolean(item.to))
                      .map((item) => (
                        <Link
                          key={item.key}
                          to={item.to}
                          role="menuitem"
                          className="flex items-center px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                        >
                          <item.icon className="w-4 h-4 mr-3 text-neutral-400" />
                          {item.label}
                        </Link>
                      ))}
                  </div>

                  <div
                    className={`border-t my-1 ${
                      isDark
                        ? 'border-zinc-800'
                        : 'border-neutral-100'
                    }`}
                  />

                  <div className="px-1.5 py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      role="menuitem"
                      className="w-full flex items-center px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN CONTAINER
         ===================================================== */}

      <div className="flex-1 flex max-w-full w-full mx-auto">

        {/* ===================================================
            DESKTOP SIDEBAR
           =================================================== */}

        <aside
          className={`hidden lg:flex flex-col w-64 border-r py-6 px-3 shrink-0 min-h-[calc(100vh-4rem)] ${
            isDark
              ? 'bg-zinc-950 border-zinc-800'
              : 'bg-white border-neutral-200'
          }`}
        >

          <div className="flex-1 space-y-6 overflow-y-auto pr-1">

            {/* ------------------------------------------------
                ROLE BASED NAVIGATION
               ------------------------------------------------ */}

            {navGroups.length === 0 ? (
              <div className="px-3 py-4">
                <p className="text-xs text-red-500">
                  No navigation is available for your role.
                </p>
              </div>
            ) : (
              navGroups.map((group, groupIdx) => (
                <div
                  key={groupIdx}
                  className="space-y-1.5"
                >
                  <p className="px-3 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                    {group.group}
                  </p>

                  <div className="space-y-0.5">
                    {group.items.map(
                      (item, itemIdx) => {
                        const isActive =
                          pathname === item.path ||
                          (
                            item.path !== '/' &&
                            pathname.startsWith(
                              item.path + '?'
                            )
                          );

                        return (
                          <Link
                            key={itemIdx}
                            to={item.path}
                            className={`flex items-center px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${focusRing} ${focusRingDark} ${
                              isActive
                                ? 'bg-indigo-600 text-white'
                                : isDark
                                  ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                            }`}
                          >
                            {renderIcon(
                              item.icon,
                              `w-4 h-4 mr-3 ${
                                isActive
                                  ? 'text-white'
                                  : 'text-neutral-400'
                              }`
                            )}

                            <span className="truncate">
                              {item.label}
                            </span>
                          </Link>
                        );
                      }
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar footer */}
          <div
            className={`pt-4 border-t mt-4 space-y-0.5 ${
              isDark
                ? 'border-zinc-800'
                : 'border-neutral-200'
            }`}
          >

            <Link
              to={
                isEmployer
                  ? '/jobs/poster-profile'
                  : '/jobs/profile'
              }
              className={`flex items-center px-3 py-2 rounded-md text-[13px] font-medium ${
                isDark
                  ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              } transition-colors ${focusRing} ${focusRingDark}`}
            >
              <User className="w-4 h-4 mr-3 text-neutral-400" />
              <span>My profile</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className={`w-full flex items-center px-3 py-2 rounded-md text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors ${focusRing} ${focusRingDark}`}
            >
              <LogOut className="w-4 h-4 mr-3" />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* ===================================================
            MOBILE SIDEBAR
           =================================================== */}

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">

            {/* Overlay */}
            <div
              className="fixed inset-0 bg-neutral-900/40 transition-opacity"
              onClick={() =>
                setSidebarOpen(false)
              }
            />

            {/* Drawer */}
            <div
              className={`relative w-80 max-w-[85vw] h-full p-5 border-r flex flex-col justify-between z-10 overflow-y-auto ${
                isDark
                  ? 'bg-zinc-950 border-zinc-800 text-zinc-200'
                  : 'bg-white border-neutral-200 text-neutral-800'
              }`}
            >

              <div className="space-y-6">

                {/* Mobile header */}
                <div
                  className={`flex items-center justify-between pb-4 border-b ${
                    isDark
                      ? 'border-zinc-800'
                      : 'border-neutral-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">

                    <div
                      className={`w-8 h-8 rounded-md flex items-center justify-center font-semibold text-sm ${
                        isDark
                          ? 'bg-white text-zinc-950'
                          : 'bg-neutral-900 text-white'
                      }`}
                    >
                      S
                    </div>

                    <span
                      className={`font-semibold text-sm ${
                        isDark
                          ? 'text-white'
                          : 'text-neutral-900'
                      }`}
                    >
                      Saarthi Portal
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSidebarOpen(false)
                    }
                    className={`p-2 rounded-md ${
                      isDark
                        ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100'
                    } ${focusRing} ${focusRingDark}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile role navigation */}
                <div className="space-y-6">

                  {navGroups.map(
                    (group, groupIdx) => (
                      <div
                        key={groupIdx}
                        className="space-y-1.5"
                      >
                        <p className="px-3 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                          {group.group}
                        </p>

                        <div className="space-y-0.5">

                          {group.items.map(
                            (item, itemIdx) => {
                              const isActive =
                                pathname ===
                                  item.path ||
                                (
                                  item.path !== '/' &&
                                  pathname.startsWith(
                                    item.path + '?'
                                  )
                                );

                              return (
                                <Link
                                  key={itemIdx}
                                  to={item.path}
                                  onClick={() =>
                                    setSidebarOpen(false)
                                  }
                                  className={`flex items-center px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${focusRing} ${focusRingDark} ${
                                    isActive
                                      ? 'bg-indigo-600 text-white'
                                      : isDark
                                        ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                                  }`}
                                >
                                  {renderIcon(
                                    item.icon,
                                    `w-4 h-4 mr-2.5 ${
                                      isActive
                                        ? 'text-white'
                                        : 'text-neutral-400'
                                    }`
                                  )}

                                  <span>
                                    {item.label}
                                  </span>
                                </Link>
                              );
                            }
                          )}

                        </div>
                      </div>
                    )
                  )}

                </div>
              </div>

              {/* Mobile logout */}
              <div
                className={`pt-5 border-t ${
                  isDark
                    ? 'border-zinc-800'
                    : 'border-neutral-200'
                }`}
              >
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`w-full flex items-center justify-center px-4 py-2.5 rounded-md bg-red-50 text-red-600 font-medium text-[13px] hover:bg-red-100 transition-colors ${focusRing} ${focusRingDark}`}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            MAIN CONTENT
           =================================================== */}

        <main
          className={`flex-1 min-w-0 ${
            isDark
              ? 'bg-zinc-950'
              : 'bg-neutral-50'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}