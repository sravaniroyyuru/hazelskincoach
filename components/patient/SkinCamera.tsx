'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, RefreshCw, Check } from 'lucide-react'

export type PhotoAngle = 'front' | 'left-side' | 'right-side'

const ANGLE_LABELS: Record<PhotoAngle, { label: string; hint: string; emoji: string }> = {
  'front':      { label: 'Front',      hint: 'Face the camera directly',             emoji: '🙂' },
  'left-side':  { label: 'Left side',  hint: 'Turn slightly to show your left cheek', emoji: '👈' },
  'right-side': { label: 'Right side', hint: 'Turn slightly to show your right cheek', emoji: '👉' },
}

type Props = {
  angles: PhotoAngle[]
  onComplete: (photos: Record<PhotoAngle, string>) => void
  onSkip?: () => void
}

export default function SkinCamera({ angles, onComplete, onSkip }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [captured, setCaptured] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)

  const currentAngle = angles[currentIndex]
  const info = ANGLE_LABELS[currentAngle]

  // Start camera once on mount, keep stream alive for all angles
  useEffect(() => {
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch {
        setCameraError(true)
      }
    }
    start()
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  // Re-attach stream to video element whenever we clear the preview
  // (React may have re-mounted the video element)
  useEffect(() => {
    if (!preview && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [preview])

  function handleVideoReady() {
    setCameraReady(true)
  }

  function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')!
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    setPreview(canvas.toDataURL('image/jpeg', 0.85))
  }

  function retake() {
    setPreview(null)
  }

  function accept() {
    if (!preview) return
    const updated = { ...captured, [currentAngle]: preview }
    setCaptured(updated)
    setPreview(null)

    if (currentIndex < angles.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      streamRef.current?.getTracks().forEach(t => t.stop())
      onComplete(updated as Record<PhotoAngle, string>)
    }
  }

  if (cameraError) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="text-stone-500 text-sm">Camera access isn't available on this device.</p>
        <p className="text-stone-400 text-xs">You can add photos later from the Today tab.</p>
        {onSkip && (
          <Button variant="outline" onClick={onSkip}
            className="rounded-xl border-[#7C6B5A] text-[#7C6B5A]">
            Skip for now
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Progress dots */}
      <div className="flex gap-2 justify-center">
        {angles.map((a, i) => (
          <div key={a} className={`h-1.5 rounded-full transition-all duration-300 ${
            i < currentIndex  ? 'w-4 bg-[#7C6B5A]' :
            i === currentIndex ? 'w-6 bg-[#7C6B5A]' : 'w-1.5 bg-stone-300'
          }`} />
        ))}
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="text-base font-semibold text-stone-800">{info.emoji} {info.label}</p>
        <p className="text-xs text-stone-400 mt-0.5">{info.hint}</p>
      </div>

      {/* Viewfinder — video always mounted, preview layered on top */}
      <div className="relative w-full aspect-[3/4] bg-stone-900 rounded-2xl overflow-hidden">
        {/* Video: always in DOM, hidden during preview so srcObject persists */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={handleVideoReady}
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)', display: preview ? 'none' : 'block' }}
        />

        {/* Preview image */}
        {preview && (
          <img src={preview} alt="Preview"
            className="absolute inset-0 w-full h-full object-cover" />
        )}

        {/* Spinner while camera loads */}
        {!cameraReady && !preview && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-900">
            <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
          </div>
        )}

        {/* Face guide oval */}
        {!preview && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-52 rounded-full border-2 border-white/30" />
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      {!preview ? (
        <div className="flex gap-3">
          {onSkip && (
            <Button variant="outline" onClick={onSkip}
              className="flex-1 rounded-xl border-stone-200 text-stone-500 h-12">
              Skip photos
            </Button>
          )}
          <Button onClick={capture} disabled={!cameraReady}
            className="flex-1 bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white h-12 rounded-xl">
            <Camera size={16} className="mr-2" /> Take photo
          </Button>
        </div>
      ) : (
        <div className="flex gap-3">
          <Button variant="outline" onClick={retake}
            className="flex-1 rounded-xl border-stone-200 text-stone-600 h-12">
            <RefreshCw size={14} className="mr-2" /> Retake
          </Button>
          <Button onClick={accept}
            className="flex-1 bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white h-12 rounded-xl">
            <Check size={14} className="mr-2" />
            {currentIndex < angles.length - 1 ? 'Next angle' : 'Done'}
          </Button>
        </div>
      )}

      {/* Captured thumbnails */}
      {Object.keys(captured).length > 0 && (
        <div className="flex gap-2 justify-center">
          {Object.entries(captured).map(([angle, url]) => (
            <div key={angle} className="relative">
              <img src={url} alt={angle}
                className="w-12 h-16 rounded-lg object-cover border-2 border-[#7C6B5A]" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#7C6B5A] rounded-full flex items-center justify-center">
                <Check size={9} className="text-white" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
