import axios, { AxiosError, AxiosInstance } from 'axios';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

function createAxiosInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    timeout: 30000,
  });

  instance.interceptors.request.use((config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const requestUrl = error.config?.url ?? '';
      const isAuthRequest = requestUrl.startsWith('/auth/login') || requestUrl.startsWith('/auth/register');

      if (error.response?.status === 401 && accessToken && !isAuthRequest) {
        setAccessToken(null);
        localStorage.removeItem('token');
        window.location.href = '/login';
      }

      return Promise.reject(error);
    }
  );

  return instance;
}

export const api = createAxiosInstance();

export const authApi = {
  register: (data: { email: string; password: string; username: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  me: () => api.get('/auth/me'),
};

export const projectsApi = {
  list: () => api.get('/projects'),
  get: (id: string) => api.get(`/projects/${id}`),
  getPublic: (id: string) => api.get(`/public/projects/${id}`),
  create: (data: { title: string; description?: string }) =>
    api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  publish: (id: string) => api.post(`/projects/${id}/publish`),
  unpublish: (id: string) => api.post(`/projects/${id}/unpublish`),
};

export const publicApi = {
  listPublishedProjects: () => api.get('/public/projects'),
  getPublishedProject: (id: string) => api.get(`/public/projects/${id}`),
};

export const nodesApi = {
  create: (data: any) => api.post('/nodes', data),
  update: (id: string, data: any) => api.put(`/nodes/${id}`, data),
  delete: (id: string) => api.delete(`/nodes/${id}`),
};

export const edgesApi = {
  create: (data: any) => api.post('/edges', data),
  update: (id: string, data: any) => api.put(`/edges/${id}`, data),
  delete: (id: string) => api.delete(`/edges/${id}`),
};

export const mediaApi = {
  upload: async (files: File | File[], projectId: string, mediaType = 'video') => {
    const formData = new FormData();
    for (const file of Array.isArray(files) ? files : [files]) {
      formData.append('file', file);
    }
    formData.append('project_id', projectId);
    formData.append('media_type', mediaType);

    return api.post('/media/upload', formData);
  },

  list: (projectId: string) => api.get('/media', { params: { project_id: projectId } }),
  listByProject: (projectId: string) => api.get(`/media/project/${projectId}`),
  get: (id: string) => api.get(`/media/${id}`),
  getStreamUrl: (id: string) => api.get(`/media/${id}/stream`),
  getStatus: (id: string) => api.get(`/media/${id}/status`),
  createThumbnail: (id: string, data: { time_ms: number; set_as_project_thumbnail?: boolean }) =>
    api.post(`/media/${id}/thumbnail`, data),
  reprocess: (id: string) => api.post(`/media/${id}/reprocess`),
  delete: (id: string) => api.delete(`/media/${id}`),
};

export const analyticsApi = {
  createSession: (projectId: string) =>
    api.post('/analytics/sessions', { project_id: projectId }),
  getSession: (id: string) => api.get(`/analytics/sessions/${id}`),
  updateSession: (id: string, data: any) =>
    api.put(`/analytics/sessions/${id}`, data),
  trackEvent: (sessionId: string, data: any) =>
    api.post(`/analytics/sessions/${sessionId}/events`, data),
  getProjectStats: (projectId: string) =>
    api.get(`/analytics/projects/${projectId}`),
};
