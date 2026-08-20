import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
  ShieldCheck,
  ChevronRight,
  FileText,
  Mail,
} from 'lucide-react';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2';

export default function UnifiedDashboard() {
  const { user, role, defaultDashboard, isAdmin, isEmployer, isSeeker, isRecruitment, isBD, isIQAnalyst } = useAuth();
  const { isDark } = useTheme();
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

  const focusRingDark = isDark ? 'focus-visible:ring-offset-zinc-950' : 'focus-visible:ring-offset-white';

  // Data-driven quick actions for the hero. First item is the primary CTA;
  // the rest render as secondary ghost buttons. Legacy /iq/advanced-filter was
  // removed with the IQ module and now maps to the jobs-based candidate search.
  const heroActions = [
    { key: 'candidates', label: 'Candidate search', to: '/jobs/find-candidate', icon: Search, primary: true },
    isEmployer || isAdmin
      ? { key: 'post-job', label: 'Post a job', to: '/jobs/posting-job', icon: PlusCircle }
      : { key: 'browse-jobs', label: 'Browse jobs', to: '/jobs/jobs', icon: Briefcase },
    { key: 'calendar', label: 'Interview calendar', to: '/jobs/calendar', icon: Calendar },
    { key: 'resume-scorer', label: 'AI resume scorer', to: '/jobs/resume-scorer', icon: Sparkles },
  ];

  // Metric cards — pure typographic hierarchy, no icon-in-a-box chip.
  const metricCards = [
    { key: 'candidates', label: 'Candidates in intelligence', value: stats.candidateCount, to: '/jobs/find-candidate', icon: Users, visible: true },
    { key: 'jobs', label: 'Active job posts', value: stats.activeJobsCount, to: isEmployer || isAdmin ? '/jobs/active-jobs' : '/jobs/jobs', icon: Briefcase, visible: true },
    { key: 'applications', label: 'Total applications', value: stats.totalApplications, to: isEmployer || isAdmin ? '/jobs/applicants' : '/jobs/my-jobs', icon: FileText, visible: true },
    { key: 'interviews', label: 'Interviews scheduled', value: stats.scheduledInterviews, to: '/jobs/calendar', icon: Calendar, visible: true },
    { key: 'approvals', label: 'Pending approvals', value: stats.pendingApprovals, to: '/admin/employer-approvals', icon: CheckCircle2, visible: isAdmin },
  ];

  // Candidate intelligence module — previously "Saarthi IQ", now routed to the
  // active jobs-based candidate search & analytics after the IQ module removal.
  const candidateIntelCards = [
    {
      key: 'search',
      title: 'Advanced search',
      desc: 'Search by skills, experience, location, and department remarks.',
      to: '/jobs/find-candidate',
      icon: Search,
      cta: 'Launch search',
    },
    {
      key: 'reports',
      title: 'Activity reports',
      desc: 'Export candidate and recruiter activity, remarks history, and click logs.',
      to: '/jobs/view-analytics',
      icon: FileSpreadsheet,
      cta: 'View reports',
    },
    {
      key: 'overview',
      title: 'Pipeline overview',
      desc: 'Department metrics across business development, recruitment, and franchise.',
      to: '/jobs/view-analytics',
      icon: TrendingUp,
      cta: 'Open overview',
    },
  ];

  const recruitmentCards = isEmployer || isAdmin
    ? [
        {
          key: 'active-jobs',
          title: 'Active job posts',
          desc: 'Manage open positions, edit descriptions, and close filled roles.',
          to: '/jobs/active-jobs',
          icon: Briefcase,
          cta: 'Manage jobs',
        },
        {
          key: 'applicants',
          title: 'Applicants pipeline',
          desc: 'Review incoming candidates, shortlist, and trigger interview scheduling.',
          to: '/jobs/applicants',
          icon: Users,
          cta: 'Review applicants',
        },
      ]
    : [
        {
          key: 'find-jobs',
          title: 'Explore job openings',
          desc: 'Search verified jobs matching your skills and experience level.',
          to: '/jobs/jobs',
          icon: Search,
          cta: 'Find jobs',
        },
        {
          key: 'my-applications',
          title: 'My applications',
          desc: 'Track application progress, review statuses, and interview requests.',
          to: '/jobs/my-jobs',
          icon: Briefcase,
          cta: 'Track status',
        },
      ];
  recruitmentCards.push({
    key: 'resume-scorer',
    title: 'AI resume scorer',
    desc: 'Calculate match score between resumes and job descriptions instantly.',
    to: '/jobs/resume-scorer',
    icon: Sparkles,
    cta: 'Score resume',
  });

  const upcomingInterviews = [
    { key: '1', role: 'Senior React Developer', meta: 'Technical round · 2:00 PM', when: 'Today' },
    { key: '2', role: 'Product Manager', meta: 'Culture fit · 4:30 PM', when: 'Tomorrow' },
  ];

  const adminQuickLinks = [
    { key: 'approvals', label: 'Employer approvals', badge: '4 pending', to: '/admin/employer-approvals', icon: CheckCircle2 },
    { key: 'broadcast', label: 'Broadcast campaigns', to: '/admin/send-email', icon: Mail },
    { key: 'users', label: 'User directory', to: '/admin/users', icon: Users },
  ];

  const surfaceCard = isDark
    ? 'bg-zinc-900 border-zinc-800'
    : 'bg-white border-neutral-200';
  const surfaceCardHover = isDark ? 'hover:bg-zinc-800' : 'hover:bg-neutral-50';
  const tileSurface = isDark
    ? 'bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700'
    : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200';
  const textPrimary = isDark ? 'text-zinc-100' : 'text-neutral-900';
  const textSecondary = isDark ? 'text-zinc-400' : 'text-neutral-500';
  const textMuted = isDark ? 'text-zinc-500' : 'text-neutral-400';
  const borderColor = isDark ? 'border-zinc-800' : 'border-neutral-200';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      {/* 1. Welcome Hero */}
      <div className={`rounded-lg p-6 sm:p-8 lg:p-10 border ${isDark ? 'bg-black border-zinc-800' : 'bg-neutral-900 border-neutral-800'}`}>
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] font-medium text-neutral-300 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Saarthi unified enterprise platform</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-3">
            Welcome back, {userName}
          </h1>

          <p className="text-neutral-400 text-sm leading-relaxed mb-6">
            Access candidate intelligence, manage job pipelines, review applications, and coordinate team
            operations from your unified command center.
          </p>

          <div className="flex flex-wrap gap-2.5">
            {heroActions.map((action) => (
              <Link
                key={action.key}
                to={action.to}
                className={`inline-flex items-center px-4 py-2.5 rounded-md text-xs font-semibold transition-colors ${focusRing} focus-visible:ring-offset-neutral-900 ${
                  action.primary
                    ? 'bg-white text-neutral-900 hover:bg-neutral-100'
                    : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                }`}
              >
                <action.icon className="w-4 h-4 mr-2" />
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Platform Overview Metrics — typographic hierarchy, no icon chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {metricCards
          .filter((card) => card.visible)
          .map((card) => (
            <Link
              key={card.key}
              to={card.to}
              className={`p-5 rounded-lg border transition-colors ${surfaceCard} ${surfaceCardHover} ${focusRing} ${focusRingDark}`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className={`text-[11px] font-medium uppercase tracking-wide ${textMuted}`}>{card.label}</p>
                <card.icon className={`w-3.5 h-3.5 ${textMuted}`} />
              </div>
              <p className={`text-2xl font-semibold leading-none ${textPrimary}`}>{card.value}</p>
            </Link>
          ))}
      </div>

      {/* 3. Core Functional Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Candidate Intelligence + Recruitment Operations */}
        <div className="lg:col-span-2 space-y-6">

          <div className={`rounded-lg border p-6 sm:p-8 ${surfaceCard}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={`text-base font-semibold ${textPrimary}`}>Candidate intelligence</h2>
                <p className={`text-xs mt-0.5 ${textSecondary}`}>Filter, evaluate, and extract candidate analytics</p>
              </div>
              <Link
                to="/jobs/find-candidate"
                className={`text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center rounded-sm ${focusRing} ${focusRingDark}`}
              >
                Open <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {candidateIntelCards.map((card) => (
                <Link
                  key={card.key}
                  to={card.to}
                  className={`p-4 rounded-md border transition-colors flex flex-col justify-between ${tileSurface} ${focusRing} ${focusRingDark}`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <card.icon className={`w-4 h-4 ${textSecondary}`} />
                      <h3 className={`text-sm font-medium ${textPrimary}`}>{card.title}</h3>
                    </div>
                    <p className={`text-xs leading-relaxed ${textSecondary}`}>{card.desc}</p>
                  </div>
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-4 inline-flex items-center">
                    {card.cta} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className={`rounded-lg border p-6 sm:p-8 ${surfaceCard}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={`text-base font-semibold ${textPrimary}`}>Recruitment & job operations</h2>
                <p className={`text-xs mt-0.5 ${textSecondary}`}>Pipeline management, postings, and applicant tracking</p>
              </div>
              <Link
                to={isEmployer ? '/jobs/poster-dashboard' : '/jobs/jobs'}
                className={`text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center rounded-sm ${focusRing} ${focusRingDark}`}
              >
                Explore <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recruitmentCards.map((card) => (
                <Link
                  key={card.key}
                  to={card.to}
                  className={`p-4 rounded-md border transition-colors flex flex-col justify-between ${tileSurface} ${focusRing} ${focusRingDark}`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <card.icon className={`w-4 h-4 ${textSecondary}`} />
                      <h3 className={`text-sm font-medium ${textPrimary}`}>{card.title}</h3>
                    </div>
                    <p className={`text-xs leading-relaxed ${textSecondary}`}>{card.desc}</p>
                  </div>
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-4 inline-flex items-center">
                    {card.cta} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Calendar + Admin Widgets */}
        <div className="space-y-6">

          <div className={`rounded-lg border p-6 ${surfaceCard}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold ${textPrimary}`}>Upcoming calendar</h3>
              <Link
                to="/jobs/calendar"
                className={`text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-sm ${focusRing} ${focusRingDark}`}
              >
                View all
              </Link>
            </div>

            <p className={`text-xs mb-4 ${textSecondary}`}>
              You have {stats.scheduledInterviews} interview sessions lined up this week.
            </p>

            <div className="space-y-2">
              {upcomingInterviews.map((item) => (
                <div
                  key={item.key}
                  className={`p-3 rounded-md border flex items-center justify-between ${
                    isDark ? 'bg-zinc-800/60 border-zinc-700' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div>
                    <p className={`text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-neutral-800'}`}>{item.role}</p>
                    <p className={`text-[11px] mt-0.5 ${textSecondary}`}>{item.meta}</p>
                  </div>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                      isDark ? 'text-zinc-400 bg-zinc-900 border-zinc-700' : 'text-neutral-500 bg-white border-neutral-200'
                    }`}
                  >
                    {item.when}
                  </span>
                </div>
              ))}
            </div>

            <Link
              to="/jobs/calendar"
              className={`mt-4 w-full py-2.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center ${focusRing} ${focusRingDark} ${
                isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              Open interactive calendar
            </Link>
          </div>

          {isAdmin && (
            <div className={`rounded-lg border p-6 ${surfaceCard}`}>
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className={`w-4 h-4 ${textSecondary}`} />
                <h3 className={`text-sm font-semibold ${textPrimary}`}>Admin control center</h3>
              </div>

              <p className={`text-xs mb-4 ${textSecondary}`}>Administrative quick tools for system management</p>

              <div className="space-y-1">
                {adminQuickLinks.map((link) => (
                  <Link
                    key={link.key}
                    to={link.to}
                    className={`flex items-center justify-between p-3 rounded-md border transition-colors ${focusRing} ${focusRingDark} ${
                      isDark
                        ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                        : 'border-neutral-100 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <link.icon className={`w-4 h-4 ${textSecondary}`} />
                      <span className="text-xs font-medium">{link.label}</span>
                    </div>
                    {link.badge ? (
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {link.badge}
                      </span>
                    ) : (
                      <ChevronRight className={`w-4 h-4 ${textMuted}`} />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
