import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const api = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
}

export const roomsApi = {
  create: (data) => api.post('/rooms', data),
  my: () => api.get('/rooms/my'),
  joined: () => api.get('/rooms/joined'),
  join: (data) => api.post('/rooms/join', data),
  get: (roomId) => api.get(`/rooms/${roomId}`),
  members: (roomId) => api.get(`/rooms/${roomId}/members`),
  updateMembership: (roomId, studentId, data) => api.patch(`/rooms/${roomId}/members/${studentId}`, data),
  invite: (roomId, data) => api.post(`/rooms/${roomId}/invite`, data),
}

export const tasksApi = {
  create: (data) => api.post('/tasks', data),
  byRoom: (roomId) => api.get(`/tasks/room/${roomId}`),
  today: () => api.get('/tasks/my/today'),
  updateAssignmentStatus: (assignmentId, data) => api.patch(`/tasks/assignments/${assignmentId}/status`, data),
}

export const progressApi = {
  streak: () => api.get('/progress/streak'),
  daily: () => api.get('/progress/daily'),
  roomStudents: (roomId) => api.get(`/progress/room/${roomId}/students`),
}

export const notificationsApi = {
  list: (unreadOnly = false) => api.get(`/notifications?unread_only=${unreadOnly}`),
  unreadCount: () => api.get('/notifications/unread-count'),
  markAllRead: () => api.post('/notifications/mark-all-read'),
}

export const usersApi = {
  searchStudent: (email) => api.get(`/users/search?email=${encodeURIComponent(email)}`),
}

export function getApiErrorMessage(err, fallback = 'Something went wrong') {
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail[0]?.msg || fallback
  return fallback
}

export default api
