// src/iq/components/ManageUsersPage.jsx
// Standalone route for the Saarthi IQ "Manage Users" feature (admin only).
// UserManagement itself is untouched — this just gives it a real page/route
// to live at, since it previously only opened as a modal from the now-removed
// "IQ Overview" page.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import UserManagement from './UserManagement.jsx';

export default function ManageUsersPage() {
  const navigate = useNavigate();

  return (
    <UserManagement
      onClose={() => navigate('/iq/advanced-filter')}
      onUserUpdate={() => {}}
      onNotificationCountsChange={() => {}}
    />
  );
}
