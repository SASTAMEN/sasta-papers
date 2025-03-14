import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor to add auth token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth endpoints
export const auth = {
  register: (userData) => API.post('/auth/register', userData),
  login: (credentials) => API.post('/auth/login', credentials),
  getProfile: () => API.get('/auth/profile')
};

// Document endpoints
export const documents = {
  upload: (formData) => API.post('/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  analyze: (formData) => API.post('/documents/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });
    return API.get(`/documents${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getById: (id) => API.get(`/documents/${id}`),
  addReview: (id, comment) => API.post(`/documents/${id}/review`, { comment })
};

export default API;
