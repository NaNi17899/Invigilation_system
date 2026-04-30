const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000')

export function getToken() {
  return localStorage.getItem('token') || ''
}

export function setToken(t) {
  if (t) localStorage.setItem('token', t)
}

async function req(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers })
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error || 'Request failed')
  return res.json()
}

export const api = {
  login: (email, password) => req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (payload) => req('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  uploadCsv: async (endpoint, file) => {
    const token = getToken()
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form })
    if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error || 'Upload failed')
    return res.json()
  },
  generateSchedule: (date, neededOverride = null) => {
    let url = `/schedule/generate?date=${encodeURIComponent(date)}`
    if (neededOverride) url += `&neededOverride=${encodeURIComponent(neededOverride)}`
    return req(url, { method: 'POST' })
  },
  scheduleForDay: (date) => req(`/schedule/day?date=${encodeURIComponent(date)}`),
  exportCsvUrl: (date) => `${API_URL}/schedule/export/day.csv?date=${encodeURIComponent(date)}`,
  notifyDay: (date) => req(`/schedule/notify/day?date=${encodeURIComponent(date)}`, { method: 'POST' }),
  myAllocations: () => req('/faculty/me/allocations'),
  submitRequest: (payload) => req('/faculty/requests', { method: 'POST', body: JSON.stringify(payload) }),
  facultySearch: (q) => req(`/faculty/search?q=${encodeURIComponent(q)}`),
  reassign: (allocationId, toFacultyId) => req(`/schedule/reassign/${encodeURIComponent(allocationId)}`, { method: 'PATCH', body: JSON.stringify({ toFacultyId }) }),
}
