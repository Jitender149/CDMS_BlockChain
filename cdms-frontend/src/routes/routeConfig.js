// src/routes/routeConfig.js

import { Activity, FileText, Upload, Database, Users } from "lucide-react";

import DashboardPage from "../pages/DashboardPage";
import AccessManagementPage from "../pages/AccessManagementPage";
import AuditPage from "../pages/AuditPage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import AdminApprove from "../pages/AdminApprove";
import RecordsPage from "../pages/RecordsPage";
import UploadPage from "../pages/UploadPage";

export const ROUTES = [
  {
    path: "/dashboard",
    element: DashboardPage,
    label: "Dashboard",
    icon: Activity,
    roles: ["Admin", "Forensics", "Investigator"],
    showInSidebar: true, // Show in Sidebar
  },
  {
    path: "/access-management",
    element: AccessManagementPage,
    label: "Access Management",
    icon: Users,
    roles: ["Admin"],
    showInSidebar: true, // Show in Sidebar
  },
  {
    path: "/audit",
    element: AuditPage,
    label: "Audit Trail",
    icon: Database,
    roles: ["Admin", "Forensics"],
    showInSidebar: true, // Show in Sidebar
  },
  {
    path: "/login",
    element: LoginPage,
    label: "Login",
    roles: [],
    showInSidebar: false, // Do not show in Sidebar
  },
  {
    path: "/register",
    element: RegisterPage,
    label: "Sign Up",
    roles: [],
    showInSidebar: false,
  },
  {
    path: "/admin-approve",
    element: AdminApprove,
    label: "Admin Approve",
    roles: ["Admin"],
    showInSidebar: false,
  },
  {
    path: "/records",
    element: RecordsPage,
    label: "Records",
    icon: FileText,
    roles: ["Admin", "Forensics", "Investigator"],
    showInSidebar: true, // Show in Sidebar
  },
  {
    path: "/upload",
    element: UploadPage,
    label: "Upload",
    icon: Upload,
    roles: ["Admin", "Forensics"],
    showInSidebar: true, // Show in Sidebar
  },
];
