import axios from 'axios';

// Backend URL retrieved from environment variables, falls back to a relative route or development port
const API_URL = (import.meta as any).env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach JWT token to outgoing headers if present in localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('live_sale_jwt_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Intercept 401 Unauthorized errors to handle session expiries
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Prepare refresh token routing logic
        const refreshToken = localStorage.getItem('live_sale_refresh_token');
        if (refreshToken) {
          // In a real application, call your /auth/refresh endpoint here
          // const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          // const newToken = res.data.token;
          // localStorage.setItem('live_sale_jwt_token', newToken);
          // originalRequest.headers.Authorization = `Bearer ${newToken}`;
          // return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('live_sale_jwt_token');
        localStorage.removeItem('live_sale_refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
