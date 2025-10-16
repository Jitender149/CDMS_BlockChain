import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.jsx";
import { ROUTES } from "../../routes/routeConfig";

export const Sidebar = ({ currentPage }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filter routes based on user roles and `showInSidebar` property
  const navigation = ROUTES.filter(
    (route) =>
      route.showInSidebar && // Only include routes with `showInSidebar: true`
      (route.roles.length === 0 || route.roles.includes(user.role)) // Check user roles
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <nav className="p-4 space-y-2">
        {navigation.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)} // Navigate to the route
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition ${
              currentPage === item.path
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {/* Render the icon dynamically if available */}
            {item.icon && <item.icon className="w-5 h-5" />}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};
