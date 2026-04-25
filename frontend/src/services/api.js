import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

// ── Sessions ────────────────────────────────────────────────────────
export const createSession  = (payload)  => api.post('/api/sessions/entry', payload)
export const getSession     = (id)       => api.get(`/api/sessions/${id}`)
export const parkSession    = (id, bay)  => api.post(`/api/sessions/${id}/park`, { bay_id: bay })
export const exitSession    = (id)       => api.post(`/api/sessions/${id}/exit`)

// ── Occupancy ───────────────────────────────────────────────────────
export const getOccupancy   = (structureId) => api.get(`/api/occupancy/${structureId}`)
export const getOccSummary  = (structureId) => api.get(`/api/occupancy/${structureId}/summary`)

// ── Sensors ─────────────────────────────────────────────────────────
export const postBatch      = (payload)   => api.post('/api/sensors/batch', payload)
export const getPosition    = (sessionId) => api.get(`/api/sensors/position/${sessionId}`)

// ── QR ──────────────────────────────────────────────────────────────
export const getQRUrl = (structureId, type = 'entry') =>
  `${import.meta.env.VITE_API_BASE_URL || ''}/api/qr/${structureId}${type === 'exit' ? '/exit' : ''}`

// ── Admin ───────────────────────────────────────────────────────────
export const getAdminSessions = () => api.get('/api/admin/sessions')
export const getAdminLogs     = () => api.get('/api/admin/logs')
export const getAdminStats    = () => api.get('/api/admin/stats')

// ── Floor Plan ──────────────────────────────────────────────────────
export const uploadFloorPlan = (formData) =>
  api.post('/api/admin/floorplan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
export const getFloorPlanMeta = (structureId, floor = 0) =>
  api.get(`/api/admin/floorplan/${structureId}/meta?floor=${floor}`)
export const getFloorPlanUrl = (structureId, floor = 0) =>
  `${import.meta.env.VITE_API_BASE_URL || ''}/api/admin/floorplan/${structureId}?floor=${floor}`

export default api
