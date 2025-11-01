import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth.jsx";
import { blockHistoryService } from "../services/blockHistoryService";
import {
  Blocks,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";

const BlockHistoryPage = ({ user }) => {
  const { user: authUser } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(100);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDelete, setFilterDelete] = useState("all");

  useEffect(() => {
    fetchBlockHistory();
  }, [limit, authUser]);

  const fetchBlockHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!authUser) {
        throw new Error("User not authenticated");
      }

      // Build query params for API (authenticateUser middleware expects userId and org)
      // The userId must match what's in the Fabric wallet (AdminOrg1, AdminOrg2, or email-based)
      // CRITICAL: Must use the actual wallet identity, not the email!
      
      const userRole = (authUser.role || '').toLowerCase();
      const userOrg = authUser.org || "A"; // Default to A if not specified
      
      // Determine the correct walletId
      // Priority: 1) walletId from login 2) calculate from role 3) calculate from email
      let userId;
      
      if (authUser.walletId) {
        // Best: Use walletId from login response (guaranteed to be correct)
        userId = authUser.walletId;
      } else if (userRole === 'admin') {
        // For admin users: AdminOrg1 (org A) or AdminOrg2 (org B)
        // This matches what the backend calculates during login
        userId = userOrg === 'A' ? 'AdminOrg1' : 'AdminOrg2';
      } else if (authUser.email) {
        // For regular users: convert email to wallet format
        // example@gmail.com -> example_gmail_com
        userId = authUser.email.toLowerCase().replace(/[@.]/g, '_');
      } else {
        // Last resort fallback (should not happen)
        userId = authUser.userId || authUser.email || 'AdminOrg1';
      }
      
      console.log('[BlockHistory] Authentication details:', { 
        email: authUser.email, 
        role: authUser.role,
        roleLower: userRole,
        org: userOrg,
        walletIdFromAuth: authUser.walletId,
        calculatedWalletId: userId,
        usingIdentity: userId
      });
      
      const params = new URLSearchParams({
        userId: userId,
        org: userOrg,
        limit: limit.toString(),
      });

      const apiUrl = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/block-history?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error("Error fetching block history:", err);
      setError(err.message || "Failed to load block history");
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatTxId = (txId) => {
    if (!txId) return "N/A";
    if (txId.length <= 16) return txId;
    return `${txId.substring(0, 8)}...${txId.substring(txId.length - 8)}`;
  };

  const filteredHistory = history.filter((item) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        item.txId?.toLowerCase().includes(query) ||
        item.recordId?.toLowerCase().includes(query) ||
        item.value?.case_id?.toLowerCase().includes(query) ||
        item.value?.record_id?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Delete filter
    if (filterDelete === "created") return !item.isDelete;
    if (filterDelete === "deleted") return item.isDelete;

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading block history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center text-red-800">
          <XCircle className="w-5 h-5 mr-2" />
          <h3 className="font-semibold">Error Loading Block History</h3>
        </div>
        <p className="text-red-600 mt-2">{error}</p>
        <button
          onClick={fetchBlockHistory}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Blocks className="w-8 h-8 mr-3 text-blue-600" />
            Block History
          </h1>
          <p className="text-gray-600 mt-1">
            View transaction history across the blockchain
          </p>
        </div>
        <button
          onClick={fetchBlockHistory}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {history.length}
              </p>
            </div>
            <Blocks className="w-10 h-10 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Filtered Results</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {filteredHistory.length}
              </p>
            </div>
            <FileText className="w-10 h-10 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Created Records</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {history.filter((h) => !h.isDelete).length}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Deleted Records</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {history.filter((h) => h.isDelete).length}
              </p>
            </div>
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by Transaction ID, Record ID, or Case ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterDelete}
              onChange={(e) => setFilterDelete(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Transactions</option>
              <option value="created">Created Only</option>
              <option value="deleted">Deleted Only</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-600 text-sm">Limit:</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Record ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Case ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-semibold">No block history found</p>
                    <p className="text-sm mt-2">
                      {searchQuery || filterDelete !== "all"
                        ? "Try adjusting your filters"
                        : "No transactions have been recorded yet"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item, index) => (
                  <tr
                    key={item.txId || index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <code className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {formatTxId(item.txId)}
                        </code>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.recordId || item.value?.record_id || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.value?.case_id || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.value?.record_type || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.value?.uploader_org === "A"
                        ? "District Police A"
                        : item.value?.uploader_org === "B"
                        ? "District Police B"
                        : item.value?.uploader_org || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.isDelete ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          <XCircle className="w-4 h-4 mr-1" />
                          Deleted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Created
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        {formatTimestamp(item.timestamp)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BlockHistoryPage;

