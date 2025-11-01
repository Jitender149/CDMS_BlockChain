import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ user, roles, children }) {
  if (!user) return <Navigate to="/login" replace />;
  
  // Normalize role comparison (case-insensitive)
  if (roles && roles.length > 0) {
    const userRole = user.role?.toLowerCase();
    const allowedRoles = roles.map(r => r.toLowerCase());
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }
  
  return children;
}
