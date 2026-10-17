import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default client

export const authAPI = {
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  me: () => client.get('/auth/me'),
}

export const transactionsAPI = {
  list: (params) => client.get('/transactions', { params }),
  get: (id) => client.get(`/transactions/${id}`),
  create: (data) => client.post('/transactions', data),
  update: (id, data) => client.put(`/transactions/${id}`, data),
  delete: (id) => client.delete(`/transactions/${id}`),
}

export const categoriesAPI = {
  list: (params) => client.get('/categories', { params }),
  create: (data) => client.post('/categories', data),
  update: (id, data) => client.put(`/categories/${id}`, data),
  delete: (id) => client.delete(`/categories/${id}`),
}

export const budgetsAPI = {
  list: (params) => client.get('/budgets', { params }),
  create: (data) => client.post('/budgets', data),
  update: (id, data) => client.put(`/budgets/${id}`, data),
  delete: (id) => client.delete(`/budgets/${id}`),
  progress: (params) => client.get('/budgets/progress', { params }),
}

export const reportsAPI = {
  summary: (params) => client.get('/reports/summary', { params }),
  exportCsv: (params) =>
    client.get('/reports/export/csv', { params, responseType: 'blob' }),
}
