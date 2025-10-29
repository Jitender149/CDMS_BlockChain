import React, { useState } from 'react';
import axios from 'axios';

export default function AdminApprove() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.post('http://localhost:3000/approve-registration', { email });
      setMessage(res.data.message || 'User approved!');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Approval failed');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Admin Approval</h2>
      <form onSubmit={handleApprove} className="space-y-4">
        <input type="email" placeholder="User Email to Approve" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2 border rounded" />
        <button type="submit" disabled={loading} className="w-full bg-purple-600 text-white py-2 rounded">{loading ? 'Approving...' : 'Approve User'}</button>
      </form>
      {message && <div className="mt-4 text-center text-green-600">{message}</div>}
    </div>
  );
}
