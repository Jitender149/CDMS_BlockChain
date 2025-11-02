import React, { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Download,
  Upload,
  FileText,
  Database,
  Eye,
  Loader2,
  RefreshCcw,
  Search
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';

const AuditPage = () => {
  const { user: authUser } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterAction, setFilterAction] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchAuditTrail();
  }, [refreshKey]);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/audit/trail`, {
        headers: {
          'Authorization': `Bearer ${authUser.email}:${authUser.org}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit trail');
      }

      const data = await response.json();
      setAuditLogs(data.audit_trail || []);
    } catch (err) {
      console.error('Error fetching audit trail:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action?.toUpperCase()) {
      case 'UPLOAD':
      case 'CREATE':
        return <Upload className="w-5 h-5" />;
      case 'DOWNLOAD':
        return <Download className="w-5 h-5" />;
      case 'READ':
      case 'VIEW':
        return <Eye className="w-5 h-5" />;
      case 'UPDATE':
        return <FileText className="w-5 h-5" />;
      case 'DELETE':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getActionColor = (action) => {
    switch (action?.toUpperCase()) {
      case 'UPLOAD':
      case 'CREATE':
        return 'bg-green-100 text-green-600';
      case 'DOWNLOAD':
        return 'bg-blue-100 text-blue-600';
      case 'READ':
      case 'VIEW':
        return 'bg-indigo-100 text-indigo-600';
      case 'UPDATE':
        return 'bg-yellow-100 text-yellow-600';
      case 'DELETE':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesAction = filterAction === 'all' || log.action?.toUpperCase() === filterAction.toUpperCase();
    const matchesSearch = !searchTerm || 
      log.recordId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesAction && matchesSearch;
  });

  const actionCounts = {
    total: auditLogs.length,
    upload: auditLogs.filter(l => ['UPLOAD', 'CREATE'].includes(l.action?.toUpperCase())).length,
    download: auditLogs.filter(l => l.action?.toUpperCase() === 'DOWNLOAD').length,
    view: auditLogs.filter(l => ['READ', 'VIEW'].includes(l.action?.toUpperCase())).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Immutable Audit Trail
          </h1>
          <p className="text-gray-600 mt-1">Blockchain-verified activity log from Hyperledger Fabric</p>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{actionCounts.total}</p>
            </div>
            <Database className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Uploads</p>
              <p className="text-2xl font-bold text-gray-900">{actionCounts.upload}</p>
            </div>
            <Upload className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Downloads</p>
              <p className="text-2xl font-bold text-gray-900">{actionCounts.download}</p>
            </div>
            <Download className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Views</p>
              <p className="text-2xl font-bold text-gray-900">{actionCounts.view}</p>
            </div>
            <Eye className="w-8 h-8 text-indigo-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <Activity className="w-6 h-6 text-blue-600" />
            <span className="text-lg font-semibold text-gray-900">
              All Events
            </span>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {filteredLogs.length}
            </span>
          </div>
          
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search records, users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select 
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              <option value="all">All Actions</option>
              <option value="upload">Uploads</option>
              <option value="download">Downloads</option>
              <option value="read">Views</option>
              <option value="update">Updates</option>
              <option value="delete">Deletes</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="ml-3 text-gray-600">Loading audit trail from blockchain...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800 mb-1">Error Loading Audit Trail</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Audit Logs */}
        {!loading && !error && (
          <>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No audit logs found</p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchTerm || filterAction !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Upload some files to see audit trail'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition hover:border-blue-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2 flex-wrap">
                            <span className="font-bold text-gray-900">
                              {log.action || 'UNKNOWN'}
                            </span>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-600 font-mono">
                              {log.actor || 'System'}
                            </span>
                          </div>
                          {log.recordId && (
                            <div className="text-sm text-gray-600 mb-2">
                              Record: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{log.recordId}</span>
                            </div>
                          )}
                          {log.details && (
                            <div className="text-sm text-gray-700 mb-2 bg-gray-50 p-2 rounded">
                              {log.details}
                            </div>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-gray-500 flex-wrap">
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                            {log.txId && (
                              <>
                                <span>•</span>
                                <span className="font-mono">TX: {log.txId.substring(0, 16)}...</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start">
          <Shield className="w-6 h-6 text-blue-600 mr-3 mt-1" />
          <div>
            <h3 className="font-bold text-gray-900 mb-2">
              Blockchain Verification
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              All audit events are immutably stored on Hyperledger Fabric. Each
              entry is cryptographically signed and linked to previous
              transactions, ensuring complete transparency and tamper-proof
              records.
            </p>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-gray-700">Immutable</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-gray-700">Timestamped</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-gray-700">Cryptographically Signed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditPage;
