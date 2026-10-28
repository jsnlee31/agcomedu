import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export const isPlainObject = (value) => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
);

export const apiArray = (data, key) => {
  if (key && Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data)) return data;
  return [];
};

export const apiObject = (data, key) => {
  if (key && isPlainObject(data?.[key])) return data[key];
  if (isPlainObject(data)) return data;
  return {};
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add language header
    const lang = localStorage.getItem('language') || 'ko';
    config.headers['Accept-Language'] = lang;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    if (typeof response.data === 'string') {
      return Promise.reject(new Error('API returned non-JSON content'));
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const hadSession = Boolean(localStorage.getItem('token'));
      const isAuthRequest = /\/auth\/(login|register)$/.test(error.config?.url || '');

      if (hadSession && !isAuthRequest) {
        // Token expired or invalid - clear auth and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/welcome';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
  googleAuth: () => api.get('/auth/google'),
};

// Programs API
export const programsAPI = {
  getAll: (params) => api.get('/programs', { params }),
  getById: (id) => api.get(`/programs/${id}`),
  apply: (id, data) => api.post(`/programs/${id}/apply`, data),
  cancelApplication: (id) => api.delete(`/programs/${id}/apply`),
  getApplications: (id) => api.get(`/programs/${id}/applications`),
  updateApplicationStatus: (programId, appId, data) =>
    api.put(`/programs/${programId}/applications/${appId}`, data),
  // Admin
  create: (data) => api.post('/programs', data),
  update: (id, data) => api.put(`/programs/${id}`, data),
  delete: (id) => api.delete(`/programs/${id}`),
};

// Consultations API
export const consultationsAPI = {
  getMine: () => api.get('/consultations'),
  getAll: () => api.get('/consultations/all'),
  getById: (id) => api.get(`/consultations/${id}`),
  book: (data) => api.post('/consultations', data),
  update: (id, data) => api.put(`/consultations/${id}`, data),
  cancel: (id) => api.delete(`/consultations/${id}`),
  getConsultants: () => api.get('/consultations/consultants'),
  // Availability
  getAvailability: (consultantId, params) => api.get(`/consultations/availability/${consultantId}`, { params }),
  getMyAvailability: (params) => api.get('/consultations/my-availability', { params }),
  publishAvailability: (data) => api.post('/consultations/availability', data),
  deleteAvailability: (id) => api.delete(`/consultations/availability/${id}`),
  // Records
  addRecord: (id, data) => api.post(`/consultations/${id}/records`, data),
  // Admin
  getAdminStats: () => api.get('/consultations/admin/stats'),
  getByConsultant: (consultantId) => api.get(`/consultations/admin/by-consultant/${consultantId}`),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  changeStatus: (id, status) => api.put(`/users/${id}/status`, { status }),
  getSkills: (id) => api.get(`/users/${id}/skills`),
  updateSkills: (id, data) => api.post(`/users/${id}/skills`, data),
};

// Courses API
export const coursesAPI = {
  getAll: (params) => api.get('/courses', { params }),
  getById: (id) => api.get(`/courses/${id}`),
  enroll: (id) => api.post(`/courses/${id}/enroll`),
  unenroll: (id) => api.delete(`/courses/${id}/enroll`),
  updateProgress: (id, data) => api.put(`/courses/${id}/progress`, data),
  getEnrollments: () => api.get('/courses/enrollments'),
  // Admin
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
};

// Jobs API
export const jobsAPI = {
  getAll: (params) => api.get('/jobs', { params }),
  getById: (id) => api.get(`/jobs/${id}`),
  getRecommendations: () => api.get('/jobs/recommendations'),
  bookmark: (id) => api.post(`/jobs/${id}/bookmark`),
  removeBookmark: (id) => api.delete(`/jobs/${id}/bookmark`),
  getBookmarks: () => api.get('/jobs/bookmarks'),
  apply: (id, data) => api.post(`/jobs/${id}/apply`, data),
  // Admin
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
};

// Resumes API
export const resumesAPI = {
  getAll: () => api.get('/resumes'),
  getById: (id) => api.get(`/resumes/${id}`),
  create: (data) => api.post('/resumes', data),
  update: (id, data) => api.put(`/resumes/${id}`, data),
  delete: (id) => api.delete(`/resumes/${id}`),
  setPrimary: (id) => api.put(`/resumes/${id}/primary`),
};

// Announcements API
export const announcementsAPI = {
  getAll: (params) => api.get('/announcements', { params }),
  getById: (id) => api.get(`/announcements/${id}`),
  markAsRead: (id) => api.post(`/announcements/${id}/read`),
  // Admin
  create: (data) => api.post('/announcements', data),
  update: (id, data) => api.put(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
};

// FAQ API
export const faqAPI = {
  getCategories: () => api.get('/faq/categories'),
  getAll: (params) => api.get('/faq', { params }),
  getById: (id) => api.get(`/faq/${id}`),
  // Admin
  create: (data) => api.post('/faq', data),
  update: (id, data) => api.put(`/faq/${id}`, data),
  delete: (id) => api.delete(`/faq/${id}`),
  createCategory: (data) => api.post('/faq/categories', data),
  updateCategory: (id, data) => api.put(`/faq/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/faq/categories/${id}`),
};

// Inquiries API
export const inquiriesAPI = {
  getMine: () => api.get('/inquiries'),
  getById: (id) => api.get(`/inquiries/${id}`),
  create: (data) => api.post('/inquiries', data),
  // Admin
  getAll: (params) => api.get('/inquiries/all', { params }),
  respond: (id, data) => api.put(`/inquiries/${id}/respond`, data),
};

// Dashboard API
export const dashboardAPI = {
  getHome: () => api.get('/dashboard/home'),
  getStats: () => api.get('/dashboard/stats'),
  getCalendar: (params) => api.get('/dashboard/calendar', { params }),
};

export const siteSettingsAPI = {
  getHome: () => api.get('/site-settings/home'),
  updateHome: (data) => api.put('/site-settings/home', data),
};

// File uploads (Supabase Storage via signed URL — the file goes straight to
// storage, not through the API function)
export const uploadsAPI = {
  status: () => api.get('/uploads/status'),
  upload: async (file, folder = 'videos', onProgress) => {
    const { data } = await api.post('/uploads/sign', { fileName: file.name, folder });
    await axios.put(data.uploadUrl, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'false',
      },
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return data.publicUrl;
  },
};

export default api;
