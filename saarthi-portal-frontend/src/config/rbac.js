/**
 * Centralized Role-Based Access Control (RBAC)
 * Saarthi Portal
 *
 * Exactly 6 valid roles:
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

/**
 * Human-readable role labels
 */
export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.RECRUITMENT]: 'Recruitment',
  [ROLES.BD]: 'BD',
  [ROLES.IQ_ANALYST]: 'IQ Analyst',
  [ROLES.EMPLOYER]: 'Employer',
  [ROLES.JOB_SEEKER]: 'Job Seeker',
};

/**
 * Valid roles
 */
export const VALID_ROLES = Object.values(ROLES);

/**
 * Normalize role values coming from the backend/auth system.
 *
 * IMPORTANT:
 * Unknown or missing roles return null.
 *
 * We NEVER default an invalid role to JOB_SEEKER.
 */
export const normalizeRole = (roleStr) => {
  if (!roleStr) {
    return null;
  }

  const lower = String(roleStr).toLowerCase().trim();

  if (lower === 'admin' || lower === 'administrator') {
    return ROLES.ADMIN;
  }

  if (
    lower === 'recruitment' ||
    lower === 'recruiter'
  ) {
    return ROLES.RECRUITMENT;
  }

  if (
    lower === 'bd' ||
    lower === 'business_development' ||
    lower === 'business development'
  ) {
    return ROLES.BD;
  }

  if (
    lower === 'iq_analyst' ||
    lower === 'iq analyst' ||
    lower === 'iq_ops' ||
    lower === 'employee' ||
    lower === 'analyst'
  ) {
    return ROLES.IQ_ANALYST;
  }

  if (
    lower === 'employer' ||
    lower === 'job_poster' ||
    lower === 'poster'
  ) {
    return ROLES.EMPLOYER;
  }

  if (
    lower === 'job_seeker' ||
    lower === 'job seeker' ||
    lower === 'seeker' ||
    lower === 'candidate'
  ) {
    return ROLES.JOB_SEEKER;
  }

  // NEVER silently convert an unknown role into another role.
  return null;
};

/**
 * Default dashboard for every valid role.
 */
export const ROLE_DASHBOARDS = {
  [ROLES.ADMIN]: '/admin/dashboard',

  [ROLES.RECRUITMENT]: '/jobs/poster-dashboard',

  [ROLES.BD]: '/jobs/poster-dashboard?view=bd',

  [ROLES.IQ_ANALYST]: '/jobs/dashboard',

  [ROLES.EMPLOYER]: '/jobs/poster-dashboard',

  [ROLES.JOB_SEEKER]: '/jobs/dashboard',
};

/**
 * Get default dashboard safely.
 */
export const getDefaultDashboard = (roleStr) => {
  const role = normalizeRole(roleStr);

  if (!role) {
    return '/login';
  }

  return ROLE_DASHBOARDS[role] || '/login';
};

/**
 * Centralized navigation configuration.
 *
 * IMPORTANT:
 * Sidebar visibility is NOT security.
 * ProtectedRoute + backend authorization must still enforce access.
 */
export const ROLE_NAV_ITEMS = {
  [ROLES.ADMIN]: [
    {
      group: 'Administration',
      items: [
        {
          label: 'Admin Dashboard',
          path: '/admin/dashboard',
          icon: 'LayoutDashboard',
        },
        {
          label: 'User Management',
          path: '/admin/users',
          icon: 'Users',
        },
        {
          label: 'Employer Approvals',
          path: '/admin/employer-approvals',
          icon: 'CheckCircle2',
        },
        {
          label: 'Manage Admins',
          path: '/admin/admins',
          icon: 'ShieldCheck',
        },
        {
          label: 'Job Governance',
          path: '/admin/jobs',
          icon: 'Briefcase',
        },
        {
          label: 'Resume Sync & Storage',
          path: '/admin/resumes',
          icon: 'FileSpreadsheet',
        },
        {
          label: 'Broadcaster Email',
          path: '/admin/send-email',
          icon: 'Mail',
        },
      ],
    },
    {
      group: 'Candidate Intelligence',
      items: [
        {
          label: 'Advanced Candidate Search',
          path: '/jobs/find-candidate',
          icon: 'Search',
        },
        {
          label: 'Activity Reports',
          path: '/jobs/view-analytics',
          icon: 'FileSpreadsheet',
        },
        {
          label: 'Data Upload Center',
          path: '/admin/resumes',
          icon: 'PlusCircle',
        },
        {
          label: 'User Control',
          path: '/admin/users',
          icon: 'Users',
        },
      ],
    },
    {
      group: 'Recruitment & Operations',
      items: [
        {
          label: 'Recruitment Command Center',
          path: '/jobs/poster-dashboard',
          icon: 'LayoutDashboard',
        },
        {
          label: 'Post New Job',
          path: '/jobs/posting-job',
          icon: 'PlusCircle',
        },
        {
          label: 'Active Job Openings',
          path: '/jobs/active-jobs',
          icon: 'Briefcase',
        },
        {
          label: 'Applicant Pipeline',
          path: '/jobs/applicants',
          icon: 'Users',
        },
        {
          label: 'Find Candidates',
          path: '/jobs/find-candidate',
          icon: 'Search',
        },
        {
          label: 'Saved Candidates',
          path: '/jobs/saved-candidates',
          icon: 'Bookmark',
        },
        {
          label: 'Hiring Analytics',
          path: '/jobs/view-analytics',
          icon: 'TrendingUp',
        },
        {
          label: 'Interview Calendar',
          path: '/jobs/calendar',
          icon: 'Calendar',
        },
        {
          label: 'AI Resume Scorer',
          path: '/jobs/resume-scorer',
          icon: 'Sparkles',
        },
      ],
    },
  ],

  [ROLES.RECRUITMENT]: [
    {
      group: 'Recruitment Hub',
      items: [
        {
          label: 'Recruitment Dashboard',
          path: '/jobs/poster-dashboard',
          icon: 'LayoutDashboard',
        },
        {
          label: 'Employer Pipeline',
          path: '/jobs/applicants',
          icon: 'Users',
        },
        {
          label: 'Post a Job',
          path: '/jobs/posting-job',
          icon: 'PlusCircle',
        },
        {
          label: 'Active Jobs',
          path: '/jobs/active-jobs',
          icon: 'Briefcase',
        },
        {
          label: 'Applicants',
          path: '/jobs/applicants',
          icon: 'Users',
        },
        {
          label: 'Find Candidates',
          path: '/jobs/find-candidate',
          icon: 'Search',
        },
        {
          label: 'Saved Candidates',
          path: '/jobs/saved-candidates',
          icon: 'Bookmark',
        },
        {
          label: 'Hiring Analytics',
          path: '/jobs/view-analytics',
          icon: 'TrendingUp',
        },
        {
          label: 'Interview Calendar',
          path: '/jobs/calendar',
          icon: 'Calendar',
        },
        {
          label: 'Candidate Search',
          path: '/jobs/find-candidate',
          icon: 'Search',
        },
        {
          label: 'Activity Reports',
          path: '/jobs/view-analytics',
          icon: 'FileSpreadsheet',
        },
        {
          label: 'AI Resume Scorer',
          path: '/jobs/resume-scorer',
          icon: 'Sparkles',
        },
      ],
    },
  ],

  [ROLES.BD]: [
    {
      group: 'Business Development',
      items: [
        {
          label: 'BD Dashboard',
          path: '/jobs/poster-dashboard?view=bd',
          icon: 'LayoutDashboard',
        },
        {
          label: 'Client / Employer Leads',
          path: '/admin/employer-approvals',
          icon: 'Building2',
        },
        {
          label: 'Employer Pipeline',
          path: '/jobs/applicants',
          icon: 'Users',
        },
        {
          label: 'Follow-ups',
          path: '/jobs/calendar',
          icon: 'Clock',
        },
        {
          label: 'Opportunities',
          path: '/jobs/active-jobs',
          icon: 'Briefcase',
        },
        {
          label: 'Activity Reports',
          path: '/jobs/view-analytics',
          icon: 'FileSpreadsheet',
        },
        {
          label: 'BD Analytics',
          path: '/jobs/view-analytics',
          icon: 'TrendingUp',
        },
        {
          label: 'Employer Information',
          path: '/admin/users',
          icon: 'Users',
        },
      ],
    },
  ],

  [ROLES.IQ_ANALYST]: [
    {
      group: 'Candidate Intelligence',
      items: [
        {
          label: 'Advanced Candidate Search',
          path: '/jobs/find-candidate',
          icon: 'Search',
        },
        {
          label: 'Activity Reports',
          path: '/jobs/view-analytics',
          icon: 'FileSpreadsheet',
        },
        {
          label: 'AI Resume Scorer',
          path: '/jobs/resume-scorer',
          icon: 'Sparkles',
        },
      ],
    },
  ],

  [ROLES.EMPLOYER]: [
    {
      group: 'Employer Workspace',
      items: [
        {
          label: 'Employer Dashboard',
          path: '/jobs/poster-dashboard',
          icon: 'LayoutDashboard',
        },
        {
          label: 'Post a Job',
          path: '/jobs/posting-job',
          icon: 'PlusCircle',
        },
        {
          label: 'My Jobs',
          path: '/jobs/active-jobs',
          icon: 'Briefcase',
        },
        {
          label: 'Applicants',
          path: '/jobs/applicants',
          icon: 'Users',
        },
        {
          label: 'Applicant Pipeline',
          path: '/jobs/applicants',
          icon: 'Users',
        },
        {
          label: 'Find Candidates',
          path: '/jobs/find-candidate',
          icon: 'Search',
        },
        {
          label: 'Saved Candidates',
          path: '/jobs/saved-candidates',
          icon: 'Bookmark',
        },
        {
          label: 'Interview Calendar',
          path: '/jobs/calendar',
          icon: 'Calendar',
        },
        {
          label: 'Hiring Analytics',
          path: '/jobs/view-analytics',
          icon: 'TrendingUp',
        },
        {
          label: 'AI Resume Scorer',
          path: '/jobs/resume-scorer',
          icon: 'Sparkles',
        },
        {
          label: 'Company Profile',
          path: '/jobs/poster-profile',
          icon: 'User',
        },
      ],
    },
  ],

  [ROLES.JOB_SEEKER]: [
    {
      group: 'Job Seeker Portal',
      items: [
        {
          label: 'Job Seeker Dashboard',
          path: '/jobs/dashboard',
          icon: 'LayoutDashboard',
        },
        {
          label: 'Job Board',
          path: '/jobs/jobs',
          icon: 'Search',
        },
        {
          label: 'Recommended Jobs',
          path: '/jobs/jobs?tab=recommended',
          icon: 'Briefcase',
        },
        {
          label: 'My Applications',
          path: '/jobs/my-jobs',
          icon: 'FileText',
        },
        {
          label: 'Saved Jobs',
          path: '/jobs/my-jobs?tab=saved',
          icon: 'Bookmark',
        },
        {
          label: 'Resume Profile',
          path: '/jobs/profile',
          icon: 'User',
        },
        {
          label: 'AI Resume Scorer',
          path: '/jobs/resume-scorer',
          icon: 'Sparkles',
        },
        {
          label: 'Interview Calendar',
          path: '/jobs/calendar',
          icon: 'Calendar',
        },
      ],
    },
  ],
};

/**
 * Route access rules
 *
 * These are explicit allow-lists.
 *
 * This is safer than:
 *
 * role → allow every /jobs route
 *       → manually block a few routes
 *
 * Each role only receives routes that are actually intended
 * for that role.
 */

/**
 * Admin
 *
 * Admin is the only role with full platform access.
 */
const ADMIN_ALLOWED_PREFIXES = [
  '/admin',
  '/jobs',
  '/dashboard',
  '/home',
];

/**
 * Recruitment
 */
const RECRUITMENT_ALLOWED_PREFIXES = [
  '/jobs/poster-dashboard',
  '/jobs/posting-job',
  '/jobs/active-jobs',
  '/jobs/applicants',
  '/jobs/find-candidate',
  '/jobs/saved-candidates',
  '/jobs/view-analytics',
  '/jobs/calendar',
  '/jobs/resume-scorer',
  '/dashboard',
  '/home',
];

/**
 * Business Development
 */
const BD_ALLOWED_PREFIXES = [
  '/jobs/poster-dashboard',
  '/jobs/applicants',
  '/jobs/calendar',
  '/jobs/active-jobs',
  '/jobs/view-analytics',
  '/admin/employer-approvals',
  '/admin/users',
  '/dashboard',
  '/home',
];

/**
 * IQ Analyst
 */
const IQ_ANALYST_ALLOWED_PREFIXES = [
  '/jobs/dashboard',
  '/jobs/find-candidate',
  '/jobs/view-analytics',
  '/jobs/resume-scorer',
  '/dashboard',
  '/home',
];

/**
 * Employer
 */
const EMPLOYER_ALLOWED_PREFIXES = [
  '/jobs/poster-dashboard',
  '/jobs/posting-job',
  '/jobs/active-jobs',
  '/jobs/applicants',
  '/jobs/find-candidate',
  '/jobs/saved-candidates',
  '/jobs/calendar',
  '/jobs/view-analytics',
  '/jobs/resume-scorer',
  '/jobs/poster-profile',
  '/dashboard',
  '/home',
];

/**
 * Job Seeker
 */
const JOB_SEEKER_ALLOWED_PREFIXES = [
  '/jobs/dashboard',
  '/jobs/jobs',
  '/jobs/my-jobs',
  '/jobs/profile',
  '/jobs/resume-scorer',
  '/jobs/calendar',
  '/jobs/education',
  '/jobs/projects',
  '/jobs/internships',
  '/jobs/employment',
  '/jobs/skills',
  '/jobs/languages',
  '/jobs/accomplishments',
  '/jobs/settings',
  '/dashboard',
  '/home',
];

/**
 * Central route permission map.
 */
const ROUTE_PERMISSIONS = {
  [ROLES.ADMIN]: ADMIN_ALLOWED_PREFIXES,
  [ROLES.RECRUITMENT]: RECRUITMENT_ALLOWED_PREFIXES,
  [ROLES.BD]: BD_ALLOWED_PREFIXES,
  [ROLES.IQ_ANALYST]: IQ_ANALYST_ALLOWED_PREFIXES,
  [ROLES.EMPLOYER]: EMPLOYER_ALLOWED_PREFIXES,
  [ROLES.JOB_SEEKER]: JOB_SEEKER_ALLOWED_PREFIXES,
};

/**
 * Check whether a role has access to a pathname.
 *
 * IMPORTANT:
 * - Invalid roles are denied.
 * - Unknown roles are denied.
 * - No role is converted into Job Seeker.
 * - Admin has full platform access.
 */
export const hasRouteAccess = (roleStr, pathname) => {
  const role = normalizeRole(roleStr);

  // No valid role = no access.
  if (!role) {
    return false;
  }

  if (!pathname) {
    return false;
  }

  /**
   * Normalize pathname.
   *
   * React Router's location.pathname does not contain query
   * parameters, but this also protects this function if a full
   * URL-like value is ever passed to it.
   */
  const cleanPathname = pathname.split('?')[0].split('#')[0];

  /**
   * Root/public application landing routes.
   *
   * Authentication is still handled by ProtectedRoute.
   */
  if (
    cleanPathname === '/' ||
    cleanPathname === '/dashboard' ||
    cleanPathname === '/home'
  ) {
    return true;
  }

  /**
   * Admin is the only role with complete platform access.
   */
  if (role === ROLES.ADMIN) {
    return true;
  }

  const allowedPrefixes = ROUTE_PERMISSIONS[role];

  if (!allowedPrefixes) {
    return false;
  }

  return allowedPrefixes.some((prefix) => {
    const cleanPrefix = prefix.split('?')[0];

    /**
     * Exact route match.
     */
    if (cleanPathname === cleanPrefix) {
      return true;
    }

    /**
     * Child route match.
     *
     * Example:
     *
     * /jobs/profile
     * /jobs/profile/edit
     *
     * Both are allowed when /jobs/profile is permitted.
     */
    return cleanPathname.startsWith(`${cleanPrefix}/`);
  });
};

/**
 * Check whether a role is valid.
 */
export const isValidRole = (roleStr) => {
  return normalizeRole(roleStr) !== null;
};

/**
 * Get navigation items for a role.
 *
 * Returns an empty array for invalid roles.
 */
export const getRoleNavItems = (roleStr) => {
  const role = normalizeRole(roleStr);

  if (!role) {
    return [];
  }

  return ROLE_NAV_ITEMS[role] || [];
};

/**
 * Check whether a role can access a specific navigation item.
 */
export const canAccessPath = (roleStr, pathname) => {
  return hasRouteAccess(roleStr, pathname);
};