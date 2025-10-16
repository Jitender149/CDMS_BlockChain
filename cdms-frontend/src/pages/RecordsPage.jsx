import React, { useState } from "react";
import { Search, Upload, Eye, Download } from "lucide-react";

const RecordsPage = ({ user }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  const records = [
    {
      id: "FIR-2025-001",
      caseId: "CASE-001",
      type: "FIR",
      status: "Active",
      date: "2025-10-12",
      org: "District Police A",
      hash: "a7f3...b2c1",
    },
    {
      id: "EV-2025-089",
      caseId: "CASE-001",
      type: "Evidence",
      status: "Reviewed",
      date: "2025-10-13",
      org: "Forensics Lab",
      hash: "c4e9...d8f2",
    },
    {
      id: "SR-2025-045",
      caseId: "CASE-045",
      type: "Report",
      status: "Sealed",
      date: "2025-10-10",
      org: "District Police B",
      hash: "f1a2...e3b4",
    },
    {
      id: "FIR-2025-002",
      caseId: "CASE-002",
      type: "FIR",
      status: "Pending",
      date: "2025-10-14",
      org: "District Police A",
      hash: "b8d3...c5a6",
    },
  ];

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
        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center">
          <Upload className="w-5 h-5 mr-2" />
          Upload New Record
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by Record ID, Case ID, or Hash..."
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
                  Status
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Date
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Organization
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-4 px-4 font-mono text-sm">{record.id}</td>
                  <td className="py-4 px-4 text-sm">{record.caseId}</td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        record.type === "FIR"
                          ? "bg-blue-100 text-blue-700"
                          : record.type === "Evidence"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {record.type}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        record.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : record.status === "Pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : record.status === "Reviewed"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">
                    {record.date}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">
                    {record.org}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex space-x-2">
                      <button className="p-2 hover:bg-blue-100 rounded-lg transition">
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                      <button className="p-2 hover:bg-green-100 rounded-lg transition">
                        <Download className="w-4 h-4 text-green-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default RecordsPage;
