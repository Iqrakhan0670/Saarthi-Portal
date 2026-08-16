import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';

const IqApp = lazy(() => import('./iq/IqApp'));
const JobsApp = lazy(() => import('./jobs/JobsApp'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

function Home() {
  const userName = localStorage.getItem('userName') || 'User';
  const isLoggedIn = !!localStorage.getItem('token');

  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 240, background: '#1f2937', color: 'white', padding: 24, overflowY: 'auto' }}>
        <h2 style={{ marginBottom: 8, fontSize: 18 }}>Saarthi Portal</h2>
        <p style={{ marginBottom: 24, fontSize: 13, opacity: 0.7 }}>Hi, {userName}</p>

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>General</p>
          <a href="/iq/dashboard" style={{ display: 'block', color: 'white', padding: '6px 0', textDecoration: 'none', fontSize: 14 }}>Dashboard</a>
          <a href="/iq/reports" style={{ display: 'block', color: 'white', padding: '6px 0', textDecoration: 'none', fontSize: 14 }}>Reports</a>
        </div>

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>Admin / Users</p>
          <a href="/iq/dashboard" style={{ display: 'block', color: 'white', padding: '6px 0', textDecoration: 'none', fontSize: 14 }}>User Management</a>
          <a href="/iq/advanced-filter" style={{ display: 'block', color: 'white', padding: '6px 0', textDecoration: 'none', fontSize: 14 }}>Advanced Filters</a>
          <a href="/iq/dashboard" style={{ display: 'block', color: 'white', padding: '6px 0', textDecoration: 'none', fontSize: 14 }}>File Upload</a>
        </div>

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>Jobs</p>
          <a href="/jobs" style={{ display: 'block', color: 'white', padding: '6px 0', textDecoration: 'none', fontSize: 14 }}>Job Listing</a>
          <a href="/jobs/post-job" style={{ display: 'block', color: 'white', padding: '6px 0', textDecoration: 'none', fontSize: 14 }}>Post a Job</a>
          <a href="/jobs/my-jobs" style={{ display: 'block', color: 'white', padding: '6px 0', textDecoration: 'none', fontSize: 14 }}>My Jobs / Applications</a>
          <a href="/jobs/find-candidate" style={{ display: 'block', color: 'white', padding: '6px 0', textDecoration: 'none', fontSize: 14 }}>Candidate Search</a>
          <a href="/jobs/saved-candidates" style={{ display: 'block', color: 'white', padding: '6px 0', textDecoration: 'none', fontSize: 14 }}>Saved Candidates</a>
          <a href="/jobs/schedule-interview" style={{ display: 'block', color: 'white', padding: '6px 0', textDecoration: 'none', fontSize: 14 }}>Schedule Interview</a>
          <a href="/jobs/resume-scorer" style={{ display: 'block', color: 'white', padding: '6px 0', textDecoration: 'none', fontSize: 14 }}>Resume Scorer</a>
        </div>

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>Profile</p>
          <a href="/jobs/profile" style={{ display: 'block', color: 'white', padding: '6px 0', textDecoration: 'none', fontSize: 14 }}>Profile</a>
        </div>

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>Account</p>
          <a href="/iq/register" style={{ display: 'block', color: 'white', padding: '6px 0', textDecoration: 'none', fontSize: 14 }}>Signup/Register</a>
          <a href="/iq/forgot-password" style={{ display: 'block', color: 'white', padding: '6px 0', textDecoration: 'none', fontSize: 14 }}>Forgot Password</a>
        </div>

        <button
          onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
          style={{ width: '100%', padding: 10, background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Logout
        </button>
      </aside>
      <main style={{ flex: 1, padding: 40 }}>
        <h1>Welcome to Saarthi Portal</h1>
        <p>Select a feature from the sidebar to get started.</p>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 40 }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/iq/*" element={<IqApp />} />
          <Route path="/jobs/*" element={<JobsApp />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;