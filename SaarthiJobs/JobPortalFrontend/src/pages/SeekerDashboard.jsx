import { useEffect, useState } from "react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ArrowRight,
  FileText,
  Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getApiBaseUrl } from "../utils/apiConfig";

const API_BASE_URL = getApiBaseUrl();

const SeekerDashboard = () => {
  const [stats, setStats] = useState({
    applied: 0,
    shortlisted: 0,
    rejected: 0,
    hired: 0,
    total: 0,
  });
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Chart Colors: Blue, Amber, Red, Green
  const COLORS = ["#3B82F6", "#F59E0B", "#EF4444", "#10B981"];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      // This calls your NEW backend route
      const res = await axios.get(
        `${API_BASE_URL}/api/applications/dashboard-stats`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.data.success) {
        setStats(res.data.stats);
        setApplications(res.data.recentApps);
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: "Applied", value: stats.applied },
    { name: "Shortlisted", value: stats.shortlisted },
    { name: "Rejected", value: stats.rejected },
    { name: "Hired", value: stats.hired },
  ].filter((item) => item.value > 0);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading Dashboard...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Job Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back! Track your applications and progress here.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/calendar"
            className="bg-white text-blue-600 border border-blue-200 px-5 py-2.5 rounded-xl font-medium hover:bg-blue-50 transition flex items-center gap-2 shadow-sm"
          >
            <Calendar className="w-4 h-4" />
            Interview Calendar
          </Link>
          <Link
            to="/jobs"
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Find New Jobs
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Applied"
          count={stats.total}
          icon={FileText}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Shortlisted"
          count={stats.shortlisted}
          icon={Clock}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Rejected"
          count={stats.rejected}
          icon={XCircle}
          color="bg-red-50 text-red-600"
        />
        <StatCard
          title="Hired"
          count={stats.hired}
          icon={CheckCircle}
          color="bg-green-50 text-green-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Application Status
          </h3>
          <div className="flex-1 min-h-[250px] relative">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                <Briefcase className="w-10 h-10 mb-2 opacity-20" />
                <p>No applications yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Applications Table */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">
              Recent Applications
            </h3>
            <Link
              to="/applications"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
            >
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-sm text-gray-500 border-b border-gray-100">
                  <th className="py-3 font-medium">Job Role</th>
                  <th className="py-3 font-medium">Company</th>
                  <th className="py-3 font-medium">Applied Date</th>
                  <th className="py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {applications.length > 0 ? (
                  applications.map((app) => (
                    <tr
                      key={app.id}
                      className="group hover:bg-gray-50 transition"
                    >
                      <td className="py-4 font-semibold text-gray-800">
                        {app.job_title}
                      </td>
                      <td className="py-4 text-gray-600">{app.company_name}</td>
                      <td className="py-4 text-gray-500">
                        {new Date(app.applied_at).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        <StatusBadge status={app.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-gray-500">
                      You haven't applied to any jobs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const StatCard = ({ title, count, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition hover:shadow-md">
    <div className={`p-4 rounded-xl ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <h4 className="text-2xl font-bold text-gray-800">{count}</h4>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    applied: "bg-blue-100 text-blue-700",
    shortlisted: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
    hired: "bg-green-100 text-green-700",
  };
  const label = status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : "Unknown";
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status?.toLowerCase()] || "bg-gray-100 text-gray-600"}`}
    >
      {label}
    </span>
  );
};

export default SeekerDashboard;
