import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import AdminManagement from "./components/AdminManagement";
import Users from "./components/Users";
import Jobs from "./components/Jobs";
import Resumes from "./components/Resumes";
import SendEmail from "./components/SendEmail";
import EmployerApprovals from "./components/EmployerApprovals";

export default function AdminApp() {
  return (
    <div className="w-full min-h-full p-4 sm:p-6 max-w-7xl mx-auto">
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="employer-approvals" element={<EmployerApprovals />} />
        <Route path="send-email" element={<SendEmail />} />
        <Route path="admins" element={<AdminManagement />} />
        <Route path="users" element={<Users />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="resumes" element={<Resumes />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </div>
  );
}
