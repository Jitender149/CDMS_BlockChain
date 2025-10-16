import React from "react";
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
} from "lucide-react";

const AuditPage = ({ user }) => {
  const auditLogs = [
    {
      id: 1,
      action: "RECORD_UPLOADED",
      user: "Officer Smith",
      org: "District Police A",
      record: "FIR-2025-001",
      timestamp: "2025-10-15 09:23:45",
      txId: "0x7a3f...b2c1",
      status: "success",
    },
    {
      id: 2,
      action: "ACCESS_GRANTED",
      user: "Det. Johnson",
      org: "District Police A",
      record: "EV-2025-089",
      timestamp: "2025-10-15 09:45:12",
      txId: "0xc4e9...d8f2",
      status: "success",
    },
    {
      id: 3,
      action: "ACCESS_DENIED",
      user: "Unknown",
      org: "External",
      record: "SR-2025-045",
      timestamp: "2025-10-15 10:12:33",
      txId: "0xf1a2...e3b4",
      status: "denied",
    },
    {
      id: 4,
      action: "POLICY_UPDATED",
      user: "Admin Chen",
      org: "Central HQ",
      record: "Policy-123",
      timestamp: "2025-10-15 11:05:20",
      txId: "0xb8d3...c5a6",
      status: "success",
    },
    {
      id: 5,
      action: "KEY_ROTATED",
      user: "System",
      org: "KMS",
      record: "KEK-001",
      timestamp: "2025-10-15 12:00:00",
      txId: "0xa9f4...d7e8",
      status: "success",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Immutable Audit Trail
        </h1>
        <p className="text-gray-600 mt-1">Blockchain-verified activity log</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Activity className="w-6 h-6 text-blue-600" />
            <span className="text-lg font-semibold text-gray-900">
              All Events
            </span>
          </div>
          <div className="flex space-x-2">
            <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
              <option>All Actions</option>
              <option>Uploads</option>
              <option>Access Events</option>
              <option>Policy Changes</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div
                    className={`p-2 rounded-lg ${
                      log.status === "success"
                        ? "bg-green-100"
                        : log.status === "denied"
                        ? "bg-red-100"
                        : "bg-yellow-100"
                    }`}
                  >
                    {log.status === "success" ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : log.status === "denied" ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-bold text-gray-900">
                        {log.action}
                      </span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-600">{log.user}</span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-600">{log.org}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Record: <span className="font-mono">{log.record}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{log.timestamp}</span>
                      <span>•</span>
                      <span className="font-mono">TX: {log.txId}</span>
                    </div>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start">
          <Shield className="w-6 h-6 text-blue-600 mr-3 mt-1" />
          <div>
            <h3 className="font-bold text-gray-900 mb-2">
              Blockchain Verification
            </h3>
            <p className="text-sm text-gray-700">
              All audit events are immutably stored on Hyperledger Fabric. Each
              entry is cryptographically signed and linked to previous
              transactions, ensuring complete transparency and tamper-proof
              records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AuditPage;
