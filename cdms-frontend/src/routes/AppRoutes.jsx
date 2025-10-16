import { Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "./routeConfig";
import { useAuth } from "../hooks/useAuth";
import ProtectedRoute from "./ProtectedRoute";
import LoginPage from "../pages/LoginPage";
import UnauthorizedPage from "../pages/UnauthorizedPage";
import MainLayout from "../components/layout/MainLayout";

export default function AppRoutes() {
  const { user, login } = useAuth();

  return (
    <Routes>
      {/* Public Route: Login */}
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

      {/* Authenticated Routes */}
      {ROUTES.map(({ path, element: Component, roles }) => (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedRoute user={user} roles={roles}>
              <MainLayout>
                <Component user={user} />
              </MainLayout>
            </ProtectedRoute>
          }
        />
      ))}

      {/* Unauthorized Route */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Catch-All Route */}
      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}
