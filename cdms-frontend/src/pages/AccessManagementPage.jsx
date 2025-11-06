import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth.jsx";
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  Undo2,
} from "lucide-react";

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';

const AccessManagementPage = ({ user }) => {
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Check if user is admin
  const isAdmin = authUser?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, authUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch pending registrations
      const pendingRes = await fetch(
        `${API_URL}/pending-registrations?adminEmail=${authUser.email}`
      );
      const pendingData = await pendingRes.json();

      // Fetch approved users
      const approvedRes = await fetch(
        `${API_URL}/approved-users?adminEmail=${authUser.email}`
      );
      const approvedData = await approvedRes.json();

      if (pendingData.success) {
        setPendingUsers(pendingData.pending || []);
      }

      if (approvedData.success) {
        setApprovedUsers(approvedData.users || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (email) => {
    try {
      setActionLoading(email);
      const response = await fetch(`${API_URL}/approve-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          adminEmail: authUser.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ ${data.message}`);
        fetchData(); // Refresh data
      } else {
        alert(`❌ ${data.error || 'Approval failed'}`);
      }
    } catch (err) {
      console.error('Approval error:', err);
      alert('❌ Failed to approve user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    try {
      setActionLoading(selectedUser.email);
      const response = await fetch(`${API_URL}/reject-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedUser.email,
          adminEmail: authUser.email,
          reason: rejectReason,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ ${data.message}`);
        setShowRejectModal(false);
        setRejectReason("");
        fetchData();
      } else {
        alert(`❌ ${data.error || 'Rejection failed'}`);
      }
    } catch (err) {
      console.error('Rejection error:', err);
      alert('❌ Failed to reject user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async () => {
    try {
      setActionLoading(selectedUser.email);
      const response = await fetch(`${API_URL}/revoke-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedUser.email,
          adminEmail: authUser.email,
          reason: rejectReason,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ ${data.message}`);
        setShowRevokeModal(false);
        setRejectReason("");
        fetchData();
      } else {
        alert(`❌ ${data.error || 'Revoke failed'}`);
      }
    } catch (err) {
      console.error('Revoke error:', err);
      alert('❌ Failed to revoke access');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (email) => {
    if (!confirm('Are you sure you want to restore access for this user?')) {
      return;
    }

    try {
      setActionLoading(email);
      const response = await fetch(`${API_URL}/restore-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          adminEmail: authUser.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ ${data.message}`);
        fetchData();
      } else {
        alert(`❌ ${data.error || 'Restore failed'}`);
      }
    } catch (err) {
      console.error('Restore error:', err);
      alert('❌ Failed to restore access');
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700';
      case 'district_police':
        return 'bg-blue-100 text-blue-700';
      case 'investigator':
        return 'bg-green-100 text-green-700';
      case 'forensics_officer':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            Revoked
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            Unknown
          </span>
        );
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            Only administrators can access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Users className="w-8 h-8 mr-3 text-blue-600" />
            Access Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage user registrations and access control
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center"
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {pendingUsers.length}
              </p>
            </div>
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {approvedUsers.filter((u) => u.status === 'active' || !u.status).length}
              </p>
            </div>
            <UserCheck className="w-10 h-10 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Revoked Access</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {approvedUsers.filter((u) => u.status === 'revoked').length}
              </p>
            </div>
            <UserX className="w-10 h-10 text-red-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("pending")}
              className={`py-4 font-semibold border-b-2 transition ${
                activeTab === "pending"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Clock className="w-5 h-5 inline mr-2" />
              Pending Approvals ({pendingUsers.length})
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`py-4 font-semibold border-b-2 transition ${
                activeTab === "users"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users className="w-5 h-5 inline mr-2" />
              All Users ({approvedUsers.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-gray-600 mt-2">Loading...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <AlertTriangle className="w-5 h-5 inline mr-2" />
              {error}
            </div>
          ) : (
            <>
              {/* Pending Approvals Tab */}
              {activeTab === "pending" && (
                <div className="space-y-4">
                  {pendingUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">
                        No pending approvals
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        All registration requests have been processed
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {pendingUsers.map((u) => (
                        <div
                          key={u.email}
                          className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-bold text-gray-900">
                                  {u.username}
                                </h4>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(
                                    u.role
                                  )}`}
                                >
                                  {u.role.replace(/_/g, ' ').toUpperCase()}
                                </span>
                                {getStatusBadge('pending')}
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                📧 {u.email}
                              </p>
                              <p className="text-sm text-gray-600">
                                🏢 Organization {u.org}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApprove(u.email)}
                                disabled={actionLoading === u.email}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center disabled:opacity-50"
                              >
                                {actionLoading === u.email ? (
                                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setShowRejectModal(true);
                                }}
                                disabled={actionLoading === u.email}
                                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium flex items-center disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* All Users Tab */}
              {activeTab === "users" && (
                <div className="space-y-4">
                  {approvedUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No users found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Username
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Email
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Role
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Organization
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Status
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {approvedUsers.map((u) => (
                            <tr
                              key={u.email}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="py-4 px-4 font-medium text-gray-900">
                                {u.username}
                              </td>
                              <td className="py-4 px-4 text-sm text-gray-600">
                                {u.email}
                              </td>
                              <td className="py-4 px-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(
                                    u.role
                                  )}`}
                                >
                                  {u.role.replace(/_/g, ' ').toUpperCase()}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-sm text-gray-600">
                                {u.org}
                              </td>
                              <td className="py-4 px-4">
                                {getStatusBadge(u.status || 'active')}
                              </td>
                              <td className="py-4 px-4">
                                {u.email === authUser.email ? (
                                  <span className="text-sm text-gray-400">
                                    (You)
                                  </span>
                                ) : u.status === 'revoked' ? (
                                  <button
                                    onClick={() => handleRestore(u.email)}
                                    disabled={actionLoading === u.email}
                                    className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center disabled:opacity-50"
                                  >
                                    {actionLoading === u.email ? (
                                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                                    ) : (
                                      <Undo2 className="w-4 h-4 mr-1" />
                                    )}
                                    Restore
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedUser(u);
                                      setShowRevokeModal(true);
                                    }}
                                    disabled={actionLoading === u.email}
                                    className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center disabled:opacity-50"
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Revoke
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Reject Registration
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to reject <strong>{selectedUser?.username}</strong>'s registration?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows="3"
                placeholder="Enter reason for rejection..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                disabled={actionLoading}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Revoke User Access
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to revoke access for <strong>{selectedUser?.username}</strong>? They will no longer be able to log in.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows="3"
                placeholder="Enter reason for revoking access..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleRevoke}
                disabled={actionLoading}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
              >
                Revoke Access
              </button>
              <button
                onClick={() => {
                  setShowRevokeModal(false);
                  setRejectReason("");
                }}
                disabled={actionLoading}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessManagementPage;
