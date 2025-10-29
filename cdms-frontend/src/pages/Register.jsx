import React, { useState } from 'react';
import axios from 'axios';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: '', org: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.post('http://localhost:3000/register', form);
      setMessage(res.data.message || 'Registration request sent!');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Sign Up</h2>
      <form onSubmit={handleRegister} className="space-y-4">
        <input name="username" type="text" placeholder="Username" value={form.username} onChange={handleChange} required className="w-full p-2 border rounded" />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required className="w-full p-2 border rounded" />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required className="w-full p-2 border rounded" />
        <input name="role" type="text" placeholder="Role (e.g. investigator)" value={form.role} onChange={handleChange} required className="w-full p-2 border rounded" />
        <input name="org" type="text" placeholder="Organization (e.g. Org1)" value={form.org} onChange={handleChange} required className="w-full p-2 border rounded" />
        <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2 rounded">{loading ? 'Registering...' : 'Sign Up'}</button>
      </form>
      {message && <div className="mt-4 text-center text-red-600">{message}</div>}
    </div>
  );
}
