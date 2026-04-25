// States
export const ACTIVITY = {
  UNKNOWN: 'unknown',
  WALKING: 'walking',
  STATIONARY: 'stationary',
  PARKED: 'parked',
}

// Thresholds — tune these during testing
const WALK_THRESHOLD = 1.2     // accel magnitude variance to count as walking
const STATIONARY_WINDOW = 8000 // ms stationary before considering PARKED
const WALKING_MIN_STEPS = 3    // minimum steps to confirm WALKING state

export class ActivityClassifier {
  constructor() {
    this.state = ACTIVITY.UNKNOWN
    this.stationarySince = null
    this.stepCount = 0
    this.recentMagnitudes = []     // rolling window of last 20 accel readings
    this.onStateChange = null      // callback: (newState, oldState) => void
  }

  // Call this from useSensors on every devicemotion event
  update({ accel_mag, steps }) {
    const now = Date.now()

    // Rolling window of magnitudes
    this.recentMagnitudes.push(accel_mag)
    if (this.recentMagnitudes.length > 20) this.recentMagnitudes.shift()

    const variance = this._variance(this.recentMagnitudes)
    const isMoving = variance > WALK_THRESHOLD

    const prev = this.state

    if (isMoving) {
      this.stationarySince = null
      if (steps > WALKING_MIN_STEPS) {
        this.state = ACTIVITY.WALKING
      }
    } else {
      if (!this.stationarySince) this.stationarySince = now
      const stationaryMs = now - this.stationarySince

      if (stationaryMs < 2000) {
        this.state = ACTIVITY.STATIONARY
      } else if (stationaryMs >= STATIONARY_WINDOW) {
        this.state = ACTIVITY.PARKED
      }
    }

    if (this.state !== prev && this.onStateChange) {
      this.onStateChange(this.state, prev)
    }

    return this.state
  }

  reset() {
    this.state = ACTIVITY.UNKNOWN
    this.stationarySince = null
    this.stepCount = 0
    this.recentMagnitudes = []
  }

  _variance(arr) {
    if (arr.length < 2) return 0
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length
    return arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length
  }
}
