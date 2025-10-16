import { Shield } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.jsx";
import { Button } from "../common/Button";

export const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-2 rounded-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CDMS</h1>
              <p className="text-xs text-gray-500">
                Criminal Data Management System
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">
                {user.role} • {user.organization}
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
