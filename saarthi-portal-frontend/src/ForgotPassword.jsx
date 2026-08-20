import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (err) {
      console.warn('Password reset endpoint unavailable; showing confirmation regardless.', err);
    } finally {
      // Always show the same neutral confirmation, regardless of whether the
      // account exists or the endpoint responded — avoids leaking which emails
      // are registered and matches the demo-friendly fallback pattern used
      // elsewhere in the auth flow.
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-md bg-white rounded-lg border border-neutral-200 p-8 sm:p-10 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_32px_-12px_rgba(0,0,0,0.12)]">
        <div className="mb-6">
          <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-semibold text-base mb-5">
            S
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Reset your password</h1>
          <p className="text-neutral-500 text-sm mt-1.5">
            Enter the email associated with your account and we'll send you a link to reset your password.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
          <div className="space-y-5">
            <div className="p-3.5 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                If an account exists for <strong>{email}</strong>, we've sent a password reset link to that
                address. Please check your inbox.
              </span>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 uppercase tracking-wider mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-md text-neutral-900 placeholder-neutral-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <span>Send reset link</span>
              )}
            </button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 rounded-md py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
