import { useState, useEffect, useCallback, useRef } from 'react'
import { getAdminSessions, getAdminLogs, getAdminStats, uploadFloorPlan, getFloorPlanUrl, getFloorPlanMeta } from '../services/api'
import QRCodeDisplay from '../components/QRCodeDisplay'

export default function AdminDashboard() {
  const [sessions, setSessions] = useState([])
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({})
  const [tab, setTab] = useState('sessions')
  const [mapUploading, setMapUploading] = useState(false)
  const [mapMsg, setMapMsg] = useState(null)
  const [floorPlanExists, setFloorPlanExists] = useState(false)
  const [mapDims, setMapDims] = useState({ width: 50, height: 30 })
  const fileInputRef = useRef(null)

  const refreshAll = useCallback(async () => {
    try {
      const [sRes, lRes, stRes] = await Promise.all([
        getAdminSessions(), getAdminLogs(), getAdminStats()
      ])
      setSessions(sRes.data.sessions || [])
      setLogs(lRes.data.lines || [])
      setStats(stRes.data || {})
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    refreshAll()
    const interval = setInterval(refreshAll, 15000)
    return () => clearInterval(interval)
  }, [refreshAll])

  // Check if floor plan exists
  useEffect(() => {
    getFloorPlanMeta('struct_demo_001', 0)
      .then(res => setFloorPlanExists(res.data.exists))
      .catch(() => {})
  }, [])

  const handleMapUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMapUploading(true)
    setMapMsg(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('structure_id', 'struct_demo_001')
      formData.append('floor', '0')
      formData.append('width_meters', mapDims.width.toString())
      formData.append('height_meters', mapDims.height.toString())
      await uploadFloorPlan(formData)
      setMapMsg('✅ Floor plan uploaded successfully!')
      setFloorPlanExists(true)
    } catch (err) {
      setMapMsg('❌ Upload failed: ' + (err.response?.data?.detail || err.message))
    } finally {
      setMapUploading(false)
    }
  }

  const statusBadge = (status) => {
    const map = { active: 'badge-active', parked: 'badge-parked', exited: 'badge-exited' }
    return <span className={map[status] || 'badge'}>{status}</span>
  }

  const statCards = [
    { label: 'Active', value: stats.active || 0, color: 'text-navin-400', icon: '🟢' },
    { label: 'Parked', value: stats.parked || 0, color: 'text-amber-400', icon: '🅿️' },
    { label: 'Exited Today', value: stats.exited_today || 0, color: 'text-emerald-400', icon: '🚪' },
    { label: 'Batches', value: stats.batches_today || 0, color: 'text-purple-400', icon: '📦' },
  ]

  return (
    <div className="min-h-screen bg-mesh p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <h1 className="text-2xl font-bold text-white">⚙️ Admin Dashboard</h1>
          <button onClick={refreshAll} className="btn-secondary text-xs px-3 py-2">🔄 Refresh</button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in">
          {statCards.map(s => (
            <div key={s.label} className="glass-card p-4 text-center">
              <span className="text-2xl">{s.icon}</span>
              <p className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
              <p className="text-xs text-white/40 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {['sessions', 'logs', 'qr', 'map'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t ? 'bg-navin-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {t === 'sessions' ? '📋 Sessions' : t === 'logs' ? '📜 Logs' : t === 'qr' ? '📱 QR Codes' : '🗺️ Map'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'sessions' && (
          <div className="glass-card p-4 overflow-x-auto animate-fade-in">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs border-b border-white/10">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Zone</th>
                  <th className="text-left p-2">Entry</th>
                  <th className="text-left p-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-2 font-mono text-xs text-white/60">{s.id.substring(0, 8)}…</td>
                    <td className="p-2">{statusBadge(s.status)}</td>
                    <td className="p-2 text-white/60">{s.assigned_zone || '—'}</td>
                    <td className="p-2 text-white/40 text-xs">{new Date(s.entry_time).toLocaleTimeString()}</td>
                    <td className="p-2 text-white/60">{s.duration_mins != null ? `${s.duration_mins}m` : '—'}</td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr><td colSpan="5" className="p-6 text-center text-white/30">No sessions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'logs' && (
          <div className="glass-card p-4 animate-fade-in">
            <div className="font-mono text-xs space-y-0.5 max-h-96 overflow-y-auto">
              {logs.map((line, i) => (
                <div key={i} className={`py-0.5 ${
                  line.includes('ERROR') ? 'text-red-400' :
                  line.includes('WARNING') ? 'text-amber-400' :
                  'text-white/50'
                }`}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'qr' && (
          <div className="glass-card p-6 animate-fade-in">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="text-center">
                <h3 className="text-sm font-bold text-white/80 mb-4">Entry QR</h3>
                <QRCodeDisplay structureId="struct_demo_001" type="entry" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold text-white/80 mb-4">Exit QR</h3>
                <QRCodeDisplay structureId="struct_demo_001" type="exit" />
              </div>
            </div>
          </div>
        )}
        {tab === 'map' && (
          <div className="glass-card p-6 animate-fade-in">
            <h3 className="text-lg font-bold text-white mb-4">🗺️ Floor Plan Management</h3>
            <p className="text-white/50 text-sm mb-4">
              Upload a floor plan image (PNG/JPG) of your parking structure.
              This will be used as the map background on the Navigate page.
            </p>

            {/* Dimension inputs */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-white/40 block mb-1">Width (meters)</label>
                <input
                  type="number"
                  value={mapDims.width}
                  onChange={e => setMapDims(d => ({ ...d, width: +e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-navin-400 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1">Height (meters)</label>
                <input
                  type="number"
                  value={mapDims.height}
                  onChange={e => setMapDims(d => ({ ...d, height: +e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-navin-400 outline-none"
                />
              </div>
            </div>

            {/* Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleMapUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={mapUploading}
              className="btn-primary text-sm w-full mb-4"
            >
              {mapUploading ? '⏳ Uploading…' : '📁 Upload Floor Plan Image'}
            </button>

            {mapMsg && (
              <div className={`p-3 rounded-xl text-sm mb-4 ${
                mapMsg.startsWith('✅') ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                {mapMsg}
              </div>
            )}

            {/* Preview */}
            {floorPlanExists && (
              <div>
                <h4 className="text-sm font-bold text-white/60 mb-2">Current Floor Plan (Floor 1)</h4>
                <div className="rounded-xl overflow-hidden border border-white/10">
                  <img
                    src={getFloorPlanUrl('struct_demo_001', 0) + '&t=' + Date.now()}
                    alt="Floor plan"
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {!floorPlanExists && (
              <div className="text-center py-8 text-white/20">
                <span className="text-4xl">🗺️</span>
                <p className="text-sm mt-2">No floor plan uploaded yet</p>
                <p className="text-xs mt-1">Upload a PNG/JPG image of your parking structure layout</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
