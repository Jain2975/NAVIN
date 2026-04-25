import { useState, useEffect, useCallback } from 'react'
import { getOccupancy } from '../services/api'

/**
 * useOccupancy — polls bay status every 10 seconds.
 * Returns: { bays, loading, error, refresh }
 */
export default function useOccupancy(structureId, intervalMs = 10000) {
  const [bays, setBays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!structureId) return
    try {
      const res = await getOccupancy(structureId)
      setBays(res.data.bays || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [structureId])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, intervalMs)
    return () => clearInterval(interval)
  }, [refresh, intervalMs])

  return { bays, loading, error, refresh }
}
