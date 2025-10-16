import { ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";

const UnAuthorizedPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <ShieldOff className="w-16 h-16" />
            </div>
            <h1 className="text-3xl font-bold text-center">Access Denied</h1>
            <p className="text-center text-blue-100 mt-2">
              You are not authorized to view this page.
            </p>
          </div>
          <div className="p-8 text-center">
            <p className="mb-6 text-gray-700">
              Please login with an account that has the required permissions.
            </p>
            <Link
              to="/login"
              className="inline-block bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-900 transition"
            >
              Go to Login
            </Link>
          </div>
        </div>
        <div className="mt-4 text-center text-white text-sm">
          <p>🔒 Secured by Hyperledger Fabric & AES-256-GCM</p>
        </div>
      </div>
    </div>
  );
};

export default UnAuthorizedPage;
