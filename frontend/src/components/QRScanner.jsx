import { useRef, useEffect, useCallback, useState } from 'react'
import jsQR from 'jsqr'

/**
 * QRScanner — opens camera, decodes QR at 10fps with half-resolution for speed.
 * 2-second debounce prevents double-scans.
 * 
 * Props:
 *   onDecode(data: object) — called with parsed JSON from QR
 *   onError(msg: string) — called on camera/decode errors
 */
export default function QRScanner({ onDecode, onError }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const debounceRef = useRef(false)
  const intervalRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraReady, setCameraReady] = useState(false)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', true)
        await videoRef.current.play()
        setCameraReady(true)
      }
    } catch (err) {
      onError?.(`Camera access denied: ${err.message}`)
    }
  }, [onError])

  const scan = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const w = Math.floor(video.videoWidth / 2)   // half resolution = 4x faster decode
    const h = Math.floor(video.videoHeight / 2)
    canvas.width = w
    canvas.height = h
    ctx.drawImage(video, 0, 0, w, h)

    const imageData = ctx.getImageData(0, 0, w, h)
    const code = jsQR(imageData.data, imageData.width, imageData.height)

    if (code && !debounceRef.current) {
      debounceRef.current = true
      try {
        const data = JSON.parse(code.data)
        onDecode?.(data)
      } catch {
        onError?.('QR code is not valid JSON')
      }
      setTimeout(() => { debounceRef.current = false }, 2000)
    }
  }, [onDecode, onError])

  useEffect(() => {
    startCamera()
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [startCamera])

  useEffect(() => {
    if (cameraReady) {
      intervalRef.current = setInterval(scan, 100)  // 10fps
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [cameraReady, scan])

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black/50">
      <video
        ref={videoRef}
        className="w-full h-64 object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Scanning overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 border-2 border-navin-400/60 rounded-2xl relative">
          {/* Corner accents */}
          <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-navin-400 rounded-tl-lg" />
          <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-navin-400 rounded-tr-lg" />
          <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-navin-400 rounded-bl-lg" />
          <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-navin-400 rounded-br-lg" />
          {/* Scan line animation */}
          <div className="absolute left-2 right-2 h-0.5 bg-navin-400/80 animate-bounce" style={{ top: '50%' }} />
        </div>
      </div>

      {!cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 rounded-full border-2 border-navin-400 border-t-transparent animate-spin" />
            <p className="text-white/60 text-sm">Opening camera…</p>
          </div>
        </div>
      )}
    </div>
  )
}
