import { useState } from "react";
import { Lock, Shield, Key, AlertTriangle } from "lucide-react";
import { useAuth } from "../hooks/useAuth.jsx";

const LoginPage = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }
    try {
      await login({ username, password });
      setError("");
    } catch (err) {
      setError(err.message);
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
                  Username / Officer ID
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your username"
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certificate (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition cursor-pointer">
                  <input
                    type="file"
                    onChange={(e) => setCertificate(e.target.files[0])}
                    className="hidden"
                    id="cert-upload"
                    accept=".pem,.cert"
                  />
                  <label htmlFor="cert-upload" className="cursor-pointer">
                    <Key className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      {certificate
                        ? certificate.name
                        : "Upload Fabric CA Certificate"}
                    </p>
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  {error}
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
                Demo Users: admin, investigator, forensics | Password: any
              </p>
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
