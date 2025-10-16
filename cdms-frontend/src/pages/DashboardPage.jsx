import {
  Database,
  FileText,
  Activity,
  Upload,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth.jsx";

const DashboardPage = () => {
  const { user } = useAuth();
  const stats = [
    {
      label: "Total Records",
      value: "1,247",
      icon: Database,
      color: "bg-blue-500",
    },
    {
      label: "Active Cases",
      value: "89",
      icon: FileText,
      color: "bg-green-500",
    },
    {
      label: "Pending Reviews",
      value: "23",
      icon: Clock,
      color: "bg-yellow-500",
    },
    {
      label: "Audit Events",
      value: "5,632",
      icon: Activity,
      color: "bg-purple-500",
    },
  ];

  const recentActivity = [
    {
      action: "Record Uploaded",
      user: "Officer Smith",
      record: "FIR-2025-001",
      time: "10 mins ago",
      status: "success",
    },
    {
      action: "Access Granted",
      user: "Det. Johnson",
      record: "EV-2025-089",
      time: "25 mins ago",
      status: "success",
    },
    {
      action: "Access Denied",
      user: "Unknown User",
      record: "SR-2025-045",
      time: "1 hour ago",
      status: "error",
    },
    {
      action: "Policy Updated",
      user: "Admin Chen",
      record: "Policy-123",
      time: "2 hours ago",
      status: "warning",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {user.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.color} p-4 rounded-lg`}>
                <stat.icon className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <div className="space-y-4">
            {recentActivity.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-4 pb-4 border-b last:border-b-0"
              >
                <div
                  className={`p-2 rounded-lg ${
                    activity.status === "success"
                      ? "bg-green-100"
                      : activity.status === "error"
                      ? "bg-red-100"
                      : "bg-yellow-100"
                  }`}
                >
                  {activity.status === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : activity.status === "error" ? (
                    <XCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {activity.action}
                  </p>
                  <p className="text-sm text-gray-600">
                    {activity.user} - {activity.record}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition text-left">
              <Upload className="w-8 h-8 text-blue-600 mb-2" />
              <p className="font-semibold text-gray-900">Upload Record</p>
              <p className="text-xs text-gray-500">Add new criminal data</p>
            </button>
            <button className="p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 transition text-left">
              <Search className="w-8 h-8 text-green-600 mb-2" />
              <p className="font-semibold text-gray-900">Search Records</p>
              <p className="text-xs text-gray-500">Find case files</p>
            </button>
            <button className="p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition text-left">
              <Activity className="w-8 h-8 text-purple-600 mb-2" />
              <p className="font-semibold text-gray-900">Audit Trail</p>
              <p className="text-xs text-gray-500">View all activities</p>
            </button>
            <button className="p-4 border-2 border-orange-200 rounded-lg hover:bg-orange-50 transition text-left">
              <Users className="w-8 h-8 text-orange-600 mb-2" />
              <p className="font-semibold text-gray-900">Manage Access</p>
              <p className="text-xs text-gray-500">Control permissions</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardPage;
