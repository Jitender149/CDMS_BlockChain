import { useState, useContext, createContext } from "react";

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_APP_API_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({
    name: "John Doe",
    role: "Admin", // or "User"
  });

  const login = async (credentials) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const user = await response.json();
      setUser(user);
      return user;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
