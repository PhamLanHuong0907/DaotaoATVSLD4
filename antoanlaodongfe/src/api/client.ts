import axios, { type AxiosRequestConfig } from 'axios';

const TOKEN_KEY = 'atvsld_token';
const REFRESH_KEY = 'atvsld_refresh';

export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setRefreshToken(token: string | null) {
  if (token) localStorage.setItem(REFRESH_KEY, token);
  else localStorage.removeItem(REFRESH_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Refresh-on-401 logic ---
// Single in-flight refresh promise so concurrent 401s share one refresh call.
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    // Call /auth/refresh directly (avoid interceptor recursion).
    const baseURL = import.meta.env.VITE_API_URL || '/api/v1';
    const resp = await axios.post(`${baseURL}/auth/refresh`, { refresh_token: refresh });
    const newAccess: string = resp.data.access_token;
    const newRefresh: string | undefined = resp.data.refresh_token;
    setAuthToken(newAccess);
    if (newRefresh) setRefreshToken(newRefresh);
    return newAccess;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original: (AxiosRequestConfig & { _retry?: boolean }) | undefined = error.config;

    if (error.response?.status === 401 && original && !original._retry) {
      // Don't try to refresh the refresh endpoint itself.
      if (original.url?.includes('/auth/refresh') || original.url?.includes('/auth/login')) {
        setAuthToken(null);
        setRefreshToken(null);
        localStorage.removeItem('atvsld_user');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(new Error(error.response?.data?.detail || 'Phiên đăng nhập đã hết hạn'));
      }

      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccess = await refreshPromise;
      if (newAccess) {
        original.headers = original.headers || {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newAccess}`;
        return apiClient.request(original);
      }
      // Refresh failed → force logout
      setAuthToken(null);
      setRefreshToken(null);
      localStorage.removeItem('atvsld_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    let message = 'Lỗi hệ thống, vui lòng thử lại';
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') {
      message = detail;
    } else if (Array.isArray(detail)) {
      message = detail.map((d: any) => `${d.loc?.join('.')} ${d.msg}`).join(', ');
    }

    return Promise.reject(new Error(message));
  },
);

export default apiClient;
