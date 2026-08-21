import { getStoredAccessToken, getAuthHeaders } from '../../services/apiClient';

const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/admin-api?path=`

// Helper to handle fetch calls with auth token
const fetchWithAuth = async(endpoint, options = {}) => {
    const token = getStoredAccessToken();
    const defaultHeaders = getAuthHeaders({
        ...(token && { Authorization: `Bearer ${token}` }),
    });

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        })

        if (!response.ok) {
            let errorMessage = "Failed to fetch"
            try {
                const error = await response.json()
                errorMessage = error.error || `Server error: ${response.status}`
            } catch {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`
            }
            console.error(`[API ERROR] ${endpoint}:`, errorMessage)
            throw new Error(errorMessage)
        }

        return await response.json()
    } catch (error) {
        if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
            console.error(`[NETWORK ERROR] ${endpoint}: Cannot connect to server at ${API_BASE_URL}`)
            throw new Error(`Cannot connect to server. Make sure the backend is running at ${API_BASE_URL}`)
        }
        console.error(`[API ERROR] ${endpoint}:`, error.message)
        throw error
    }
}

// NOTE: The old loginAdmin() helper (calling admin-api's admin/auth/login route)
// was removed. That route issued a fake base64 token via btoa(), not a real
// Supabase JWT, and was unused by the app — real admin auth goes through the
// main /login edge function (see Login.jsx), which returns a verified Supabase
// session token that requireAuth() on the backend actually validates.

export const createAdmin = async(adminData) => {
    return fetchWithAuth("/api/admin/auth/create", {
        method: "POST",
        body: JSON.stringify(adminData),
    })
}

export const canCreateAdmin = async() => {
    const token = getStoredAccessToken();
    const res = await fetch(`${API_BASE_URL}/api/admin/auth/can-create`, {
        method: "GET",
        headers: getAuthHeaders({
            ...(token && { Authorization: `Bearer ${token}` }),
        }),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to check admin creation permission")
    }

    return res.json()
}

// Dashboard API calls
export const getDashboardStats = async() => {
    const token = getStoredAccessToken();
    const response = await fetch(`${API_BASE_URL}/api/admin/dashboard/stats`, {
        headers: getAuthHeaders({
            ...(token && { Authorization: `Bearer ${token}` }),
        })
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return await response.json();
};

// Users API calls
export const getUsers = async(page = 1, limit = 10, userType = "", q = "") => {
    const params = new URLSearchParams({
        page,
        limit,
        ...(userType && { userType }),
        ...(q && { q }),
    })
    return fetchWithAuth(`/api/admin/users?${params}`)
}

export const getUserDetails = async(userId) => {
    return fetchWithAuth(`/api/admin/users/${userId}`)
}

export const deleteUser = async(userId) => {
    return fetchWithAuth(`/api/admin/users/${userId}`, {
        method: "DELETE",
    })
}

// Jobs API calls
export const getJobs = async({ page = 1, limit = 10, employment_type = "", q = "" }) => {
    const params = new URLSearchParams({
        page,
        limit,
        ...(employment_type && { employment_type }),
        ...(q && { q }),
    })
    return fetchWithAuth(`/api/admin/jobs?${params}`)
}

export const getJobDetails = async(jobId) => {
    return fetchWithAuth(`/api/admin/jobs/${jobId}`)
}

export const deleteJob = async(jobId) => {
    return fetchWithAuth(`/api/admin/jobs/${jobId}`, {
        method: "DELETE",
    })
}

export const updateJobStatus = async(jobId, status) => {
    return fetchWithAuth(`/api/admin/jobs/${jobId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    })
}

// Admin Management APIs
export const getAdminList = async() => {
    return fetchWithAuth("/api/admin/auth/list")
}

export const toggleCreatePermission = async(adminId) => {
    return fetchWithAuth(`/api/admin/auth/${adminId}/toggle-create`, {
        method: "PATCH",
    })
}

export const toggleRevokePermission = async(adminId) => {
    return fetchWithAuth(`/api/admin/auth/${adminId}/toggle-revoke`, {
        method: "PATCH",
    })
}

export const deleteAdmin = async(adminId) => {
    return fetchWithAuth(`/api/admin/auth/${adminId}`, {
        method: "DELETE",
    })
}

export const restoreAdmin = async(adminId) => {
    console.log("[v0] Restoring admin:", adminId)
    return fetchWithAuth(`/api/admin/auth/${adminId}/restore`, {
        method: "PATCH",
        body: JSON.stringify({}),
    })
}

// Employer / Pending User Approvals APIs
export const getPendingApprovals = async() => {
    return fetchWithAuth("/api/admin/employer-approvals")
}

export const approvePendingUser = async(id, notes = "") => {
    return fetchWithAuth("/api/admin/employer-approvals/approve", {
        method: "POST",
        body: JSON.stringify({ id, notes }),
    })
}

export const rejectPendingUser = async(id, notes = "") => {
    return fetchWithAuth("/api/admin/employer-approvals/reject", {
        method: "POST",
        body: JSON.stringify({ id, notes }),
    })
}