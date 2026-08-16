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
      <aside style={{ width: 220, background: '#1f2937', color: 'white', padding: 24 }}>
        <h2 style={{ marginBottom: 24, fontSize: 18 }}>Saarthi Portal</h2>
        <p style={{ marginBottom: 24, fontSize: 13, opacity: 0.7 }}>Hi, {userName}</p>

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>IQ</p>
          <a href="/iq/dashboard" style={{ display: 'block', color: 'white', padding: '8px 0', textDecoration: 'none' }}>Dashboard</a>
          <a href="/iq/reports" style={{ display: 'block', color: 'white', padding: '8px 0', textDecoration: 'none' }}>Reports</a>
          <a href="/iq/advanced-filter" style={{ display: 'block', color: 'white', padding: '8px 0', textDecoration: 'none' }}>Advanced Filters</a>
        </div>

        <div>
          <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>Jobs</p>
          <a href="/jobs" style={{ display: 'block', color: 'white', padding: '8px 0', textDecoration: 'none' }}>Job Listing</a>
          <a href="/jobs/my-jobs" style={{ display: 'block', color: 'white', padding: '8px 0', textDecoration: 'none' }}>My Jobs</a>
          <a href="/jobs/post-job" style={{ display: 'block', color: 'white', padding: '8px 0', textDecoration: 'none' }}>Post a Job</a>
        </div>

        <button
          onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
          style={{ marginTop: 32, width: '100%', padding: 10, background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
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