'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { PhotoSet } from '@/types/patient'
import { Loader2, Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getComparisonCache, saveComparisonCache, getSnapshot } from '@/lib/patient/storage'

type Props = {
  earliest: PhotoSet
  latest: PhotoSet
}

function getFrontPhoto(set: PhotoSet): string | null {
  return set.photos.find(p => p.angle === 'front')?.dataUrl ?? set.photos[0]?.dataUrl ?? null
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PhotoComparison({ earliest, latest }: Props) {
  const [sliderPos, setSliderPos] = useState(50) // percentage
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [comparisonSummary, setComparisonSummary] = useState<string | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [summaryError, setSummaryError] = useState(false)

  const earliestPhoto = getFrontPhoto(earliest)
  const latestPhoto = getFrontPhoto(latest)
  const isSameDate = earliest.date === latest.date

  // Load cached comparison on mount
  useEffect(() => {
    if (isSameDate) return
    const cached = getComparisonCache(earliest.date, latest.date)
    if (cached) setComparisonSummary(cached)
  }, [earliest.date, latest.date, isSameDate])

  const updateSlider = useCallback((clientX: number) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const pos = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100))
    setSliderPos(pos)
  }, [])

  function handleMouseDown() { setIsDragging(true) }
  function handleMouseUp() { setIsDragging(false) }
  function handleMouseMove(e: React.MouseEvent) { if (isDragging) updateSlider(e.clientX) }
  function handleTouchMove(e: React.TouchEvent) { updateSlider(e.touches[0].clientX) }

  useEffect(() => {
    const up = () => setIsDragging(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  async function loadComparison() {
    if (!earliestPhoto || !latestPhoto || isSameDate) return
    setIsLoadingSummary(true)
    setSummaryError(false)
    try {
      const snap = getSnapshot()
      const res = await fetch('/api/patient/photo-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'compare',
          photoA: earliestPhoto.split(',')[1],
          photoB: latestPhoto.split(',')[1],
          dateA: formatDate(earliest.date),
          dateB: formatDate(latest.date),
          context: { skinType: snap.skinType, concerns: snap.concerns },
        }),
      })
      const data = await res.json()
      if (data.summary) {
        setComparisonSummary(data.summary)
        saveComparisonCache(earliest.date, latest.date, data.summary)
      }
    } catch {
      setSummaryError(true)
    } finally {
      setIsLoadingSummary(false)
    }
  }

  if (!earliestPhoto || !latestPhoto) return null

  return (
    <div className="flex flex-col gap-4">
      {isSameDate ? (
        // Single photo — no slider
        <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-stone-900">
          <img src={latestPhoto} alt="Skin photo"
            className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full">
            {formatDate(latest.date)}
          </div>
        </div>
      ) : (
        // Side-by-side slider
        <div
          ref={containerRef}
          className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-stone-900 select-none cursor-col-resize"
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
        >
          {/* Earliest (left) */}
          <img src={earliestPhoto} alt="Earlier"
            className="absolute inset-0 w-full h-full object-cover" />

          {/* Latest (right) clipped */}
          <div className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}>
            <img src={latestPhoto} alt="Latest"
              className="absolute inset-0 w-full h-full object-cover" />
          </div>

          {/* Divider line */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
            style={{ left: `${sliderPos}%` }} />

          {/* Drag handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center cursor-col-resize z-10"
            style={{ left: `${sliderPos}%` }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
          >
            <div className="flex gap-0.5">
              <div className="w-0.5 h-3 bg-stone-400 rounded-full" />
              <div className="w-0.5 h-3 bg-stone-400 rounded-full" />
            </div>
          </div>

          {/* Date labels */}
          <div className="absolute bottom-2 left-2 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full">
            {formatDate(earliest.date)}
          </div>
          <div className="absolute bottom-2 right-2 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full">
            {formatDate(latest.date)}
          </div>
        </div>
      )}

      {/* AI comparison summary */}
      {!isSameDate && (
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Leaf size={12} className="text-[#C17A5A]" />
            <span className="text-xs font-medium text-[#C17A5A] uppercase tracking-wide">
              Hazel's take
            </span>
          </div>

          {comparisonSummary ? (
            <p className="text-sm text-stone-600 leading-relaxed">{comparisonSummary}</p>
          ) : isLoadingSummary ? (
            <div className="flex items-center gap-2">
              <Loader2 size={13} className="animate-spin text-stone-400" />
              <p className="text-sm text-stone-400 italic">Comparing your photos…</p>
            </div>
          ) : summaryError ? (
            <p className="text-xs text-stone-400">Couldn't generate a comparison right now.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-stone-400">
                See how your skin has changed from {formatDate(earliest.date)} to {formatDate(latest.date)}.
              </p>
              <Button variant="outline" size="sm" onClick={loadComparison}
                className="self-start h-7 text-xs rounded-xl border-[#C17A5A] text-[#C17A5A]">
                Analyse changes
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
