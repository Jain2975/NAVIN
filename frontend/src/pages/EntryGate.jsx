import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import QRScanner from '../components/QRScanner'
import { createSession } from '../services/api'

export default function EntryGate() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scanned, setScanned] = useState(false)

  const handleDecode = useCallback(async (data) => {
    if (scanned || loading) return
    setScanned(true)
    setLoading(true)
    setError(null)

    try {
      const res = await createSession({
        structure_id: data.structure_id,
        gate: data.gate || 1,
      })
      const sessionId = res.data.session_id
      // Persist session for page refreshes
      localStorage.setItem('navin_session_id', sessionId)
      localStorage.setItem('navin_structure_id', data.structure_id)
      navigate(`/navigate/${sessionId}`)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
      setScanned(false)
    } finally {
      setLoading(false)
    }
  }, [navigate, scanned, loading])

  // Demo: skip QR if no camera (desktop testing)
  const handleDemoEntry = async () => {
    handleDecode({ structure_id: 'struct_demo_001', gate: 1, type: 'entry' })
  }

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center p-6">
      <div className="glass-card p-8 max-w-md w-full animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-navin-500 to-purple-600 flex items-center justify-center glow-blue">
            <span className="text-4xl">🅿️</span>
          </div>
          <h1 className="text-3xl font-bold text-white">NAVIN</h1>
          <p className="text-white/50 text-sm mt-1">Indoor Parking Navigation</p>
        </div>

        {/* QR Scanner */}
        {!scanned && (
          <div className="mb-6">
            <QRScanner
              onDecode={handleDecode}
              onError={setError}
            />
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-8">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-navin-400 border-t-transparent animate-spin" />
            <p className="text-white/60 text-sm">Creating your session…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <p className="text-white/40 text-xs text-center mb-4">
          Point your camera at the entry QR code
        </p>

        {/* Demo button for desktop testing */}
        <button
          onClick={handleDemoEntry}
          disabled={loading}
          className="w-full btn-secondary text-sm"
        >
          🧪 Demo Entry (No QR)
        </button>
      </div>
    </div>
  )
}
