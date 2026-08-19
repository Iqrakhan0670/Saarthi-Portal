/**
 * Centralized Role-Based Access Control (RBAC) System for Saarthi Portal
 * Exactly 6 Logical Roles:
 * 1. admin
 * 2. recruitment
 * 3. bd
 * 4. iq_analyst
 * 5. employer
 * 6. job_seeker
 */

export const ROLES = {
  ADMIN: 'admin',
  RECRUITMENT: 'recruitment',
  BD: 'bd',
  IQ_ANALYST: 'iq_analyst',
  EMPLOYER: 'employer',
  JOB_SEEKER: 'job_seeker',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.RECRUITMENT]: 'Recruitment',
  [ROLES.BD]: 'BD',
  [ROLES.IQ_ANALYST]: 'IQ Analyst',
  [ROLES.EMPLOYER]: 'Employer',
  [ROLES.JOB_SEEKER]: 'Job Seeker',
};

// Normalize legacy/alternative role strings to exact 6 valid roles
export const normalizeRole = (roleStr) => {
  if (!roleStr) return ROLES.JOB_SEEKER;
  const lower = String(roleStr).toLowerCase().trim();

  if (lower === 'admin' || lower === 'administrator') return ROLES.ADMIN;
  if (lower === 'recruitment' || lower === 'recruiter') return ROLES.RECRUITMENT;
  if (lower === 'bd' || lower === 'business_development') return ROLES.BD;
  if (lower === 'iq_analyst' || lower === 'iq_ops' || lower === 'employee' || lower === 'analyst') return ROLES.IQ_ANALYST;
  if (lower === 'employer' || lower === 'job_poster' || lower === 'poster') return ROLES.EMPLOYER;
  if (lower === 'job_seeker' || lower === 'seeker' || lower === 'candidate') return ROLES.JOB_SEEKER;

  return ROLES.JOB_SEEKER;
};

// Role-Based Default Dashboards
export const ROLE_DASHBOARDS = {
  [ROLES.ADMIN]: '/admin/dashboard',
  [ROLES.RECRUITMENT]: '/jobs/poster-dashboard',
  [ROLES.BD]: '/jobs/poster-dashboard?view=bd',
  [ROLES.IQ_ANALYST]: '/iq/advanced-filter',
  [ROLES.EMPLOYER]: '/jobs/poster-dashboard',
  [ROLES.JOB_SEEKER]: '/jobs/dashboard',
};

export const getDefaultDashboard = (roleStr) => {
  const role = normalizeRole(roleStr);
  return ROLE_DASHBOARDS[role] || '/jobs/dashboard';
};

// Centralized Role Navigation Configuration
export const ROLE_NAV_ITEMS = {
  [ROLES.ADMIN]: [
    {
      group: 'Administration',
      items: [
        { label: 'Admin Dashboard', path: '/admin/dashboard', icon: 'LayoutDashboard' },
        { label: 'User Management', path: '/admin/users', icon: 'Users' },
        { label: 'Employer Approvals', path: '/admin/employer-approvals', icon: 'CheckCircle2' },
        { label: 'Manage Admins', path: '/admin/admins', icon: 'ShieldCheck' },
        { label: 'Job Governance', path: '/admin/jobs', icon: 'Briefcase' },
        { label: 'Resume Sync & Storage', path: '/admin/resumes', icon: 'FileSpreadsheet' },
        { label: 'Broadcaster Email', path: '/admin/send-email', icon: 'Mail' },
      ],
    },
    {
      group: 'Saarthi IQ Suite',
      items: [
        { label: 'Advanced Candidate Search', path: '/iq/advanced-filter', icon: 'Search' },
        { label: 'Activity Reports', path: '/iq/reports', icon: 'FileSpreadsheet' },
        { label: 'Data Upload Center', path: '/iq/upload', icon: 'PlusCircle' },
        { label: 'IQ User Control', path: '/iq/manage-users', icon: 'Users' },
      ],
    },
    {
      group: 'Recruitment & Operations',
      items: [
        { label: 'Recruitment Command Center', path: '/jobs/poster-dashboard', icon: 'LayoutDashboard' },
        { label: 'Post New Job', path: '/jobs/posting-job', icon: 'PlusCircle' },
        { label: 'Active Job Openings', path: '/jobs/active-jobs', icon: 'Briefcase' },
        { label: 'Applicant Pipeline', path: '/jobs/applicants', icon: 'Users' },
        { label: 'Find Candidates', path: '/jobs/find-candidate', icon: 'Search' },
        { label: 'Saved Candidates', path: '/jobs/saved-candidates', icon: 'Bookmark' },
        { label: 'Hiring Analytics', path: '/jobs/view-analytics', icon: 'TrendingUp' },
        { label: 'Interview Calendar', path: '/jobs/calendar', icon: 'Calendar' },
        { label: 'AI Resume Scorer', path: '/jobs/resume-scorer', icon: 'Sparkles' },
      ],
    },
  ],

  [ROLES.RECRUITMENT]: [
    {
      group: 'Recruitment Hub',
      items: [
        { label: 'Recruitment Dashboard', path: '/jobs/poster-dashboard', icon: 'LayoutDashboard' },
        { label: 'Employer Pipeline', path: '/jobs/applicants', icon: 'Users' },
        { label: 'Post a Job', path: '/jobs/posting-job', icon: 'PlusCircle' },
        { label: 'Active Jobs', path: '/jobs/active-jobs', icon: 'Briefcase' },
        { label: 'Applicants', path: '/jobs/applicants', icon: 'Users' },
        { label: 'Find Candidates', path: '/jobs/find-candidate', icon: 'Search' },
        { label: 'Saved Candidates', path: '/jobs/saved-candidates', icon: 'Bookmark' },
        { label: 'Hiring Analytics', path: '/jobs/view-analytics', icon: 'TrendingUp' },
        { label: 'Interview Calendar', path: '/jobs/calendar', icon: 'Calendar' },
        { label: 'Candidate Search', path: '/iq/advanced-filter', icon: 'Search' },
        { label: 'Activity Reports', path: '/iq/reports', icon: 'FileSpreadsheet' },
        { label: 'AI Resume Scorer', path: '/jobs/resume-scorer', icon: 'Sparkles' },
      ],
    },
  ],

  [ROLES.BD]: [
    {
      group: 'Business Development',
      items: [
        { label: 'BD Dashboard', path: '/jobs/poster-dashboard?view=bd', icon: 'LayoutDashboard' },
        { label: 'Client / Employer Leads', path: '/admin/employer-approvals', icon: 'Building2' },
        { label: 'Employer Pipeline', path: '/jobs/applicants', icon: 'Users' },
        { label: 'Follow-ups', path: '/jobs/calendar', icon: 'Clock' },
        { label: 'Opportunities', path: '/jobs/active-jobs', icon: 'Briefcase' },
        { label: 'Activity Reports', path: '/iq/reports', icon: 'FileSpreadsheet' },
        { label: 'BD Analytics', path: '/jobs/view-analytics', icon: 'TrendingUp' },
        { label: 'Employer Information', path: '/admin/users', icon: 'Users' },
      ],
    },
  ],

  [ROLES.IQ_ANALYST]: [
    {
      group: 'Saarthi IQ Suite',
      items: [
        { label: 'Saarthi IQ Search', path: '/iq/advanced-filter', icon: 'Search' },
        { label: 'Candidate Search', path: '/iq/advanced-filter', icon: 'Search' },
        { label: 'Advanced Filters', path: '/iq/advanced-filter', icon: 'Search' },
        { label: 'Activity Reports', path: '/iq/reports', icon: 'FileSpreadsheet' },
        { label: 'Data Upload', path: '/iq/upload', icon: 'PlusCircle' },
        { label: 'IQ Operations', path: '/iq/manage-users', icon: 'Users' },
      ],
    },
  ],

  [ROLES.EMPLOYER]: [
    {
      group: 'Employer Workspace',
      items: [
        { label: 'Employer Dashboard', path: '/jobs/poster-dashboard', icon: 'LayoutDashboard' },
        { label: 'Post a Job', path: '/jobs/posting-job', icon: 'PlusCircle' },
        { label: 'My Jobs', path: '/jobs/active-jobs', icon: 'Briefcase' },
        { label: 'Applicants', path: '/jobs/applicants', icon: 'Users' },
        { label: 'Applicant Pipeline', path: '/jobs/applicants', icon: 'Users' },
        { label: 'Find Candidates', path: '/jobs/find-candidate', icon: 'Search' },
        { label: 'Saved Candidates', path: '/jobs/saved-candidates', icon: 'Bookmark' },
        { label: 'Interview Calendar', path: '/jobs/calendar', icon: 'Calendar' },
        { label: 'Hiring Analytics', path: '/jobs/view-analytics', icon: 'TrendingUp' },
        { label: 'AI Resume Scorer', path: '/jobs/resume-scorer', icon: 'Sparkles' },
        { label: 'Company Profile', path: '/jobs/poster-profile', icon: 'User' },
      ],
    },
  ],

  [ROLES.JOB_SEEKER]: [
    {
      group: 'Job Seeker Portal',
      items: [
        { label: 'Job Seeker Dashboard', path: '/jobs/dashboard', icon: 'LayoutDashboard' },
        { label: 'Job Board', path: '/jobs/jobs', icon: 'Search' },
        { label: 'Recommended Jobs', path: '/jobs/jobs?tab=recommended', icon: 'Briefcase' },
        { label: 'My Applications', path: '/jobs/my-jobs', icon: 'FileText' },
        { label: 'Saved Jobs', path: '/jobs/my-jobs?tab=saved', icon: 'Bookmark' },
        { label: 'Resume Profile', path: '/jobs/profile', icon: 'User' },
        { label: 'AI Resume Scorer', path: '/jobs/resume-scorer', icon: 'Sparkles' },
        { label: 'Interview Calendar', path: '/jobs/calendar', icon: 'Calendar' },
      ],
    },
  ],
};

// Route Prefix Permissions Map
const ROUTE_PERMISSIONS = {
  [ROLES.ADMIN]: ['/admin', '/iq', '/jobs', '/dashboard', '/home'],
  [ROLES.RECRUITMENT]: ['/jobs', '/iq/advanced-filter', '/iq/reports', '/dashboard', '/home'],
  [ROLES.BD]: ['/jobs', '/admin/employer-approvals', '/admin/users', '/iq/reports', '/dashboard', '/home'],
  [ROLES.IQ_ANALYST]: ['/iq', '/dashboard', '/home'],
  [ROLES.EMPLOYER]: ['/jobs', '/dashboard', '/home'],
  [ROLES.JOB_SEEKER]: ['/jobs/dashboard', '/jobs/jobs', '/jobs/my-jobs', '/jobs/profile', '/jobs/resume-scorer', '/jobs/calendar', '/jobs/education', '/jobs/projects', '/jobs/internships', '/jobs/employment', '/jobs/skills', '/jobs/languages', '/jobs/accomplishments', '/jobs/settings', '/dashboard', '/home'],
};

// Explicit restricted prefixes per role to enforce strict URL barriers
const RESTRICTED_PREFIXES = {
  [ROLES.JOB_SEEKER]: ['/admin', '/iq', '/jobs/poster-dashboard', '/jobs/posting-job', '/jobs/active-jobs', '/jobs/find-candidate', '/jobs/saved-candidates', '/jobs/view-analytics', '/jobs/hire-number', '/jobs/poster-profile', '/jobs/poster-settings'],
  [ROLES.EMPLOYER]: ['/admin', '/iq'],
  [ROLES.IQ_ANALYST]: ['/admin', '/jobs/poster-dashboard', '/jobs/posting-job', '/jobs/active-jobs', '/jobs/poster-profile'],
  [ROLES.BD]: ['/admin/admins', '/admin/jobs', '/admin/resumes', '/admin/send-email', '/jobs/posting-job'],
  [ROLES.RECRUITMENT]: ['/admin'],
};

/**
 * Checks if a given role is allowed to access a specific pathname
 */
export const hasRouteAccess = (roleStr, pathname) => {
  const role = normalizeRole(roleStr);
  if (!pathname || pathname === '/' || pathname === '/dashboard' || pathname === '/home') {
    return true;
  }

  // Admin has full platform access
  if (role === ROLES.ADMIN) return true;

  // Check explicit restricted prefixes first
  const restrictions = RESTRICTED_PREFIXES[role] || [];
  for (const restrictedPath of restrictions) {
    if (pathname.startsWith(restrictedPath)) {
      return false;
    }
  }

  // Check allowed route prefixes
  const allowedPrefixes = ROUTE_PERMISSIONS[role] || [];
  return allowedPrefixes.some((prefix) => pathname.startsWith(prefix));
};
