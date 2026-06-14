/**
 * Axios API Service — PayrollPro
 * -------------------------------------------------------
 * - Base URL read from VITE_API_URL in .env
 * - App info read from VITE_APP_NAME, VITE_COMPANY_NAME
 * - JWT stored in memory (NOT localStorage — XSS safe)
 * - Auto-refresh on 401 using refresh token in sessionStorage
 * -------------------------------------------------------
 */
import axios from 'axios';

// ─── Environment Config ───────────────────────────────────────────────────────
const getDynamicApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      return `http://${hostname}:8000/api`;
    }
  }
  return 'https://payroll2-mnuo.onrender.com/api';
};

export const ENV = {
  API_URL:      getDynamicApiUrl(),
  APP_NAME:     import.meta.env.VITE_APP_NAME     || 'PayrollPro',
  COMPANY_NAME: import.meta.env.VITE_COMPANY_NAME || 'PayrollPro',
  VERSION:      import.meta.env.VITE_APP_VERSION  || '1.0.0',
  DEBUG:        import.meta.env.VITE_DEBUG === 'true',
};

// ─── In-Memory Token Storage (XSS-safe) ──────────────────────────────────────
let accessToken = null;
export const setAccessToken  = (t) => { accessToken = t; };
export const getAccessToken  = ()  => accessToken;
export const clearAccessToken = () => { accessToken = null; };

// ─── Axios Instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: ENV.API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
  timeout: 30000, // 30s timeout
});

// ─── Request Interceptor — Attach Bearer Token ────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    if (ENV.DEBUG) {
      console.debug(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — Auto-Refresh on 401 ───────────────────────────────
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Do not intercept 401s from the login endpoint itself
    if (originalRequest.url.includes('/auth/login/')) {
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = sessionStorage.getItem('refresh_token');
        if (refreshToken) {
          // Pre-check JWT expiration to avoid a redundant 401 network call
          let isExpired = false;
          try {
            const parts = refreshToken.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
              if (payload.exp && payload.exp * 1000 < Date.now()) {
                isExpired = true;
              }
            } else {
              isExpired = true;
            }
          } catch {
            isExpired = true;
          }

          if (isExpired) {
            clearAccessToken();
            sessionStorage.removeItem('refresh_token');
            window.location.href = '/login';
            return Promise.reject(error);
          }

          if (!refreshPromise) {
            refreshPromise = axios.post(
              `${ENV.API_URL}/auth/token/refresh/`,
              { refresh: refreshToken }
            ).then(res => {
              refreshPromise = null;
              const newAccess = res.data.access;
              setAccessToken(newAccess);
              return newAccess;
            }).catch(err => {
              refreshPromise = null;
              throw err;
            });
          }

          const newAccess = await refreshPromise;
          originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
          return api(originalRequest);
        }
      } catch {
        // Refresh failed — clear session and redirect to login
        clearAccessToken();
        sessionStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth APIs ────────────────────────────────────────────────────────────────
export const authAPI = {
  login:          (data)   => api.post('/auth/login/', data),
  logout:         (refresh)=> api.post('/auth/logout/', { refresh }),
  register:       (data)   => api.post('/auth/register/', data),
  profile:        ()       => api.get('/auth/profile/'),
  changePassword: (data)   => api.post('/auth/change-password/', data),
  refresh:        (refresh)=> axios.post(`${ENV.API_URL}/auth/token/refresh/`, { refresh }),
};

// ─── Department APIs ──────────────────────────────────────────────────────────
export const departmentAPI = {
  list:   (params) => api.get('/departments/', { params }),
  create: (data)   => api.post('/departments/', data),
  update: (id, data) => api.put(`/departments/${id}/`, data),
  delete: (id)     => api.delete(`/departments/${id}/`),
};

// ─── Employee APIs ────────────────────────────────────────────────────────────
export const employeeAPI = {
  list:         (params)       => api.get('/employees/', { params }),
  get:          (id)           => api.get(`/employees/${id}/`),
  create:       (data)         => api.post('/employees/', data),
  update:       (id, data)     => api.patch(`/employees/${id}/`, data),
  delete:       (id)           => api.delete(`/employees/${id}/`),
  pending:      ()             => api.get('/employees/pending/'),
  approve:      (id, data)     => api.post(`/employees/approve/${id}/`, data),
  reject:       (id, reason)   => api.post(`/employees/reject/${id}/`, { reason }),
  toggleStatus: (id, action)   => api.post(`/employees/toggle-status/${id}/`, { action }),
  generateQR:   (id)           => api.post(`/employees/generate-qr/${id}/`),
};

// ─── Attendance APIs ──────────────────────────────────────────────────────────
export const attendanceAPI = {
  list: (params)  => api.get('/attendance/records/', { params }),
  scan: (qrData, scanType = 'auto') => api.post('/attendance/qr/scan/', { qr_data: qrData, scan_type: scanType }),
  create: (data)  => api.post('/attendance/records/', data),
  update: (id, data) => api.patch(`/attendance/records/${id}/`, data),
  delete: (id)  => api.delete(`/attendance/records/${id}/`),
  seedMockData: () => api.post('/attendance/records/seed-mock-data/'),
};

// ─── Leave APIs ───────────────────────────────────────────────────────────────
export const leaveAPI = {
  list:    (params)         => api.get('/leave/', { params }),
  apply:   (data)           => api.post('/leave/', data),
  approve: (id)             => api.post(`/leave/${id}/approve/`),
  reject:  (id, reason)     => api.post(`/leave/${id}/reject/`, { rejection_reason: reason }),
};

// ─── Salary Rules APIs ────────────────────────────────────────────────────────
export const salaryRulesAPI = {
  list:   ()         => api.get('/salary-rules/groups/'),
  create: (data)     => api.post('/salary-rules/groups/', data),
  update: (id, data) => api.put(`/salary-rules/groups/${id}/`, data),
};

// ─── Payroll APIs ─────────────────────────────────────────────────────────────
export const payrollAPI = {
  list:     (params)        => api.get('/payroll/', { params }),
  generate: (month, year)   => api.post('/payroll/generate/', { month, year }),
};

// ─── Payslip APIs ─────────────────────────────────────────────────────────────
export const payslipAPI = {
  list:          (params)        => api.get('/payslips/', { params }),
  generate:      (month, year)   => api.post('/payslips/generate/', { month, year }),
  download:      (id)            => api.get(`/payslips/${id}/download/`, { responseType: 'blob' }),
  sendEmail:     (id)            => api.post(`/payslips/${id}/send_email/`),
  sendBulkEmails:(month, year)   => api.post('/payslips/send_bulk_emails/', { month, year }),
};

// ─── Dashboard APIs ───────────────────────────────────────────────────────────
export const dashboardAPI = {
  admin:    () => api.get('/dashboard/admin/'),
  employee: () => api.get('/dashboard/employee/'),
};

// ─── Reports APIs ─────────────────────────────────────────────────────────────
export const reportsAPI = {
  attendance: (params) => api.get('/reports/attendance/', { params }),
  leave:      (params) => api.get('/reports/leave/', { params }),
  payroll:    (params) => api.get('/reports/payroll/', { params }),
};

// ─── Audit Logs API ───────────────────────────────────────────────────────────
export const auditAPI = {
  list: (params) => api.get('/audit-logs/', { params }),
};
