import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { CheckCircle, XCircle, Clock, Search } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function EmployerApprovals() {
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotes, setSelectedNotes] = useState("");
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedEmployerId, setSelectedEmployerId] = useState(null);
  const [approvalAction, setApprovalAction] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all"); // 'all', 'pending', 'approved', 'rejected'

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    fetchStats();
    fetchEmployers();
  }, [page, filterStatus]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/admin/users/approvals/stats`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setStats(res.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchEmployers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filterStatus !== "all") {
        params.status = filterStatus;
      }

      const res = await axios.get(
        `${API_BASE_URL}/api/admin/users/approvals/pending`,
        {
          params,
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setEmployers(res.data.employers);
      setTotalPages(res.data.pagination.pages);
    } catch (error) {
      console.error("Error fetching employers:", error);
      toast.error("Failed to fetch pending approvals");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, notes = "") => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/admin/users/approvals/${id}/approve`,
        { notes },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Employer approved successfully");
      fetchStats();
      fetchEmployers();
      setShowNotesModal(false);
      setSelectedNotes("");
      setSelectedEmployerId(null);
      setApprovalAction(null);
    } catch (error) {
      console.error("Error approving employer:", error);
      toast.error("Failed to approve employer");
    }
  };

  const handleReject = async (id, notes = "") => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/admin/users/approvals/${id}/reject`,
        { notes },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Employer rejected successfully");
      fetchStats();
      fetchEmployers();
      setShowNotesModal(false);
      setSelectedNotes("");
      setSelectedEmployerId(null);
      setApprovalAction(null);
    } catch (error) {
      console.error("Error rejecting employer:", error);
      toast.error("Failed to reject employer");
    }
  };

  const openNotesModal = (id, action) => {
    setSelectedEmployerId(id);
    setApprovalAction(action);
    setShowNotesModal(true);
    setSelectedNotes("");
  };

  const handleModalSubmit = () => {
    if (approvalAction === "approve") {
      handleApprove(selectedEmployerId, selectedNotes);
    } else if (approvalAction === "reject") {
      handleReject(selectedEmployerId, selectedNotes);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Employer Account Approvals</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Approvals</p>
              <p className="text-3xl font-bold text-yellow-600">
                {stats.pending}
              </p>
            </div>
            <Clock className="w-10 h-10 text-yellow-600 opacity-20" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-3xl font-bold text-green-600">
                {stats.approved}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-3xl font-bold text-red-600">
                {stats.rejected}
              </p>
            </div>
            <XCircle className="w-10 h-10 text-red-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        {/* Filter Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setFilterStatus("all");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === "all"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All Employers
          </button>
          <button
            onClick={() => {
              setFilterStatus("pending");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === "pending"
                ? "bg-yellow-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => {
              setFilterStatus("approved");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === "approved"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => {
              setFilterStatus("rejected");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === "rejected"
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Rejected
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Employers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : employers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {filterStatus === "all" || filterStatus === "pending"
              ? "No pending approvals at this time"
              : filterStatus === "approved"
                ? "No approved employers found"
                : "No rejected employers found"}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Applied
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employers.map((employer) => (
                    <tr
                      key={employer.id}
                      className="border-b hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {employer.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {employer.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {employer.company_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {employer.mobile_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(employer.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            employer.approval_status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : employer.approval_status === "approved"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {employer.approval_status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        {employer.approval_status !== "approved" && (
                          <button
                            onClick={() =>
                              openNotesModal(employer.id, "approve")
                            }
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                          >
                            Approve
                          </button>
                        )}
                        {employer.approval_status !== "rejected" && (
                          <button
                            onClick={() =>
                              openNotesModal(employer.id, "reject")
                            }
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                          >
                            Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {approvalAction === "approve"
                ? "Approve Employer"
                : "Reject Employer"}
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              {approvalAction === "approve"
                ? "Add any approval notes (optional)"
                : "Add rejection reason (optional)"}
            </p>
            <textarea
              value={selectedNotes}
              onChange={(e) => setSelectedNotes(e.target.value)}
              placeholder="Enter notes..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows="4"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setSelectedNotes("");
                  setSelectedEmployerId(null);
                  setApprovalAction(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition ${
                  approvalAction === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {approvalAction === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
