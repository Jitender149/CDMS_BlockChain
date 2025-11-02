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
      
      const apiUrl = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';
      // Use Authorization header for authentication (userId and org are extracted from it)
      // Also pass blockSize parameter to control transactions per block (default: 5)
      const authHeader = `Bearer ${authUser.email}:${authUser.org}`;
      const params = new URLSearchParams({
        limit: limit.toString(),
        blockSize: '5' // Transactions per block (configurable for testing)
      });
      
      const response = await fetch(`${apiUrl}/block-history?${params}`, {
        headers: {
          'Authorization': authHeader
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      // Backend now returns grouped blocks for testing (no peer endorsements required)
      // Store both blocks and transactions for different display modes
      if (data.blocks && data.blocks.length > 0) {
        setHistory(data.blocks); // Backend returns pre-grouped blocks
      } else if (data.transactions && data.transactions.length > 0) {
        // Fallback: group transactions on frontend (legacy support)
        setHistory(groupIntoBlocks(data.transactions));
      } else {
        // Last resort: use history array and group it
        setHistory(groupIntoBlocks(data.history || []));
      }
    } catch (err) {
      console.error("Error fetching block history:", err);
      setError(err.message || "Failed to load block history");
    } finally {
      setLoading(false);
    }
  };

  // Group transactions into blocks (simulate blockchain batching)
  // Only used if backend doesn't return blocks (legacy support)
  const groupIntoBlocks = (transactions) => {
    const TRANSACTIONS_PER_BLOCK = 5; // Configure batching size
    const blocks = [];
    
    for (let i = 0; i < transactions.length; i += TRANSACTIONS_PER_BLOCK) {
      const blockTransactions = transactions.slice(i, i + TRANSACTIONS_PER_BLOCK);
      const blockNumber = Math.floor(i / TRANSACTIONS_PER_BLOCK) + 1;
      
      // Calculate block hash (simplified - in real scenario this would be cryptographic)
      const blockHash = `0x${blockNumber.toString(16).padStart(8, '0')}${Math.random().toString(16).slice(2, 10)}`;
      
      blocks.push({
        blockNumber,
        blockHash,
        timestamp: blockTransactions[0]?.timestamp || new Date().toISOString(),
        transactionCount: blockTransactions.length,
        transactions: blockTransactions
      });
    }
    
    return blocks;
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

  // Flatten blocks to get all transactions for filtering
  const allTransactions = history.flatMap(block => 
    block.transactions ? block.transactions.map(tx => ({ ...tx, blockNumber: block.blockNumber })) : []
  );

  // Filter transactions
  const filteredTransactions = allTransactions.filter((item) => {
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

  // Filter blocks - include block if any transaction matches
  const filteredHistory = history.filter(block => {
    if (!block.transactions) return false;
    return block.transactions.some(tx => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          tx.txId?.toLowerCase().includes(query) ||
          tx.recordId?.toLowerCase().includes(query) ||
          tx.value?.case_id?.toLowerCase().includes(query) ||
          tx.value?.record_id?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      // Delete filter
      if (filterDelete === "created") return !tx.isDelete;
      if (filterDelete === "deleted") return tx.isDelete;
      return true;
    });
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
              <p className="text-gray-600 text-sm">Total Blocks</p>
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
              <p className="text-gray-600 text-sm">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {allTransactions.length}
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
                {allTransactions.filter((h) => !h.isDelete).length}
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
                {allTransactions.filter((h) => h.isDelete).length}
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

      {/* Blockchain Blocks View */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Blocks className="w-6 h-6 mr-2 text-blue-600" />
          Blockchain Blocks
          <span className="ml-3 text-sm text-gray-500">(~5 transactions per block)</span>
        </h2>
        
        {filteredHistory.map((block) => (
          <div key={block.blockNumber} className="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-blue-500">
            {/* Block Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg">
                    Block #{block.blockNumber}
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold">Hash:</span>{" "}
                    <code className="bg-white px-2 py-1 rounded">{block.blockHash}</code>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatTimestamp(block.timestamp)}
                  </div>
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                    {block.transactionCount} {block.transactionCount === 1 ? 'Transaction' : 'Transactions'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Block Transactions */}
            <div className="divide-y divide-gray-200">
              {block.transactions.map((item, txIndex) => (
                <div key={txIndex} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        {item.isDelete ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                        <span className={`font-semibold ${item.isDelete ? 'text-red-600' : 'text-green-600'}`}>
                          {item.isDelete ? 'DELETED' : 'CREATED'}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-sm text-gray-600">TX #{txIndex + 1}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div>
                          <span className="text-gray-600">Record ID:</span>{" "}
                          <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs">
                            {item.recordId || item.value?.record_id || "N/A"}
                          </code>
                        </div>
                        <div>
                          <span className="text-gray-600">Case ID:</span>{" "}
                          <span className="font-medium">{item.value?.case_id || "N/A"}</span>
                        </div>
                        {item.value?.filename && (
                          <div>
                            <span className="text-gray-600">Filename:</span>{" "}
                            <span className="font-medium">{item.value.filename}</span>
                          </div>
                        )}
                        {item.value?.file_hash && (
                          <div>
                            <span className="text-gray-600">File Hash:</span>{" "}
                            <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs">
                              {item.value.file_hash.substring(0, 16)}...
                            </code>
                          </div>
                        )}
                        {item.value?.uploader_id && (
                          <div>
                            <span className="text-gray-600">Uploader:</span>{" "}
                            <span className="font-medium">{item.value.uploader_id}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">Type:</span>{" "}
                          <span className="font-medium">{item.value?.record_type || "N/A"}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500 pt-1">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTimestamp(item.timestamp)}
                        </div>
                        <span>•</span>
                        <div>
                          TX ID: <code className="font-mono">{formatTxId(item.txId)}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* History Table (Legacy View) */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Transaction List View</h3>
        </div>
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
              {filteredTransactions.length === 0 ? (
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
                filteredTransactions.map((item, index) => (
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

