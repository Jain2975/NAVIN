import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useSensors from '../hooks/useSensors'
import useOccupancy from '../hooks/useOccupancy'
import SensorDisplay from '../components/SensorDisplay'
import OccupancyGrid from '../components/OccupancyGrid'
import FloorMap from '../components/FloorMap'
import { parkSession } from '../services/api'
import { ActivityClassifier, ACTIVITY } from '../utils/activityClassifier'

export default function Navigate() {
  const { sessionId: urlSessionId } = useParams()
  const navigate = useNavigate()

  const sessionId = urlSessionId || localStorage.getItem('navin_session_id')
  const structureId = localStorage.getItem('navin_structure_id') || 'struct_demo_001'

  const { sensors, granted, requestPermission } = useSensors(sessionId, true)
  const { bays, refresh } = useOccupancy(structureId)

  const [activity, setActivity] = useState(ACTIVITY.UNKNOWN)
  const [selectedFloor, setSelectedFloor] = useState(0)
  const [showParkBanner, setShowParkBanner] = useState(false)
  const [parking, setParking] = useState(false)
  const [error, setError] = useState(null)

  const classifierRef = useRef(new ActivityClassifier())

  // Activity classification
  useEffect(() => {
    const classifier = classifierRef.current
    classifier.onStateChange = (newState) => {
      setActivity(newState)
      if (newState === ACTIVITY.PARKED) {
        setShowParkBanner(true)
      }
    }
  }, [])

  useEffect(() => {
    classifierRef.current.update(sensors)
  }, [sensors])

  // Position is now handled by dead reckoning in FloorMap

  const handlePark = async (bay) => {
    setParking(true)
    setError(null)
    try {
      await parkSession(sessionId, bay.id)
      refresh()
      navigate(`/parked/${sessionId}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to park')
    } finally {
      setParking(false)
    }
  }

  // Redirect if no session
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-6">
        <div className="glass-card p-8 text-center max-w-sm animate-fade-in">
          <h2 className="text-xl font-bold text-white mb-3">No Active Session</h2>
          <p className="text-white/50 text-sm mb-6">Scan a QR code to start navigation</p>
          <button onClick={() => navigate('/')} className="btn-primary">Go to Entry</button>
        </div>
      </div>
    )
  }

  const activityColors = {
    [ACTIVITY.UNKNOWN]: 'text-white/40',
    [ACTIVITY.WALKING]: 'text-navin-400',
    [ACTIVITY.STATIONARY]: 'text-amber-400',
    [ACTIVITY.PARKED]: 'text-emerald-400',
  }

  const activityIcons = {
    [ACTIVITY.UNKNOWN]: '❓',
    [ACTIVITY.WALKING]: '🚶',
    [ACTIVITY.STATIONARY]: '⏸️',
    [ACTIVITY.PARKED]: '🅿️',
  }

  return (
    <div className="min-h-screen bg-mesh p-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="glass-card p-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">🧭 Navigate</h1>
              <p className="text-white/40 text-xs mt-0.5">
                Session: {sessionId.substring(0, 8)}…
              </p>
            </div>
            <div className="text-right">
              <span className={`text-2xl`}>{activityIcons[activity]}</span>
              <p className={`text-xs font-bold uppercase ${activityColors[activity]}`}>
                {activity}
              </p>
            </div>
          </div>
        </div>

        {/* iOS permission banner */}
        {!granted && (
          <div className="glass-card p-4 border-amber-500/30 animate-slide-up">
            <p className="text-white/80 text-sm mb-3">
              Sensors need permission to work on this device
            </p>
            <button onClick={requestPermission} className="btn-primary text-sm w-full">
              Enable Sensors
            </button>
          </div>
        )}

        {/* Park banner */}
        {showParkBanner && (
          <div className="glass-card p-4 border-emerald-500/30 glow-green animate-slide-up">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🅿️</span>
              <div>
                <p className="text-white font-bold text-sm">Vehicle appears parked</p>
                <p className="text-white/50 text-xs">Select your bay below to confirm</p>
              </div>
            </div>
            <button
              onClick={() => setShowParkBanner(false)}
              className="text-white/30 text-xs underline"
            >
              Dismiss — I'm still walking
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Sensor data */}
        <SensorDisplay sensors={sensors} />

        {/* Floor map with dead reckoning */}
        <FloorMap
          bays={bays}
          sensors={sensors}
          structureId={structureId}
          floor={selectedFloor}
        />

        {/* Occupancy grid */}
        <OccupancyGrid
          bays={bays}
          selectedFloor={selectedFloor}
          onBayClick={handlePark}
        />

        {/* Floor switcher (if we have multiple) */}
        {[...new Set(bays.map(b => b.floor))].length > 1 && (
          <div className="flex justify-center gap-2">
            {[...new Set(bays.map(b => b.floor))].sort().map(f => (
              <button
                key={f}
                onClick={() => setSelectedFloor(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  f === selectedFloor
                    ? 'bg-navin-600 text-white glow-blue'
                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                Floor {f + 1}
              </button>
            ))}
          </div>
        )}

        {parking && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-6 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-navin-400 border-t-transparent animate-spin" />
              <p className="text-white font-medium">Confirming parking…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
