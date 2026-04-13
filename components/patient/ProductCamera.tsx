'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, RefreshCw, Loader2, Check, X } from 'lucide-react'
import type { RoutineProduct } from '@/types/patient'
import { Badge } from '@/components/ui/badge'

type ScannedResult = {
  identified: boolean
  name: string
  brand: string | null
  category: string | null
  keyIngredients: string[]
  flags: string[]
  summary: string
  confidence: 'high' | 'medium' | 'low'
}

type Props = {
  onProductFound: (product: Omit<RoutineProduct, 'id' | 'status'>) => void
  onClose: () => void
}

export default function ProductCamera({ onProductFound, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScannedResult | null>(null)
  const [scanError, setScanError] = useState(false)

  useEffect(() => {
    async function start() {
      try {
        // Prefer back camera for product scanning (easier to point at labels)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        })
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch {
        // Fall back to any camera
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          streamRef.current = stream
          if (videoRef.current) videoRef.current.srcObject = stream
        } catch {
          setCameraError(true)
        }
      }
    }
    start()
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  useEffect(() => {
    if (!preview && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [preview])

  function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0) // no mirror for product camera
    setPreview(canvas.toDataURL('image/jpeg', 0.9))
  }

  async function scan() {
    if (!preview) return
    setScanning(true)
    setScanError(false)
    try {
      // Strip the data URL prefix to get base64
      const base64 = preview.split(',')[1]
      const res = await fetch('/api/patient/product-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg' }),
      })
      if (!res.ok) throw new Error('Scan failed')
      const data: ScannedResult = await res.json()
      setResult(data)
    } catch {
      setScanError(true)
    } finally {
      setScanning(false)
    }
  }

  function handleAdd() {
    if (!result) return
    onProductFound({
      name: result.name,
      brand: result.brand,
      category: result.category,
      keyIngredients: result.keyIngredients,
      flags: result.flags,
    })
  }

  const CONFIDENCE_COLOUR: Record<string, string> = {
    high:   'bg-green-50 text-green-700 border-green-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low:    'bg-stone-100 text-stone-600 border-stone-200',
  }

  if (cameraError) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="text-stone-500 text-sm">Camera not available on this device.</p>
        <Button variant="outline" onClick={onClose} className="rounded-xl">Close</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Viewfinder */}
      <div className="relative w-full aspect-video bg-stone-900 rounded-2xl overflow-hidden">
        <video
          ref={videoRef}
          autoPlay playsInline muted
          onLoadedMetadata={() => setCameraReady(true)}
          style={{ display: preview ? 'none' : 'block' }}
          className="w-full h-full object-cover"
        />
        {preview && (
          <img src={preview} alt="Captured product"
            className="absolute inset-0 w-full h-full object-cover" />
        )}
        {!cameraReady && !preview && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-900">
            <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
          </div>
        )}
        {/* Crop guide for label */}
        {!preview && cameraReady && (
          <div className="absolute inset-4 border-2 border-white/40 rounded-xl pointer-events-none">
            <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/60">
              Point at the product label
            </p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Scan result */}
      {result && (
        <div className="bg-[#F5F0EB] rounded-2xl p-4 border border-[#E8DDD4]">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-sm font-semibold text-stone-800">{result.name}</p>
              {result.brand && <p className="text-xs text-stone-500">{result.brand}</p>}
              {result.category && <p className="text-xs text-stone-400 capitalize">{result.category}</p>}
            </div>
            <Badge variant="outline" className={`text-[10px] shrink-0 ${CONFIDENCE_COLOUR[result.confidence]}`}>
              {result.confidence} confidence
            </Badge>
          </div>
          {result.summary && (
            <p className="text-xs text-stone-600 mb-2">{result.summary}</p>
          )}
          {result.keyIngredients.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {result.keyIngredients.map(ing => (
                <Badge key={ing} variant="outline"
                  className="text-[10px] px-1.5 py-0 text-stone-500 border-stone-200">
                  {ing}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setResult(null); setPreview(null) }}
              className="flex-1 rounded-xl border-stone-200 text-stone-500 h-9 text-xs">
              <RefreshCw size={12} className="mr-1" /> Try again
            </Button>
            <Button size="sm" onClick={handleAdd}
              className="flex-1 bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white rounded-xl h-9 text-xs">
              <Check size={12} className="mr-1" /> Add product
            </Button>
          </div>
        </div>
      )}

      {scanError && (
        <p className="text-xs text-red-500 text-center">
          Couldn't identify the product. Try a clearer photo of the label.
        </p>
      )}

      {/* Controls */}
      {!result && (
        !preview ? (
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}
              className="flex-1 rounded-xl border-stone-200 text-stone-500 h-12">
              Cancel
            </Button>
            <Button onClick={capture} disabled={!cameraReady}
              className="flex-1 bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white h-12 rounded-xl">
              <Camera size={16} className="mr-2" /> Capture
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setPreview(null)}
              className="flex-1 rounded-xl border-stone-200 text-stone-600 h-12">
              <RefreshCw size={14} className="mr-2" /> Retake
            </Button>
            <Button onClick={scan} disabled={scanning}
              className="flex-1 bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white h-12 rounded-xl">
              {scanning
                ? <><Loader2 size={14} className="animate-spin mr-2" /> Scanning...</>
                : <><Camera size={14} className="mr-2" /> Identify product</>}
            </Button>
          </div>
        )
      )}
    </div>
  )
}
