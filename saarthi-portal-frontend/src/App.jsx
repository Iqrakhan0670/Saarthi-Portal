import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const IqApp = lazy(() => import('./iq/IqApp'));
const JobsApp = lazy(() => import('./jobs/JobsApp'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

function Home() {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Saarthi Portal</h1>
      <ul>
        <li><a href="/iq/login">SaarthiIQ</a></li>
        <li><a href="/jobs">Saarthi Jobs</a></li>
        <li><a href="/admin">Jobs Admin</a></li>
      </ul>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 40 }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/iq/*" element={<IqApp />} />
          <Route path="/jobs/*" element={<JobsApp />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;