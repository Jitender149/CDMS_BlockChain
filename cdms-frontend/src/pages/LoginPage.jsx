import { useState } from "react";
import { Lock, Shield, Key, AlertTriangle } from "lucide-react";
import { useAuth } from "../hooks/useAuth.jsx";

const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !org) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setError("");
      await login({ email, password, org }); // org now included
      // Navigation happens in useAuth hook after successful login
    } catch (err) {
      // Handle both fetch API errors and custom errors
      // Show more detailed error messages
      let errorMessage = err.message || err.error || "Invalid credentials";
      
      // Add helpful context for Fabric network errors
      if (err.status === 503 && err.details) {
        errorMessage = `${errorMessage}. ${err.details}`;
      }
      
      setError(errorMessage);
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <Shield className="w-16 h-16" />
            </div>
            <h1 className="text-3xl font-bold text-center">CDMS</h1>
            <p className="text-center text-blue-100 mt-2">
              Criminal Data Management System
            </p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email ID
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {/* Organization dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization
                </label>
                <select
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Organization</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
              </div>

              {/* Optional Certificate Upload */}
              {/* 
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Certificate (optional)
                </label>
                <input
                  type="file"
                  accept=".pem,.crt"
                  onChange={(e) => setCertificate(e.target.files[0])}
                  className="w-full text-gray-700"
                />
              </div>
              */}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="font-semibold">Login Failed</span>
                  </div>
                  <div className="text-sm mt-2 whitespace-pre-line">
                    {error}
                  </div>
                  {error.includes('Fabric network not set up') && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                      <strong>Quick Fix:</strong> Open WSL terminal and run:
                      <code className="block mt-2 p-2 bg-yellow-100 rounded font-mono text-xs">
                        cd fabric-samples/test-network<br />
                        ./network.sh up createChannel
                      </code>
                      See <code className="font-mono">QUICK_START_FABRIC.md</code> for detailed instructions.
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-900 transition flex items-center justify-center"
              >
                <Lock className="w-5 h-5 mr-2" />
                Secure Login
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Demo: admin@a.gov / investigator@b.gov
              </p>
              <a
                href="/register"
                className="text-blue-600 hover:underline text-sm font-semibold block mt-2"
              >
                Don't have an account? Sign Up
              </a>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-white text-sm">
          <p>🔒 Secured by Hyperledger Fabric & AES-256-GCM</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
