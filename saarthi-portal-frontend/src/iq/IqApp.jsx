import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdvancedFilterPage from './components/AdvancedFilterPage'; 
import ReportsPage from './components/ReportsPage';
import UploadPage from './components/UploadPage';
import ManageUsersPage from './components/ManageUsersPage';

function IqApp() {
  return (
    <div className="w-full min-h-full">
      <Routes>
        <Route index element={<Navigate to="/iq/advanced-filter" replace />} />
        <Route path="advanced-filter" element={<AdvancedFilterPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="manage-users" element={<ManageUsersPage />} />
        {/* "IQ Overview" (old dashboard page) has been removed from navigation.
            Any old links/bookmarks (including /iq/dashboard) fall through here
            and land on the main working IQ page instead of a broken/empty page. */}
        <Route path="*" element={<Navigate to="/iq/advanced-filter" replace />} />
      </Routes>
    </div>
  );
}

export default IqApp;
