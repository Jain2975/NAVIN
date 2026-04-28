import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSession, exitSession } from '../services/api'

export default function Parked() {
  const { sessionId: urlSessionId } = useParams()
  const navigate = useNavigate()

  const sessionId = urlSessionId || localStorage.getItem('navin_session_id')
  const [session, setSession] = useState(null)
  const [duration, setDuration] = useState(0)
  const [exiting, setExiting] = useState(false)
  const [error, setError] = useState(null)

  // Fetch session details
  useEffect(() => {
    if (!sessionId) return
    getSession(sessionId)
      .then(res => setSession(res.data))
      .catch(() => setError('Failed to load session'))
  }, [sessionId])

  // Live duration timer
  useEffect(() => {
    if (!session?.entry_time) return
    const interval = setInterval(() => {
      // Backend returns UTC without 'Z' suffix — append it so JS parses as UTC
      const timeStr = session.entry_time.endsWith('Z') ? session.entry_time : session.entry_time + 'Z'
      const entered = new Date(timeStr)
      const now = new Date()
      setDuration(Math.floor((now - entered) / 60000))
    }, 1000)
    return () => clearInterval(interval)
  }, [session])

  const handleExit = async () => {
    setExiting(true)
    setError(null)
    try {
      await exitSession(sessionId)
      localStorage.removeItem('navin_session_id')
      localStorage.removeItem('navin_structure_id')
      navigate('/exit')
    } catch (err) {
      setError(err.response?.data?.detail || 'Exit failed')
    } finally {
      setExiting(false)
    }
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-6">
        <div className="glass-card p-8 text-center max-w-sm animate-fade-in">
          <h2 className="text-xl font-bold text-white mb-3">No Active Session</h2>
          <button onClick={() => navigate('/')} className="btn-primary">Go to Entry</button>
        </div>
      </div>
    )
  }

  const hours = Math.floor(duration / 60)
  const mins = duration % 60

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-4 animate-fade-in">
        {/* Confirmation card */}
        <div className="glass-card p-8 text-center glow-green">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <span className="text-4xl">🚗</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Vehicle Parked</h1>
          <p className="text-white/50 text-sm">Your parking is confirmed</p>
        </div>

        {/* Details */}
        <div className="glass-card p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <p className="text-xs text-white/40 mb-1">Bay</p>
              <p className="text-xl font-bold text-navin-400 font-mono">
                {session?.bay_number || (session?.parked_bay_id ? session.parked_bay_id.substring(0, 6) : '—')}
              </p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <p className="text-xs text-white/40 mb-1">Zone</p>
              <p className="text-xl font-bold text-purple-400 font-mono">
                {session?.assigned_zone || '—'}
              </p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl col-span-2">
              <p className="text-xs text-white/40 mb-1">Duration</p>
              <p className="text-3xl font-bold text-white font-mono">
                {hours > 0 && <span>{hours}h </span>}
                {mins}m
              </p>
            </div>
          </div>
        </div>

        {/* Session info */}
        <div className="glass-card p-4">
          <div className="flex justify-between text-xs text-white/40">
            <span>Session</span>
            <span className="font-mono">{sessionId.substring(0, 12)}…</span>
          </div>
          <div className="flex justify-between text-xs text-white/40 mt-1">
            <span>Status</span>
            <span className="badge-parked text-[10px]">{session?.status || '—'}</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Exit button */}
        <button
          onClick={handleExit}
          disabled={exiting}
          className="w-full btn-danger text-base"
        >
          {exiting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Exiting…
            </span>
          ) : (
            '🚪 Exit Parking'
          )}
        </button>
      </div>
    </div>
  )
}
