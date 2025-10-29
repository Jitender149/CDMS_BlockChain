import React, { useState } from "react";
import axios from "axios";

const RegisterPage = () => {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "",
    org: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Map human-readable org to A/B for backend
      const mappedOrg =
        form.org === "DistrictPoliceA"
          ? "A"
          : form.org === "DistrictPoliceB"
          ? "B"
          : form.org;

      const res = await axios.post("http://localhost:3000/register", {
        ...form,
        org: mappedOrg,
      });

      setMessage(res.data.message || "Registration request sent!");
    } catch (err) {
      setMessage(err.response?.data?.error || "Registration failed");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-800 p-8 text-white">
            <h1 className="text-3xl font-bold text-center">Sign Up</h1>
            <p className="text-center text-green-100 mt-2">
              Register for CDMS access
            </p>
          </div>

          <div className="p-8">
            <form onSubmit={handleRegister} className="space-y-6">
              <input
                name="username"
                type="text"
                placeholder="Username"
                value={form.username}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />

              {/* Role selection */}
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              >
                <option value="">Select Role</option>
                <option value="investigator">Investigator</option>
                <option value="forensics_officer">Forensics Officer</option>
                <option value="district_police">District Police</option>
                <option value="admin">Admin</option>
              </select>

              {/* Org selection */}
              <select
                name="org"
                value={form.org}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              >
                <option value="">Select Organization</option>
                <option value="DistrictPoliceA">District Police A</option>
                <option value="DistrictPoliceB">District Police B</option>
              </select>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold"
              >
                {loading ? "Registering..." : "Sign Up"}
              </button>
            </form>

            {message && (
              <div className="mt-4 text-center text-red-600">{message}</div>
            )}
          </div>

          <div className="p-4 text-center">
            <a
              href="/login"
              className="text-blue-600 hover:underline text-sm font-semibold block mt-2"
            >
              Go to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
