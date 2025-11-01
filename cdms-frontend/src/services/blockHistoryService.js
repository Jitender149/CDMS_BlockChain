const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';

export const blockHistoryService = {
  // Get all block history (across all records)
  getAllBlockHistory: async (userId, org, limit = 100) => {
    const response = await fetch(`${API_URL}/block-history?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Using query params for auth as per authenticateUser middleware
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch block history: ${response.statusText}`);
    }
    
    return response.json();
  },

  // Get history for a specific record
  getRecordHistory: async (userId, org, recordId) => {
    const response = await fetch(`${API_URL}/record/${recordId}/history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch record history: ${response.statusText}`);
    }
    
    return response.json();
  },
};

