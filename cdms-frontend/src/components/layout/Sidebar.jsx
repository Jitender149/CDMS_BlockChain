import { Activity, FileText, Upload, Database, Users } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.jsx";

export const Sidebar = ({ currentPage, onNavigate }) => {
  const { user } = useAuth();

  const navigation = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "records", label: "Records", icon: FileText },
    { id: "upload", label: "Upload", icon: Upload },
    { id: "audit", label: "Audit Trail", icon: Database },
    ...(user.role === "Admin"
      ? [{ id: "access", label: "Access Management", icon: Users }]
      : []),
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <nav className="p-4 space-y-2">
        {navigation.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition ${
              currentPage === item.id
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};
