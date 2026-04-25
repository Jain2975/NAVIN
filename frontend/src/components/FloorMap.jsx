import { useEffect, useState, useRef } from 'react'
import { getFloorPlanMeta, getFloorPlanUrl } from '../services/api'

/**
 * FloorMap — canvas-based floor map with dead reckoning position.
 * If admin uploaded a floor plan → renders it as background.
 * Otherwise → renders a simple grid placeholder.
 * 
 * Position dot moves based on compass heading + step count (dead reckoning).
 */
export default function FloorMap({ bays = [], sensors = {}, structureId = 'struct_demo_001', floor = 0 }) {
  const canvasRef = useRef(null)
  const [floorPlan, setFloorPlan] = useState(null)
  const [floorPlanImg, setFloorPlanImg] = useState(null)
  const posRef = useRef({ x: 250, y: 350 })  // start near bottom center
  const lastStepsRef = useRef(0)

  // Check for uploaded floor plan
  useEffect(() => {
    getFloorPlanMeta(structureId, floor)
      .then(res => {
        if (res.data.exists) {
          setFloorPlan(res.data)
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = getFloorPlanUrl(structureId, floor)
          img.onload = () => setFloorPlanImg(img)
        }
      })
      .catch(() => {})
  }, [structureId, floor])

  // Dead reckoning: update position when steps increase
  useEffect(() => {
    const currentSteps = sensors.steps || 0
    if (currentSteps > lastStepsRef.current) {
      const newSteps = currentSteps - lastStepsRef.current
      lastStepsRef.current = currentSteps

      // Move in heading direction, ~12px per step
      const headingRad = ((sensors.heading || 0) * Math.PI) / 180
      const stepSize = 12
      const dx = Math.sin(headingRad) * stepSize * newSteps
      const dy = -Math.cos(headingRad) * stepSize * newSteps

      posRef.current = {
        x: Math.max(20, Math.min(480, posRef.current.x + dx)),
        y: Math.max(20, Math.min(380, posRef.current.y + dy)),
      }
    }
  }, [sensors.steps, sensors.heading])

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height

    // Clear
    ctx.fillStyle = '#0f1729'
    ctx.fillRect(0, 0, W, H)

    // Draw floor plan or grid
    if (floorPlanImg) {
      ctx.globalAlpha = 0.85
      ctx.drawImage(floorPlanImg, 0, 0, W, H)
      ctx.globalAlpha = 1.0
    } else {
      // Grid placeholder
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += 25) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }
      for (let y = 0; y < H; y += 25) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.font = '12px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('No floor plan uploaded — upload via Admin → Map tab', W / 2, H / 2 - 10)
      ctx.fillText(`Floor ${floor + 1}`, W / 2, H / 2 + 10)
    }

    // Draw bays
    const floorBays = bays.filter(b => b.floor === floor)
    const cols = 5
    floorBays.forEach((bay, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const bx = 40 + col * 90
      const by = 40 + row * 70

      // Bay rectangle
      const isFree = bay.status === 'free'
      ctx.fillStyle = isFree ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'
      ctx.strokeStyle = isFree ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(bx, by, 70, 50, 6)
      ctx.fill()
      ctx.stroke()

      // Bay label
      ctx.fillStyle = isFree ? '#10b981' : '#ef4444'
      ctx.font = 'bold 12px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(bay.bay_number, bx + 35, by + 25)

      // EV indicator
      if (bay.bay_type === 'ev') {
        ctx.fillStyle = '#fbbf24'
        ctx.font = '10px sans-serif'
        ctx.fillText('⚡', bx + 35, by + 42)
      }

      // Status dot
      ctx.beginPath()
      ctx.arc(bx + 60, by + 10, 4, 0, Math.PI * 2)
      ctx.fillStyle = isFree ? '#10b981' : '#ef4444'
      ctx.fill()
    })

    // Draw position dot with heading arrow
    const px = posRef.current.x
    const py = posRef.current.y

    // Glow
    const glow = ctx.createRadialGradient(px, py, 0, px, py, 20)
    glow.addColorStop(0, 'rgba(99,102,241,0.4)')
    glow.addColorStop(1, 'rgba(99,102,241,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(px, py, 20, 0, Math.PI * 2)
    ctx.fill()

    // Dot
    ctx.beginPath()
    ctx.arc(px, py, 8, 0, Math.PI * 2)
    ctx.fillStyle = '#6366f1'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    // Heading arrow
    const headingRad = ((sensors.heading || 0) * Math.PI) / 180
    const arrowLen = 18
    const ax = px + Math.sin(headingRad) * arrowLen
    const ay = py - Math.cos(headingRad) * arrowLen
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(ax, ay)
    ctx.strokeStyle = '#a5b4fc'
    ctx.lineWidth = 2
    ctx.stroke()

    // Arrow tip
    ctx.beginPath()
    ctx.arc(ax, ay, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#a5b4fc'
    ctx.fill()

    // Info text
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '10px Inter, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Steps: ${sensors.steps || 0}  Heading: ${(sensors.heading || 0).toFixed(0)}°`, 10, H - 10)

  }, [bays, sensors, floorPlanImg, floor])

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <canvas
        ref={canvasRef}
        width={500}
        height={400}
        className="w-full"
        style={{ imageRendering: 'crisp-edges' }}
      />
    </div>
  )
}
