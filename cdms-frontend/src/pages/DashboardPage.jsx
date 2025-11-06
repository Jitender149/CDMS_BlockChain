import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Loader2,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth.jsx";

const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';

const DashboardPage = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    {
      label: "Total Records",
      value: "0",
      icon: Database,
      color: "bg-blue-500",
    },
    {
      label: "Total Users",
      value: "0",
      icon: Users,
      color: "bg-green-500",
    },
  ]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [authUser]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (!authUser) {
        throw new Error("User not authenticated");
      }

      const authHeader = `Bearer ${authUser.email}:${authUser.org}`;

      // Fetch stats
      const statsResponse = await fetch(`${API_URL}/dashboard/stats`, {
        headers: {
          'Authorization': authHeader
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats([
            {
              label: "Total Records",
              value: statsData.stats.totalRecords.toLocaleString(),
              icon: Database,
              color: "bg-blue-500",
            },
            {
              label: "Total Users",
              value: statsData.stats.totalUsers.toLocaleString(),
              icon: Users,
              color: "bg-green-500",
            },
          ]);
        }
      }

      // Fetch recent activity
      const activityResponse = await fetch(`${API_URL}/dashboard/activity?limit=5`, {
        headers: {
          'Authorization': authHeader
        }
      });

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        if (activityData.success) {
          const formattedActivity = activityData.activity.map(event => {
            const timeAgo = getTimeAgo(event.time);
            let actionLabel = event.action;
            let recordLabel = event.targetUser ? `${event.targetUser} (${event.targetUserOrg})` : '';
            
            // Format action labels
            switch (event.action) {
              case 'LOGIN':
                actionLabel = 'User Logged In';
                recordLabel = `${event.user} (${event.org})`;
                break;
              case 'LOGOUT':
                actionLabel = 'User Logged Out';
                recordLabel = `${event.user} (${event.org})`;
                break;
              case 'USER_APPROVED':
                actionLabel = 'User Approved';
                recordLabel = event.targetUser ? `${event.targetUser} (${event.targetUserOrg})` : '';
                break;
              case 'ACCESS_REVOKED':
                actionLabel = 'Access Revoked';
                recordLabel = event.targetUser ? `${event.targetUser} (${event.targetUserOrg})` : '';
                break;
              case 'ACCESS_RESTORED':
                actionLabel = 'Access Restored';
                recordLabel = event.targetUser ? `${event.targetUser} (${event.targetUserOrg})` : '';
                break;
              case 'VIEW':
                actionLabel = 'File Viewed';
                recordLabel = event.details || '';
                break;
              case 'CreateRecord':
                actionLabel = 'Record Uploaded';
                recordLabel = event.details || '';
                break;
              default:
                actionLabel = event.action;
                recordLabel = event.details || '';
            }
            
            return {
              action: actionLabel,
              user: event.user,
              org: event.org,
              record: recordLabel,
              time: timeAgo,
              status: event.status,
            };
          });
          setRecentActivity(formattedActivity);
        }
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {authUser?.username || authUser?.email || 'User'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No recent activity</p>
              </div>
            ) : (
              recentActivity.map((activity, idx) => (
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
            )))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('/upload')}
              className="p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition text-left cursor-pointer"
            >
              <Upload className="w-8 h-8 text-blue-600 mb-2" />
              <p className="font-semibold text-gray-900">Upload Record</p>
              <p className="text-xs text-gray-500">Add new criminal data</p>
            </button>
            <button 
              onClick={() => navigate('/records')}
              className="p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 transition text-left cursor-pointer"
            >
              <Search className="w-8 h-8 text-green-600 mb-2" />
              <p className="font-semibold text-gray-900">Search Records</p>
              <p className="text-xs text-gray-500">Find case files</p>
            </button>
            <button 
              onClick={() => navigate('/audit')}
              className="p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition text-left cursor-pointer"
            >
              <Activity className="w-8 h-8 text-purple-600 mb-2" />
              <p className="font-semibold text-gray-900">Audit Trail</p>
              <p className="text-xs text-gray-500">View all activities</p>
            </button>
            <button 
              onClick={() => navigate('/access-management')}
              className="p-4 border-2 border-orange-200 rounded-lg hover:bg-orange-50 transition text-left cursor-pointer"
            >
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
