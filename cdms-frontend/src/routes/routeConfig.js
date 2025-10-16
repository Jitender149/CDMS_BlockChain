// src/routes/routeConfig.js

import DashboardPage from "../pages/DashboardPage";
import AccessManagementPage from "../pages/AccessManagementPage";
import AuditPage from "../pages/AuditPage";
import LoginPage from "../pages/LoginPage";
import RecordsPage from "../pages/RecordsPage";
import UploadPage from "../pages/UploadPage";

export const ROUTES = [
  {
    path: "/dashboard",
    element: DashboardPage,
    roles: ["Admin", "Forensics", "Investigator"], // All roles can access
  },
  {
    path: "/access-management",
    element: AccessManagementPage,
    roles: ["Admin"], // Only Admin can access
  },
  {
    path: "/audit",
    element: AuditPage,
    roles: ["Admin", "Forensics"], // Admin and Forensics can access
  },
  {
    path: "/login",
    element: LoginPage,
    roles: [], // Public route, no roles required
  },
  {
    path: "/records",
    element: RecordsPage,
    roles: ["Admin", "Forensics", "Investigator"], // All roles can access
  },
  {
    path: "/upload",
    element: UploadPage,
    roles: ["Admin", "Forensics"], // Admin and Forensics can access
  },
];
