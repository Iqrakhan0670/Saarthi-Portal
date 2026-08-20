import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Profile from "./components/Profile";

import UserAccomplishments from "./components/UserAccomplishments";
import UserEducations from "./components/UserEducations";
import UserEmployments from "./components/UserEmployments";
import UserInternships from "./components/UserInternships";
import UserLanguages from "./components/UserLanguages";
import UserProjects from "./components/UserProjects";
import UserSkills from "./components/UserSkills";

import Settings from "./components/Settings";
import MyJobs from "./components/MyJobs";
import Jobs from "./components/Jobs";
import PostJobs from "./components/PostJobs";
import PostingDashboard from "./components/PostingDashboard";
import PostingProfile from "./components/PostingProfile";
import FindCandidate from "./components/FindCandidate";
import SavedCandidates from "./components/SavedCandidates";
import ActiveJobs from "./components/ActiveJobs";
import Applicants from "./components/Applicants";
import ScheduleInterview from "./components/ScheduleInterview";
import HireNumber from "./components/HireNumber";
import PosterMessage from "./components/PosterMessage";
import ApplicantMessage from "./components/ApplicantMessage";
import ViewAnalytics from "./components/ViewAnalytics";
import ResumeScorer from './pages/ResumeScorer';
import SeekerDashboard from './pages/SeekerDashboard';
import CalendarPage from './components/CalendarPage';

export default function JobsApp() {
  return (
    <div className="w-full min-h-full">
      <Routes>
        <Route index element={<Jobs />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="dashboard" element={<SeekerDashboard />} />
        <Route path="poster-dashboard" element={<PostingDashboard />} />
        <Route path="posting-job" element={<PostJobs />} />
        <Route path="active-jobs" element={<ActiveJobs />} />
        <Route path="applicants" element={<Applicants />} />
        <Route path="find-candidate" element={<FindCandidate />} />
        <Route path="saved-candidates" element={<SavedCandidates />} />
        <Route path="schedule-interview" element={<ScheduleInterview />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="view-analytics" element={<ViewAnalytics />} />
        <Route path="hire-number" element={<HireNumber />} />
        <Route path="resume-scorer" element={<ResumeScorer />} />
        <Route path="test-ai" element={<ResumeScorer />} />
        <Route path="profile" element={<Profile />} />
        <Route path="poster-profile" element={<PostingProfile />} />
        <Route path="education" element={<UserEducations />} />
        <Route path="projects" element={<UserProjects />} />
        <Route path="internships" element={<UserInternships />} />
        <Route path="employment" element={<UserEmployments />} />
        <Route path="skills" element={<UserSkills />} />
        <Route path="languages" element={<UserLanguages />} />
        <Route path="accomplishments" element={<UserAccomplishments />} />
        <Route path="applicant-messages" element={<ApplicantMessage />} />
        <Route path="poster-message" element={<PosterMessage />} />
        {/* Canonical settings route for both seekers and posters */}
        <Route path="settings" element={<Settings />} />
        {/* Legacy poster-settings path redirected into unified settings to avoid duplication */}
        <Route path="poster-settings" element={<Navigate to="/jobs/settings" replace />} />
        <Route path="my-jobs" element={<MyJobs />} />
        <Route path="*" element={<Navigate to="/jobs/jobs" replace />} />
      </Routes>
    </div>
  );
}
