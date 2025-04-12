import axios from 'axios';

// Create base axios instance with default configuration
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.detail || 
                    error.response?.data?.message || 
                    'An unexpected error occurred';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);

export default apiClient;