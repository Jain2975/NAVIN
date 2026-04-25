import { useState, useEffect, useCallback, useRef } from 'react'
import { postBatch } from '../services/api'

/**
 * useSensors — collects orientation + accelerometer + gyroscope from phone.
 * 
 * Sources:
 *   DeviceMotionEvent → accelerometer (x,y,z) + gyroscope (rotationRate)
 *   DeviceOrientationEvent → compass heading + tilt angles
 */
export default function useSensors(sessionId, enabled = true) {
  const [sensors, setSensors] = useState({
    // Orientation (DeviceOrientationEvent)
    compass: 0,      // alpha: compass heading 0-360°
    tilt_fb: 0,      // beta:  tilt front/back -180 to 180°
    tilt_lr: 0,      // gamma: tilt left/right -90 to 90°
    // Acceleration (DeviceMotionEvent.accelerationIncludingGravity)
    accel_x: 0,
    accel_y: 0,
    accel_z: 0,
    accel_mag: 0,    // sqrt(x²+y²+z²), ~9.8 when still
    // Gyroscope (DeviceMotionEvent.rotationRate) — angular velocity in deg/s
    gyro_alpha: 0,   // yaw rate   (turning left/right) — KEY for turn detection
    gyro_beta: 0,    // pitch rate (tilting forward/back)
    gyro_gamma: 0,   // roll rate  (tilting left/right)
    // Derived
    steps: 0,
    heading: 0,      // smoothed compass heading for dead reckoning
    timestamp: Date.now(),
  })
  const [granted, setGranted] = useState(false)
  const [error, setError] = useState(null)

  const batchRef = useRef([])
  const stepsRef = useRef(0)
  const lastStepTimeRef = useRef(0)
  const lastUpdateRef = useRef(0)
  const headingRef = useRef(0)

  // Debounced step detection — minimum 300ms between steps
  const detectStep = useCallback((mag) => {
    const now = Date.now()
    if (mag > 11.5 && (now - lastStepTimeRef.current) > 300) {
      stepsRef.current += 1
      lastStepTimeRef.current = now
    }
  }, [])

  const handleMotion = useCallback((event) => {
    const a = event.accelerationIncludingGravity || {}
    const accel_x = a.x ?? 0
    const accel_y = a.y ?? 0
    const accel_z = a.z ?? 0
    const accel_mag = Math.sqrt(accel_x ** 2 + accel_y ** 2 + accel_z ** 2)

    // Gyroscope — rotation rate in deg/s
    const r = event.rotationRate || {}
    const gyro_alpha = r.alpha ?? 0  // yaw   (turning)
    const gyro_beta = r.beta ?? 0    // pitch (nodding)
    const gyro_gamma = r.gamma ?? 0  // roll  (tilting)

    detectStep(accel_mag)

    // Collect for batch (full speed)
    batchRef.current.push({
      accel_x, accel_y, accel_z, accel_mag,
      gyro_alpha, gyro_beta, gyro_gamma,
      steps: stepsRef.current,
      heading: headingRef.current,
      ts: Date.now(),
    })

    // Throttle UI updates to ~15fps
    const now = Date.now()
    if (now - lastUpdateRef.current < 66) return
    lastUpdateRef.current = now

    setSensors(prev => ({
      ...prev,
      accel_x: +accel_x.toFixed(2),
      accel_y: +accel_y.toFixed(2),
      accel_z: +accel_z.toFixed(2),
      accel_mag: +accel_mag.toFixed(2),
      gyro_alpha: +gyro_alpha.toFixed(1),
      gyro_beta: +gyro_beta.toFixed(1),
      gyro_gamma: +gyro_gamma.toFixed(1),
      steps: stepsRef.current,
      heading: headingRef.current,
      timestamp: now,
    }))
  }, [detectStep])

  const handleOrientation = useCallback((event) => {
    const alpha = event.alpha ?? 0
    const beta = event.beta ?? 0
    const gamma = event.gamma ?? 0

    // Smooth compass heading (exponential moving average)
    headingRef.current = headingRef.current * 0.7 + alpha * 0.3

    setSensors(prev => ({
      ...prev,
      compass: +alpha.toFixed(1),
      tilt_fb: +beta.toFixed(1),
      tilt_lr: +gamma.toFixed(1),
      heading: +headingRef.current.toFixed(1),
    }))
  }, [])

  const requestPermission = useCallback(async () => {
    try {
      if (typeof DeviceMotionEvent !== 'undefined' &&
          typeof DeviceMotionEvent.requestPermission === 'function') {
        const res = await DeviceMotionEvent.requestPermission()
        if (res !== 'granted') {
          setError('Motion sensor permission denied')
          return
        }
      }
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        await DeviceOrientationEvent.requestPermission()
      }
      setGranted(true)
      setError(null)
    } catch (err) {
      setError(`Sensor permission error: ${err.message}`)
    }
  }, [])

  useEffect(() => {
    if (!granted || !enabled) return
    window.addEventListener('devicemotion', handleMotion)
    window.addEventListener('deviceorientation', handleOrientation)
    const batchInterval = setInterval(() => {
      if (batchRef.current.length > 0 && sessionId) {
        const samples = [...batchRef.current]
        batchRef.current = []
        postBatch({ session_id: sessionId, samples }).catch(() => {})
      }
    }, 2000)
    return () => {
      window.removeEventListener('devicemotion', handleMotion)
      window.removeEventListener('deviceorientation', handleOrientation)
      clearInterval(batchInterval)
    }
  }, [granted, enabled, sessionId, handleMotion, handleOrientation])

  useEffect(() => {
    if (typeof DeviceMotionEvent === 'undefined') {
      setGranted(true)
      return
    }
    if (typeof DeviceMotionEvent.requestPermission !== 'function') {
      setGranted(true)
    }
  }, [])

  return { sensors, granted, requestPermission, error }
}
