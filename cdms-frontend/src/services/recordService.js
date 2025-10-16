import axios from 'axios';

const API_URL = process.env.VITE_APP_API_URL;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const recordService = {
  getAllRecords: async (filters = {}) => {
    const response = await axios.get(`${API_URL}/records`, {
      ...getAuthHeader(),
      params: filters
    });
    return response.data;
  },

  getRecordById: async (id) => {
    const response = await axios.get(`${API_URL}/records/${id}`, getAuthHeader());
    return response.data;
  },

  uploadRecord: async (recordData) => {
    const formData = new FormData();
    formData.append('caseId', recordData.caseId);
    formData.append('recordType', recordData.recordType);
    formData.append('category', recordData.category);
    formData.append('description', recordData.description);
    formData.append('file', recordData.file);

    const response = await axios.post(`${API_URL}/records`, formData, {
      ...getAuthHeader(),
      headers: {
        ...getAuthHeader().headers,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  downloadRecord: async (id) => {
    const response = await axios.get(`${API_URL}/records/${id}/download`, {
      ...getAuthHeader(),
      responseType: 'blob'
    });
    return response.data;
  }
};