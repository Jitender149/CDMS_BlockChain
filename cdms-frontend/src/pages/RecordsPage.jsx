import React, { useState, useEffect } from "react";
import { Search, Upload, Eye, Download, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';

const RecordsPage = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, [authUser]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!authUser) {
        throw new Error("User not authenticated");
      }

      const authHeader = `Bearer ${authUser.email}:${authUser.org}`;
      const response = await fetch(`${API_URL}/records`, {
        headers: {
          'Authorization': authHeader
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setRecords(data.records || []);
    } catch (err) {
      console.error("Error fetching records:", err);
      setError(err.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (recordId) => {
    try {
      setDownloadingId(recordId);
      
      if (!authUser) {
        throw new Error("User not authenticated");
      }

      // Check if user has download permission
      const userRole = authUser.role?.toLowerCase();
      if (userRole === 'forensics_officer' || userRole === 'forensicofficer' || userRole === 'forensics') {
        alert('Permission denied: Forensics Officer role has view-only access. Download is not allowed.');
        setDownloadingId(null);
        return;
      }

      const authHeader = `Bearer ${authUser.email}:${authUser.org}`;
      const response = await fetch(`${API_URL}/record/${recordId}/download`, {
        headers: {
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Download failed: ${response.statusText}`);
      }

      // Get filename from Content-Disposition header or use recordId
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || recordId
        : recordId;

      // Get file as blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log(`✅ Successfully downloaded ${filename}`);
    } catch (err) {
      console.error("Download error:", err);
      alert(err.message || "Failed to download file");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = async (recordId) => {
    try {
      if (!authUser) {
        throw new Error("User not authenticated");
      }

      const authHeader = `Bearer ${authUser.email}:${authUser.org}`;
      const response = await fetch(`${API_URL}/record/${recordId}/metadata`, {
        headers: {
          'Authorization': authHeader
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch record metadata");
      }

      const metadata = await response.json();
      
      // Show metadata in a modal or alert for now (can be improved with a modal component)
      alert(`Record Details:\n\nRecord ID: ${metadata.record_id || recordId}\nCase ID: ${metadata.case_id || 'N/A'}\nType: ${metadata.record_type || 'N/A'}\nFilename: ${metadata.filename || 'N/A'}\nUploader: ${metadata.uploader_id || 'N/A'}\nOrganization: ${metadata.uploader_org || 'N/A'}\nCreated: ${metadata.created_at || 'N/A'}`);
    } catch (err) {
      console.error("View error:", err);
      alert(err.message || "Failed to view record details");
    }
  };

  const canDownload = () => {
    if (!authUser) return false;
    const userRole = authUser.role?.toLowerCase();
    // Forensics Officer cannot download (view-only)
    return !(userRole === 'forensics_officer' || userRole === 'forensicofficer' || userRole === 'forensics');
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = !searchQuery || 
      record.record_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.case_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.file_hash?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === "all" || 
      record.record_type?.toLowerCase() === filterType.toLowerCase();

    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading records...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center text-red-800">
          <AlertCircle className="w-5 h-5 mr-2" />
          <h3 className="font-semibold">Error Loading Records</h3>
        </div>
        <p className="text-red-600 mt-2">{error}</p>
        <button
          onClick={fetchRecords}
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
          <h1 className="text-3xl font-bold text-gray-900">
            Records Management
          </h1>
          <p className="text-gray-600 mt-1">
            Browse and manage criminal records
          </p>
        </div>
        <button 
          onClick={() => navigate('/upload')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center"
        >
          <Upload className="w-5 h-5 mr-2" />
          Upload New Record
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Records</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {records.length}
              </p>
            </div>
            <Eye className="w-10 h-10 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Filtered Results</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {filteredRecords.length}
              </p>
            </div>
            <Search className="w-10 h-10 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Download Permission</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {canDownload() ? "✅ Yes" : "❌ No"}
              </p>
            </div>
            <Download className={`w-10 h-10 ${canDownload() ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by Record ID, Case ID, Filename, or Hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="FIR">FIR</option>
            <option value="Evidence">Evidence</option>
            <option value="Report">Report</option>
            <option value="Forensic">Forensic</option>
            <option value="Document">Document</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Record ID
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Case ID
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Type
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Filename
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Organization
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Created
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-semibold">No records found</p>
                    <p className="text-sm mt-2">
                      {searchQuery || filterType !== "all"
                        ? "Try adjusting your filters"
                        : "No records have been uploaded yet"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr
                    key={record.record_id || record.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-4 px-4 font-mono text-sm">
                      {record.record_id || record.id || 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      {record.case_id || 'N/A'}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          record.record_type === "FIR"
                            ? "bg-blue-100 text-blue-700"
                            : record.record_type === "Evidence"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {record.record_type || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {record.filename || 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {record.uploader_org === "A" 
                        ? "A" 
                        : record.uploader_org === "B"
                        ? "B"
                        : record.uploader_org || 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {record.created_at 
                        ? new Date(record.created_at).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleView(record.record_id || record.id)}
                          className="p-2 hover:bg-blue-100 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        {canDownload() && (
                          <button
                            onClick={() => handleDownload(record.record_id || record.id)}
                            disabled={downloadingId === (record.record_id || record.id)}
                            className="p-2 hover:bg-green-100 rounded-lg transition disabled:opacity-50"
                            title="Download File"
                          >
                            {downloadingId === (record.record_id || record.id) ? (
                              <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4 text-green-600" />
                            )}
                          </button>
                        )}
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

export default RecordsPage;
