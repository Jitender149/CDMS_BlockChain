import axios from 'axios';

const API_URL = process.env.VITE_APP_API_URL;

export const authService = {
  login: async (credentials) => {
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  getCurrentUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  uploadCertificate: async (certificate) => {
    const formData = new FormData();
    formData.append('certificate', certificate);
    
    const response = await axios.post(`${API_URL}/auth/certificate`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};