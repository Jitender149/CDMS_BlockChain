import React, { useState } from "react";
import { Users, Shield } from "lucide-react";

const AccessManagementPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState("users");

  const users = [
    {
      id: 1,
      name: "John Investigator",
      role: "Investigator",
      org: "District Police A",
      status: "Active",
      lastActive: "2 hours ago",
    },
    {
      id: 2,
      name: "Sarah Forensics",
      role: "Forensics Officer",
      org: "Forensics Lab",
      status: "Active",
      lastActive: "30 mins ago",
    },
    {
      id: 3,
      name: "Mike Admin",
      role: "Admin",
      org: "Central HQ",
      status: "Active",
      lastActive: "5 mins ago",
    },
    {
      id: 4,
      name: "Jane Observer",
      role: "Observer",
      org: "District Police B",
      status: "Inactive",
      lastActive: "3 days ago",
    },
  ];

  const policies = [
    {
      id: "policy-123",
      name: "Suspect Record Access",
      categories: ["SuspectRecord"],
      rules: 2,
      status: "Active",
    },
    {
      id: "policy-456",
      name: "Forensic Evidence",
      categories: ["ForensicEvidence"],
      rules: 3,
      status: "Active",
    },
    {
      id: "policy-789",
      name: "Sealed Cases",
      categories: ["SealedRecord"],
      rules: 1,
      status: "Active",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Access Management</h1>
        <p className="text-gray-600 mt-1">
          Manage users, roles, and access policies
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-md">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("users")}
              className={`py-4 font-semibold border-b-2 transition ${
                activeTab === "users"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users className="w-5 h-5 inline mr-2" />
              Users & Roles
            </button>
            <button
              onClick={() => setActiveTab("policies")}
              className={`py-4 font-semibold border-b-2 transition ${
                activeTab === "policies"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Shield className="w-5 h-5 inline mr-2" />
              Access Policies
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Authorized Users
                </h3>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                  + Add User
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Name
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
                        Last Active
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-4 px-4 font-medium text-gray-900">
                          {u.name}
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {u.org}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              u.status === "Active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {u.lastActive}
                        </td>
                        <td className="py-4 px-4">
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-4">
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "policies" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Access Control Policies
                </h3>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                  + Create Policy
                </button>
              </div>
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-bold text-gray-900">
                          {policy.name}
                        </h4>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            policy.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {policy.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Policy ID:{" "}
                        <span className="font-mono">{policy.id}</span>
                      </p>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-gray-600">
                          Categories:{" "}
                          {policy.categories.map((cat) => (
                            <span
                              key={cat}
                              className="inline-block bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-semibold ml-2"
                            >
                              {cat}
                            </span>
                          ))}
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-600">
                          {policy.rules} Rules
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium">
                        Edit
                      </button>
                      <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium">
                        Disable
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default AccessManagementPage;
