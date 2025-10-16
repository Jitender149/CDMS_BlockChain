import { Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "./routeConfig";
import { useAuth } from "../hooks/useAuth";
import ProtectedRoute from "./ProtectedRoute";
import LoginPage from "../pages/LoginPage";
import UnauthorizedPage from "../pages/UnauthorizedPage";

export default function AppRoutes() {
  const { user, login } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage onLogin={login} />
          )
        }
      />

      {ROUTES.map(({ path, element: Component, roles }) => (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedRoute user={user} roles={roles}>
              <Component user={user} />
            </ProtectedRoute>
          }
        />
      ))}

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}
