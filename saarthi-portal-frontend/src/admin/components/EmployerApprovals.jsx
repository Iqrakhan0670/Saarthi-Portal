import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { CheckCircle, XCircle, Clock, Search, Briefcase, User, Shield, Phone, Mail, Building } from "lucide-react";
import { getPendingApprovals, approvePendingUser, rejectPendingUser } from "../utils/api";

export default function EmployerApprovals() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterRole, setFilterRole] = useState("all");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPendingApprovals();
      const list = res.pending || [];
      setPendingUsers(list);
    } catch (err) {
      console.error("Error fetching pending approvals:", err);
      setError(err.message || "Failed to fetch pending approvals");
      setPendingUsers([]);
      toast.error("Failed to fetch pending approvals");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, notesText = "") => {
    setProcessing(true);
    try {
      await approvePendingUser(id, notesText);
      toast.success("User approved and activated successfully");
      closeModal();
      fetchPendingUsers();
    } catch (err) {
      console.error("Error approving user:", err);
      toast.error(err.message || "Failed to approve user");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id, notesText = "") => {
    setProcessing(true);
    try {
      await rejectPendingUser(id, notesText);
      toast.success("Pending registration rejected");
      closeModal();
      fetchPendingUsers();
    } catch (err) {
      console.error("Error rejecting user:", err);
      toast.error(err.message || "Failed to reject user");
    } finally {
      setProcessing(false);
    }
  };

  const openActionModal = (user, action) => {
    setSelectedUser(user);
    setActionType(action);
    setNotes("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setActionType(null);
    setNotes("");
  };

  const handleModalSubmit = () => {
    if (!selectedUser) return;
    if (actionType === "approve") {
      handleApprove(selectedUser.id, notes);
    } else if (actionType === "reject") {
      handleReject(selectedUser.id, notes);
    }
  };

  // Filter & Search
  const filteredUsers = pendingUsers.filter((user) => {
    const roleMatch =
      filterRole === "all"
        ? true
        : filterRole === "employer"
        ? (user.role || "").toLowerCase() === "employer"
        : filterRole === "job_seeker"
        ? (user.role || "job_seeker").toLowerCase() === "job_seeker"
        : (user.role || "").toLowerCase() === filterRole;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return roleMatch;

    const nameMatch = (user.name || "").toLowerCase().includes(query);
    const emailMatch = (user.email || "").toLowerCase().includes(query);
    const deptMatch = (user.department || "").toLowerCase().includes(query);
    const phoneMatch = (user.phone || "").toLowerCase().includes(query);
    const roleStringMatch = (user.role || "").toLowerCase().includes(query);

    return roleMatch && (nameMatch || emailMatch || deptMatch || phoneMatch || roleStringMatch);
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Stats calculation
  const totalPending = pendingUsers.length;
  const employerPending = pendingUsers.filter((u) => (u.role || "").toLowerCase() === "employer").length;
  const otherPending = totalPending - employerPending;

  const getRoleBadge = (role) => {
    const normalized = (role || "job_seeker").toLowerCase();
    switch (normalized) {
      case "employer":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Briefcase className="w-3 h-3" />
            Employer
          </span>
        );
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <Shield className="w-3 h-3" />
            Admin
          </span>
        );
      case "recruitment":
      case "recruiter":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <User className="w-3 h-3" />
            Recruiter
          </span>
        );
      case "bd":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Building className="w-3 h-3" />
            BD
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <User className="w-3 h-3" />
            Job Seeker
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Account & Employer Approvals
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Review, approve, or reject new user and employer registrations pending admin verification.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-yellow-50/60 border border-yellow-200 rounded-lg p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-yellow-800 uppercase tracking-wider">Total Pending</p>
            <p className="text-3xl font-bold text-yellow-700 mt-1">{totalPending}</p>
          </div>
          <Clock className="w-10 h-10 text-yellow-500 opacity-30" />
        </div>

        <div className="bg-purple-50/60 border border-purple-200 rounded-lg p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-purple-800 uppercase tracking-wider">Employer Signups</p>
            <p className="text-3xl font-bold text-purple-700 mt-1">{employerPending}</p>
          </div>
          <Briefcase className="w-10 h-10 text-purple-500 opacity-30" />
        </div>

        <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-800 uppercase tracking-wider">Other Roles</p>
            <p className="text-3xl font-bold text-blue-700 mt-1">{otherPending}</p>
          </div>
          <User className="w-10 h-10 text-blue-500 opacity-30" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap gap-1.5 bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button
            onClick={() => {
              setFilterRole("all");
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              filterRole === "all"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All Pending ({totalPending})
          </button>
          <button
            onClick={() => {
              setFilterRole("employer");
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              filterRole === "employer"
                ? "bg-white text-purple-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Employers ({employerPending})
          </button>
          <button
            onClick={() => {
              setFilterRole("job_seeker");
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              filterRole === "job_seeker"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Job Seekers
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <Clock className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
            <p className="text-sm">Loading pending registrations...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <p className="text-sm">{error}</p>
            <button
              onClick={fetchPendingUsers}
              className="mt-3 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium"
            >
              Retry
            </button>
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CheckCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="font-medium text-gray-700">No pending approvals at this time</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery
                ? "Try clearing your search query"
                : "All registration requests have been processed"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5">Requested Role</th>
                    <th className="px-6 py-3.5">Phone</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Registered</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {user.name || "Unnamed"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span>{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {user.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{user.phone}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {user.department || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => openActionModal(user, "approve")}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-sm transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openActionModal(user, "reject")}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded shadow-sm transition"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200 text-xs">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                >
                  Previous
                </button>
                <span className="text-gray-600 font-medium">
                  Page {page} of {totalPages} ({filteredUsers.length} total)
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Modal (Approve / Reject) */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              {actionType === "approve" ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  Approve Registration
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-600" />
                  Reject Registration
                </>
              )}
            </h2>
            <p className="text-gray-600 text-xs sm:text-sm mb-4">
              {actionType === "approve" ? (
                <>
                  Are you sure you want to approve <strong>{selectedUser.name}</strong> ({selectedUser.email})?
                  This will create an active account with the role of <strong>{selectedUser.role || "job_seeker"}</strong>.
                </>
              ) : (
                <>
                  Are you sure you want to reject <strong>{selectedUser.name}</strong> ({selectedUser.email})?
                  This registration request will be permanently removed.
                </>
              )}
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Admin Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter internal notes or reasons..."
                className="w-full p-2.5 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows="3"
              />
            </div>

            <div className="flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={processing}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-xs sm:text-sm font-medium rounded-md hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModalSubmit}
                disabled={processing}
                className={`px-4 py-2 text-white text-xs sm:text-sm font-semibold rounded-md shadow-sm transition ${
                  actionType === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                } disabled:opacity-50`}
              >
                {processing ? "Processing..." : actionType === "approve" ? "Confirm Approval" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
