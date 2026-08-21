import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import {
  ROLES,
  getDefaultDashboard,
  normalizeRole,
} from './config/rbac';

import {
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  Loader2,
  Briefcase,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const getPasswordChecks = (password) => {
  if (!password) {
    return {
      length: false,
      upper: false,
      lower: false,
      number: false,
      special: false,
    };
  }

  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
};

const isPasswordFullyValid = (checks) =>
  checks.length &&
  checks.upper &&
  checks.lower &&
  checks.number &&
  checks.special;

/*
 * Super Admin is intentionally removed.
 *
 * These are the only roles that can be selected during signup.
 *
 * IMPORTANT:
 * The backend must still validate whether the requested
 * signup role is actually allowed.
 */
const ROLE_OPTIONS = [
  {
    value: ROLES.JOB_SEEKER,
    label: 'Job Seeker',
  },
  {
    value: ROLES.EMPLOYER,
    label: 'Employer',
  },
  {
    value: ROLES.RECRUITMENT,
    label: 'Recruitment',
  },
  {
    value: ROLES.BD,
    label: 'BD (Business Development)',
  },
  {
    value: ROLES.IQ_ANALYST,
    label: 'IQ Analyst',
  },
  {
    value: ROLES.ADMIN,
    label: 'Admin',
  },
];

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900';

const labelClass =
  'block text-sm font-medium text-neutral-700 dark:text-zinc-300 mb-1.5';

const inputClass =
  'w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-md text-neutral-900 dark:text-zinc-100 placeholder-neutral-400 dark:placeholder-zinc-500 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors';

const PasswordRequirement = ({ label, met }) => {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors duration-200 border ${
        met
          ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-900 dark:text-green-400'
          : 'bg-neutral-50 border-neutral-200 text-neutral-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-500'
      }`}
    >
      {met ? (
        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
      ) : (
        <AlertCircle className="w-4 h-4 text-neutral-400 dark:text-zinc-500" />
      )}

      <span>{label}</span>
    </div>
  );
};

/*
 * Extract the role from the backend authentication response.
 *
 * Supported response shapes:
 *
 * {
 *   role: "Admin"
 * }
 *
 * {
 *   user: {
 *     role: "Admin"
 *   }
 * }
 *
 * {
 *   data: {
 *     role: "Admin"
 *   }
 * }
 *
 * We intentionally DO NOT provide a default role.
 */
const extractRoleFromResponse = (data) => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  return (
    data.role ||
    data.user?.role ||
    data.data?.role ||
    data.data?.user?.role ||
    null
  );
};

export default function Login() {
  const [mode, setMode] = useState('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  /*
   * Role is used ONLY during signup.
   *
   * During login the user NEVER selects a role.
   * The backend determines the user's actual role.
   */
  const [role, setRole] = useState(ROLES.JOB_SEEKER);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [passwordFocused, setPasswordFocused] =
    useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordChecks = getPasswordChecks(password);

  const passwordFullyValid =
    isPasswordFullyValid(passwordChecks);

  const showChecklist =
    mode === 'signup' &&
    passwordFocused &&
    !passwordFullyValid;

  const { login } = useAuth();
  const navigate = useNavigate();

  /*
   * ---------------------------------------------------------
   * ROLE-BASED REDIRECT
   * ---------------------------------------------------------
   *
   * The role must come from the authenticated backend user.
   *
   * There is NO fallback to Job Seeker.
   */
  const redirectByRole = (authenticatedUser) => {
    if (!authenticatedUser) {
      throw new Error(
        'Authentication succeeded, but no user information was returned.'
      );
    }

    const backendRole =
      authenticatedUser.role ||
      authenticatedUser.user?.role;

    if (!backendRole) {
      throw new Error(
        'Login succeeded, but the server did not return your account role. Please contact the administrator.'
      );
    }

    const normalizedRole =
      normalizeRole(backendRole);

    if (!normalizedRole) {
      throw new Error(
        'Your account has an invalid role. Please contact the administrator.'
      );
    }

    const dashboard =
      getDefaultDashboard(normalizedRole);

    if (!dashboard) {
      throw new Error(
        'No dashboard is configured for your role.'
      );
    }

    navigate(dashboard, {
      replace: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      /*
       * =====================================================
       * LOGIN
       * =====================================================
       */
      if (mode === 'login') {
        const functionsUrl =
          import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;

        if (!functionsUrl) {
          throw new Error(
            'VITE_SUPABASE_FUNCTIONS_URL is missing in .env'
          );
        }

        const response = await fetch(
          `${functionsUrl}/login`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email.trim(),
              password,
            }),
          }
        );

        let data = {};

        try {
          data = await response.json();
        } catch {
          data = {};
        }

        /*
         * Backend rejected login.
         */
        if (!response.ok) {
          throw new Error(
            data.message ||
              data.error ||
              'Login failed. Please check your credentials.'
          );
        }

        /*
         * -----------------------------------------------------
         * IMPORTANT SECURITY CHECK
         * -----------------------------------------------------
         *
         * Never do:
         *
         * data.role || JOB_SEEKER
         *
         * Never do:
         *
         * localStorage.getItem('role')
         *
         * Never create a fake session.
         *
         * The backend must provide the actual role.
         */
        const responseRole =
          extractRoleFromResponse(data);

        if (!responseRole) {
          console.error(
            'Login response does not contain a role:',
            data
          );

          throw new Error(
            'Login succeeded, but the server did not return your role. Please check the login API response.'
          );
        }

        const normalizedResponseRole =
          normalizeRole(responseRole);

        if (!normalizedResponseRole) {
          console.error(
            'Invalid role returned by backend:',
            responseRole
          );

          throw new Error(
            'The server returned an invalid account role. Please contact the administrator.'
          );
        }

        /*
         * Pass the complete backend response to AuthContext.
         *
         * AuthContext is responsible for maintaining the
         * authenticated session/user state.
         */
        const authenticatedUser = await login(data);

        /*
         * Some AuthContext implementations return the user,
         * while others update context without returning it.
         *
         * Prefer the returned user, but use the verified role
         * from the backend response if necessary.
         */
        const userForRedirect =
          authenticatedUser || {
            ...data.user,
            role: responseRole,
          };

        /*
         * Make sure the role used for navigation is the
         * backend-provided role, never a localStorage value.
         */
        if (!userForRedirect.role) {
          userForRedirect.role = responseRole;
        }

        redirectByRole(userForRedirect);

        return;
      }

      /*
       * =====================================================
       * SIGNUP
       * =====================================================
       */

      const checks =
        getPasswordChecks(password);

      if (!isPasswordFullyValid(checks)) {
        throw new Error(
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
        );
      }

      if (confirmPassword !== password) {
        throw new Error(
          'Confirm password must match the password.'
        );
      }

      if (!email.trim()) {
        throw new Error(
          'Email address is required.'
        );
      }

      if (!name.trim()) {
        throw new Error(
          'Full name is required.'
        );
      }

      if (!role) {
        throw new Error(
          'Please select a valid account role.'
        );
      }

      const normalizedSignupRole =
        normalizeRole(role);

      if (!normalizedSignupRole) {
        throw new Error(
          'Invalid signup role selected.'
        );
      }

      const functionsUrl =
        import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;

      if (!functionsUrl) {
        throw new Error(
          'VITE_SUPABASE_FUNCTIONS_URL is missing in .env'
        );
      }

      /*
       * The frontend requests a role.
       *
       * IMPORTANT:
       * The backend MUST decide whether the user is actually
       * allowed to create an account with that role.
       */
      const signupPayload = {
        name: name.trim(),
        email: email.trim(),
        password,
        role: normalizedSignupRole,
      };

      const response = await fetch(
        `${functionsUrl}/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(signupPayload),
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            'Account creation failed.'
        );
      }

      /*
       * If signup automatically authenticates the user,
       * the backend must return both a valid authentication
       * session and role.
       */
      const returnedToken =
        data.token ||
        data.access_token ||
        data.user?.token;

      const returnedRole =
        extractRoleFromResponse(data);

      if (returnedToken && returnedRole) {
        const normalizedReturnedRole =
          normalizeRole(returnedRole);

        if (!normalizedReturnedRole) {
          throw new Error(
            'The server returned an invalid account role.'
          );
        }

        const authenticatedUser =
          await login(data);

        const userForRedirect =
          authenticatedUser || {
            ...data.user,
            role: returnedRole,
          };

        if (!userForRedirect.role) {
          userForRedirect.role = returnedRole;
        }

        redirectByRole(userForRedirect);

        return;
      }

      /*
       * Signup succeeded but no authenticated session was
       * returned.
       *
       * Do NOT create a fake session.
       */
      setSuccess(
        'Account created successfully. Please sign in with your new account.'
      );

      setMode('login');

      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(
        'Authentication error:',
        err
      );

      setError(
        err?.message ||
          'Authentication failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg border border-neutral-200 dark:border-zinc-800 p-8 sm:p-10 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_32px_-12px_rgba(0,0,0,0.12)]">

        {/* Header */}
        <div className="mb-6">
          <div className="w-11 h-11 bg-neutral-900 dark:bg-white rounded-lg flex items-center justify-center mb-4 text-white dark:text-zinc-950 font-semibold text-lg">
            S
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-zinc-100 tracking-tight">
            Saarthi Portal
          </h1>

          <p className="text-neutral-500 dark:text-zinc-400 text-sm mt-1">
            Enterprise role-based access control
          </p>
        </div>

        {/* Login / Signup */}
        <div className="flex bg-neutral-100 dark:bg-zinc-800 p-1 rounded-md mb-6 border border-neutral-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${focusRing} ${
              mode === 'login'
                ? 'bg-white dark:bg-zinc-700 text-neutral-900 dark:text-zinc-100 shadow-sm'
                : 'text-neutral-500 dark:text-zinc-400 hover:text-neutral-800 dark:hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${focusRing} ${
              mode === 'signup'
                ? 'bg-white dark:bg-zinc-700 text-neutral-900 dark:text-zinc-100 shadow-sm'
                : 'text-neutral-500 dark:text-zinc-400 hover:text-neutral-800 dark:hover:text-zinc-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3.5 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-6 p-3.5 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-400 text-sm flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Name */}
          {mode === 'signup' && (
            <div>
              <label className={labelClass}>
                Full name
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-zinc-500">
                  <UserIcon className="w-5 h-5" />
                </div>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="John Doe"
                  required
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className={labelClass}>
              Email address
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-zinc-500">
                <Mail className="w-5 h-5" />
              </div>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="name@company.com"
                required
                className={inputClass}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass}>
                Password
              </label>

              {mode === 'login' && (
                <Link
                  to="/forgot-password"
                  className={`text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-sm ${focusRing}`}
                >
                  Forgot password?
                </Link>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-zinc-500">
                <Lock className="w-5 h-5" />
              </div>

              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                onFocus={() =>
                  setPasswordFocused(true)
                }
                onBlur={() =>
                  setPasswordFocused(false)
                }
                placeholder="••••••••"
                required
                className={`${inputClass} pr-11`}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className={`absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 dark:text-zinc-500 hover:text-neutral-600 dark:hover:text-zinc-300 rounded-sm ${focusRing}`}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Password requirements */}
            {mode === 'signup' && (
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  showChecklist
                    ? 'grid-rows-[1fr] opacity-100 mt-2'
                    : 'grid-rows-[0fr] opacity-0 mt-0'
                }`}
                style={{
                  overflow: 'hidden',
                }}
              >
                <div className="min-h-0">
                  <div className="bg-neutral-50 dark:bg-zinc-800/60 rounded-md p-3 border border-neutral-200 dark:border-zinc-700">
                    <p className="text-[11px] font-medium text-neutral-600 dark:text-zinc-400 mb-2">
                      Password requirements
                    </p>

                    <div className="grid grid-cols-1 gap-1.5">
                      <PasswordRequirement
                        label="At least 8 characters"
                        met={passwordChecks.length}
                      />

                      <PasswordRequirement
                        label="Contains uppercase letter"
                        met={passwordChecks.upper}
                      />

                      <PasswordRequirement
                        label="Contains lowercase letter"
                        met={passwordChecks.lower}
                      />

                      <PasswordRequirement
                        label="Contains number"
                        met={passwordChecks.number}
                      />

                      <PasswordRequirement
                        label="Contains special character"
                        met={passwordChecks.special}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mode === 'signup' &&
              password &&
              passwordFullyValid &&
              !showChecklist && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />

                  <span>
                    Strong password
                  </span>
                </div>
              )}
          </div>

          {/* Signup fields */}
          {mode === 'signup' && (
            <>
              {/* Confirm password */}
              <div>
                <label className={labelClass}>
                  Confirm password
                </label>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-zinc-500">
                    <Lock className="w-5 h-5" />
                  </div>

                  <input
                    type={
                      showConfirmPassword
                        ? 'text'
                        : 'password'
                    }
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    placeholder="Repeat password"
                    required
                    className={`${inputClass} pr-11`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                    className={`absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 dark:text-zinc-500 hover:text-neutral-600 dark:hover:text-zinc-300 rounded-sm ${focusRing}`}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {confirmPassword &&
                  confirmPassword !== password && (
                    <p className="mt-1.5 text-[11px] font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Passwords do not match
                    </p>
                  )}

                {confirmPassword &&
                  confirmPassword === password &&
                  password && (
                    <p className="mt-1.5 text-[11px] font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Passwords match
                    </p>
                  )}
              </div>

              {/* Role */}
              <div>
                <label className={labelClass}>
                  Select role
                </label>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 dark:text-zinc-500">
                    <Briefcase className="w-5 h-5" />
                  </div>

                  <select
                    value={role}
                    onChange={(e) =>
                      setRole(e.target.value)
                    }
                    required
                    className={`${inputClass} cursor-pointer font-medium`}
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-zinc-500">
                  Final role authorization is handled
                  by the backend.
                </p>
              </div>
            </>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${focusRing}`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />

                <span>
                  Processing...
                </span>
              </>
            ) : (
              <span>
                {mode === 'login'
                  ? 'Sign In to Portal'
                  : 'Create Account'}
              </span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-zinc-800 text-center">
          <p className="text-xs text-neutral-400 dark:text-zinc-500">
            Protected by enterprise-grade RBAC
          </p>
        </div>
      </div>
    </div>
  );
}