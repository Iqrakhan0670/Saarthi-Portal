import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function AccessDenied() {
  const { defaultDashboard, role } = useAuth();
  const { isDark } = useTheme();

  const redirectPath = defaultDashboard || '/login';

  return (
    <div className={`min-h-[80vh] flex items-center justify-center p-4 ${isDark ? 'bg-zinc-950' : 'bg-neutral-50'}`}>
      <div className={`max-w-md w-full p-8 rounded-xl border text-center ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-neutral-200'
      } shadow-sm`}>
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h1 className={`text-xl font-bold mb-2 ${isDark ? 'text-zinc-100' : 'text-neutral-900'}`}>
          Access Denied
        </h1>

        <p className={`text-sm mb-6 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-neutral-600'}`}>
          You do not have the required permissions to view this resource. Your current role is 
          <span className="font-semibold text-indigo-500"> {role || 'Unauthenticated'}</span>.
        </p>

        <Link
          to={redirectPath}
          className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to Authorized Dashboard
        </Link>
      </div>
    </div>
  );
}