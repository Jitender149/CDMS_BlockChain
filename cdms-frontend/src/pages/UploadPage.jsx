import React, { useState, useEffect } from "react";
import { Upload, Lock, Shield, CheckCircle, AlertCircle, FileText, Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';

const RECENT_UPLOADS_KEY = 'cdms_recent_uploads';

const UploadPage = () => {
  const { user: authUser } = useAuth();
  
  const [formData, setFormData] = useState({
    caseId: "",
    recordType: "Evidence",
    description: "",
    file: null,
  });

  const [uploadStatus, setUploadStatus] = useState({
    uploading: false,
    success: false,
    error: null,
    progress: 0,
    recordId: null,
    fileHash: null,
    minioUrl: null
  });

  // Load recent uploads from localStorage on mount
  const [recentUploads, setRecentUploads] = useState(() => {
    try {
      const stored = localStorage.getItem(RECENT_UPLOADS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save recent uploads to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(RECENT_UPLOADS_KEY, JSON.stringify(recentUploads));
    } catch (err) {
      console.warn('Failed to save recent uploads to localStorage:', err);
    }
  }, [recentUploads]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        setUploadStatus({
          ...uploadStatus,
          error: 'File size exceeds 100MB limit'
        });
        return;
      }
      setFormData({ ...formData, file });
      setUploadStatus({ ...uploadStatus, error: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (!authUser) {
      setUploadStatus({
        ...uploadStatus,
        error: 'You must be logged in to upload files. Please log in and try again.'
      });
      return;
    }
    
    if (!formData.file) {
      setUploadStatus({
        ...uploadStatus,
        error: 'Please select a file to upload'
      });
      return;
    }

    if (!formData.caseId || !formData.description) {
      setUploadStatus({
        ...uploadStatus,
        error: 'Please fill in all required fields'
      });
      return;
    }

    setUploadStatus({
      uploading: true,
      success: false,
      error: null,
      progress: 10,
      recordId: null,
      fileHash: null,
      minioUrl: null
    });

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', formData.file);
      formDataToSend.append('case_id', formData.caseId);
      formDataToSend.append('record_type', formData.recordType);
      formDataToSend.append('description', formData.description);
      
      // userId and org are automatically determined from logged-in user via Authorization header
      // No need to send them in FormData - backend will extract from Authorization header

      setUploadStatus(prev => ({ ...prev, progress: 30 }));

      // Send Authorization header with email:org format
      // Backend will automatically determine userId from email via approved_users.json
      const authHeader = `Bearer ${authUser.email}:${authUser.org}`;

      console.log('[UPLOAD] Sending request to:', `${API_URL}/record/upload`);
      console.log('[UPLOAD] Auth header:', authHeader);
      console.log('[UPLOAD] File:', formData.file.name, formData.file.size, 'bytes');

      const response = await fetch(`${API_URL}/record/upload`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader
          // DO NOT set Content-Type for FormData - browser will set it automatically with boundary
        },
        body: formDataToSend
      });

      setUploadStatus(prev => ({ ...prev, progress: 80 }));

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      setUploadStatus({
        uploading: false,
        success: true,
        error: null,
        progress: 100,
        recordId: result.recordId,
        fileHash: result.fileHash,
        minioUrl: result.minioUrl,
        size: result.size,
        blockchainRecorded: result.blockchainRecorded !== false // Default to true if not specified
      });

      // Add to recent uploads
      setRecentUploads([
        {
          recordId: result.recordId,
          filename: formData.file.name,
          caseId: formData.caseId,
          recordType: formData.recordType,
          timestamp: new Date().toISOString(),
          fileHash: result.fileHash
        },
        ...recentUploads.slice(0, 4) // Keep only last 5
      ]);

      // Reset form
      setTimeout(() => {
        setFormData({
          caseId: "",
          recordType: "Evidence",
          description: "",
          file: null,
        });
        setUploadStatus({
          uploading: false,
          success: false,
          error: null,
          progress: 0,
          recordId: null,
          fileHash: null,
          minioUrl: null
        });
      }, 5000);

    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Provide more helpful error messages
      let errorMessage = error.message || 'Failed to upload file';
      
      if (error.message === 'Failed to fetch') {
        errorMessage = 'Network error: Could not connect to server. Please check if the backend is running and accessible.';
      } else if (error.message.includes('CORS')) {
        errorMessage = 'CORS error: Cross-origin request blocked. Please check backend CORS configuration.';
      } else if (error.message.includes('NetworkError')) {
        errorMessage = 'Network error: Please check your internet connection and ensure the backend server is running.';
      }
      
      setUploadStatus({
        uploading: false,
        success: false,
        error: errorMessage,
        progress: 0,
        recordId: null,
        fileHash: null,
        minioUrl: null
      });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Evidence</h1>
        <p className="text-gray-600 mt-1">
          Upload files to MinIO and record on blockchain with cryptographic hash
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-md p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Case ID *
                  </label>
                  <input
                    type="text"
                    value={formData.caseId}
                    onChange={(e) =>
                      setFormData({ ...formData, caseId: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="CASE-2024-001"
                    required
                    disabled={uploadStatus.uploading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Record Type *
                  </label>
                  <select
                    value={formData.recordType}
                    onChange={(e) =>
                      setFormData({ ...formData, recordType: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={uploadStatus.uploading}
                  >
                    <option value="Evidence">Evidence</option>
                    <option value="FIR">FIR - First Information Report</option>
                    <option value="Report">Investigation Report</option>
                    <option value="Forensic">Forensic Analysis</option>
                    <option value="Document">Legal Document</option>
                    <option value="Media">Media (Photo/Video)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter detailed description of the evidence/document..."
                  required
                  disabled={uploadStatus.uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File *
                </label>
                <div className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                  uploadStatus.uploading ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-blue-500'
                }`}>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    disabled={uploadStatus.uploading}
                  />
                  <label htmlFor="file-upload" className={uploadStatus.uploading ? 'cursor-not-allowed' : 'cursor-pointer'}>
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      {formData.file
                        ? `📎 ${formData.file.name} (${formatFileSize(formData.file.size)})`
                        : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-sm text-gray-500">
                      PDF, Images, Videos, Documents (Max 100MB)
                    </p>
                  </label>
                </div>
              </div>

              {/* Upload Progress */}
              {uploadStatus.uploading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Loader2 className="w-5 h-5 text-blue-600 mr-2 animate-spin" />
                    <span className="text-sm font-medium text-blue-800">
                      Uploading to MinIO and recording on blockchain...
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadStatus.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {uploadStatus.success && (
                <div className={`border rounded-lg p-4 ${uploadStatus.blockchainRecorded === false ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-start">
                    <CheckCircle className={`w-5 h-5 mr-3 mt-0.5 ${uploadStatus.blockchainRecorded === false ? 'text-yellow-600' : 'text-green-600'}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-semibold mb-2 ${uploadStatus.blockchainRecorded === false ? 'text-yellow-800' : 'text-green-800'}`}>
                        ✅ Upload Successful!
                      </p>
                      <div className={`space-y-1 text-xs ${uploadStatus.blockchainRecorded === false ? 'text-yellow-700' : 'text-green-700'}`}>
                        <p><strong>Record ID:</strong> {uploadStatus.recordId}</p>
                        <p><strong>File Hash (SHA-256):</strong> <code className={`px-1 rounded ${uploadStatus.blockchainRecorded === false ? 'bg-yellow-100' : 'bg-green-100'}`}>{uploadStatus.fileHash?.substring(0, 32)}...</code></p>
                        <p><strong>Size:</strong> {formatFileSize(uploadStatus.size)}</p>
                        {uploadStatus.blockchainRecorded === false ? (
                          <p className="text-yellow-700 mt-2">
                            ⚠️ Stored on MinIO (Blockchain recording skipped - peers not required)
                          </p>
                        ) : (
                          <p className="text-green-600 mt-2">✓ Stored on MinIO ✓ Recorded on Blockchain</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {uploadStatus.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-semibold mb-1">Upload Failed</p>
                      <p>{uploadStatus.error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Shield className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Security & Integrity</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Files stored securely on MinIO object storage</li>
                      <li>SHA-256 hash calculated for integrity verification</li>
                      <li>Metadata and hash recorded immutably on Hyperledger Fabric</li>
                      <li>Access controlled by role-based permissions (RBAC)</li>
                      <li>All actions audited and timestamped on blockchain</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={uploadStatus.uploading || !formData.file}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploadStatus.uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      Upload to Blockchain
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      caseId: "",
                      recordType: "Evidence",
                      description: "",
                      file: null,
                    });
                    setUploadStatus({
                      uploading: false,
                      success: false,
                      error: null,
                      progress: 0,
                      recordId: null,
                      fileHash: null,
                      minioUrl: null
                    });
                  }}
                  disabled={uploadStatus.uploading}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Recent Uploads Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Recent Uploads
            </h2>
            {recentUploads.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No uploads yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentUploads.map((upload, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition">
                    <p className="text-sm font-medium text-gray-900 truncate mb-1">
                      {upload.filename}
                    </p>
                    <p className="text-xs text-gray-600 mb-1">
                      Case: {upload.caseId}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(upload.timestamp).toLocaleString()}
                    </p>
                    <div className="mt-2 flex items-center text-xs text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      On blockchain
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-md p-6 mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Upload Session</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">User:</span>
                <span className="font-medium text-gray-900">{authUser?.email?.split('@')[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Organization:</span>
                <span className="font-medium text-gray-900">Org {authUser?.org}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Role:</span>
                <span className="font-medium text-gray-900 capitalize">{authUser?.role?.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
