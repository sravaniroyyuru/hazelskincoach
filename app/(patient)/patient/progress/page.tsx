'use client'

import { useState, useEffect } from 'react'
import { getRecentCheckins, getRoutineStreak, getSnapshot, getPhotoSets } from '@/lib/patient/storage'
import type { CheckInRecord, PhotoSet } from '@/types/patient'
import { motion } from 'framer-motion'
import { Flame, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import PhotoComparison from '@/components/patient/PhotoComparison'

const SKIN_FEEL_SCORE: Record<string, number> = { great: 4, good: 3, meh: 2, bad: 1 }
const BREAKOUT_SCORE: Record<string, number> = { none: 4, minor: 3, moderate: 2, bad: 1 }
const ROUTINE_SCORE: Record<string, number> = { full: 3, partial: 2, skipped: 0 }
const PICKING_SCORE: Record<string, number> = { none: 3, 'a-bit': 2, yes: 0 }

function checkinScore(c: CheckInRecord): number {
  return (
    (SKIN_FEEL_SCORE[c.skinFeel] ?? 0) +
    (BREAKOUT_SCORE[c.breakouts] ?? 0) +
    (ROUTINE_SCORE[c.routine] ?? 0) +
    (PICKING_SCORE[c.picking] ?? 0)
  ) / 13 // max 13
}

const SKIN_FEEL_LABELS: Record<string, { label: string; emoji: string }> = {
  great: { label: 'Great', emoji: '✨' },
  good: { label: 'Good', emoji: '🙂' },
  meh: { label: 'Meh', emoji: '😐' },
  bad: { label: 'Rough', emoji: '😣' },
}

const BREAKOUT_LABELS: Record<string, { label: string; emoji: string }> = {
  none: { label: 'Clear', emoji: '🙌' },
  minor: { label: 'Minor', emoji: '😌' },
  moderate: { label: 'A few', emoji: '😕' },
  bad: { label: 'Breaking out', emoji: '😩' },
}

export default function ProgressPage() {
  const [checkins, setCheckins] = useState<CheckInRecord[]>([])
  const [streak, setStreak] = useState(0)
  const [userName, setUserName] = useState('')
  const [photoSets, setPhotoSets] = useState<PhotoSet[]>([])

  useEffect(() => {
    setCheckins(getRecentCheckins(14))
    setStreak(getRoutineStreak())
    setUserName(getSnapshot().userName)
    const sets = getPhotoSets()
    setPhotoSets(sets.sort((a, b) => a.date.localeCompare(b.date)))
  }, [])

  const last7 = checkins.slice(0, 7)
  const prior7 = checkins.slice(7, 14)

  const avgScore = last7.length
    ? last7.reduce((acc, c) => acc + checkinScore(c), 0) / last7.length
    : null

  const priorAvg = prior7.length
    ? prior7.reduce((acc, c) => acc + checkinScore(c), 0) / prior7.length
    : null

  const trend = avgScore !== null && priorAvg !== null
    ? avgScore > priorAvg + 0.05 ? 'improving'
      : avgScore < priorAvg - 0.05 ? 'declining'
      : 'stable'
    : null

  const routineAdherence = last7.length
    ? Math.round((last7.filter(c => c.routine !== 'skipped').length / last7.length) * 100)
    : null

  const pickingFreedays = last7.filter(c => c.picking === 'none').length

  const mostCommonFeel = last7.length
    ? Object.entries(
        last7.reduce((acc, c) => {
          acc[c.skinFeel] = (acc[c.skinFeel] ?? 0) + 1
          return acc
        }, {} as Record<string, number>)
      ).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null

  return (
    <div className="px-5 pt-8 pb-4">
      <h1 className="text-xl font-semibold text-stone-800 mb-1">Progress</h1>
      <p className="text-stone-500 text-sm mb-6">Your last 7 days at a glance.</p>

      {checkins.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-stone-100">
          <p className="text-stone-400 text-sm">No check-ins yet.</p>
          <p className="text-stone-400 text-xs mt-1">Complete your daily check-in to start tracking progress.</p>
        </div>
      ) : (
        <>
          {/* Trend card */}
          <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-stone-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-stone-700">This week</h2>
              {trend && (
                <div className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                  trend === 'improving' ? 'bg-green-50 text-green-700' :
                  trend === 'declining' ? 'bg-red-50 text-red-700' :
                  'bg-stone-100 text-stone-600'
                }`}>
                  {trend === 'improving' ? <TrendingUp size={12} /> :
                   trend === 'declining' ? <TrendingDown size={12} /> :
                   <Minus size={12} />}
                  {trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Declining' : 'Stable'}
                </div>
              )}
            </div>

            {/* Mini bar chart */}
            <div className="flex items-end gap-1.5 h-16 mb-3">
              {[...Array(7)].map((_, i) => {
                const dayOffset = 6 - i
                const d = new Date()
                d.setDate(d.getDate() - dayOffset)
                const dateStr = d.toISOString().split('T')[0]
                const c = checkins.find(ci => ci.date === dateStr)
                const score = c ? checkinScore(c) : 0
                const isToday = dayOffset === 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-sm transition-all" style={{
                      height: `${Math.max(score * 100, c ? 8 : 4)}%`,
                      backgroundColor: c
                        ? isToday ? '#7C6B5A' : '#C4B5A5'
                        : '#E7E5E4',
                    }} />
                    <span className="text-[9px] text-stone-400">
                      {d.toLocaleDateString('en-GB', { weekday: 'narrow' })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <Flame size={14} className="text-amber-500" />
                <span className="text-xs text-stone-500">Streak</span>
              </div>
              <p className="text-2xl font-bold text-stone-800">{streak}</p>
              <p className="text-xs text-stone-400">days</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar size={14} className="text-[#7C6B5A]" />
                <span className="text-xs text-stone-500">Routine</span>
              </div>
              <p className="text-2xl font-bold text-stone-800">
                {routineAdherence !== null ? `${routineAdherence}%` : '—'}
              </p>
              <p className="text-xs text-stone-400">adherence</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
              <div className="mb-1">
                <span className="text-xs text-stone-500">Skin feel</span>
              </div>
              {mostCommonFeel ? (
                <>
                  <p className="text-xl">{SKIN_FEEL_LABELS[mostCommonFeel]?.emoji}</p>
                  <p className="text-xs text-stone-400">{SKIN_FEEL_LABELS[mostCommonFeel]?.label} most days</p>
                </>
              ) : <p className="text-stone-400 text-sm">—</p>}
            </div>

            <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
              <div className="mb-1">
                <span className="text-xs text-stone-500">Hands-off</span>
              </div>
              <p className="text-2xl font-bold text-stone-800">{pickingFreedays}/7</p>
              <p className="text-xs text-stone-400">days no picking</p>
            </div>
          </div>

          {/* Photo comparison */}
          {photoSets.length >= 1 && (
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-stone-700 mb-3">Skin over time</h2>
              <PhotoComparison
                earliest={photoSets[0]}
                latest={photoSets[photoSets.length - 1]}
              />
            </div>
          )}

          {/* Recent check-ins */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
            <h2 className="text-sm font-semibold text-stone-700 mb-4">Recent check-ins</h2>
            <div className="flex flex-col gap-3">
              {last7.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-medium text-stone-700">
                      {new Date(c.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <div className="flex gap-1.5 mt-1">
                      <span className="text-xs text-stone-400">
                        {SKIN_FEEL_LABELS[c.skinFeel]?.emoji} {SKIN_FEEL_LABELS[c.skinFeel]?.label}
                      </span>
                      <span className="text-stone-300">·</span>
                      <span className="text-xs text-stone-400">
                        {BREAKOUT_LABELS[c.breakouts]?.emoji} {BREAKOUT_LABELS[c.breakouts]?.label}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      c.routine === 'full' ? 'border-green-200 text-green-600 bg-green-50' :
                      c.routine === 'partial' ? 'border-amber-200 text-amber-600 bg-amber-50' :
                      'border-stone-200 text-stone-400'
                    }`}
                  >
                    {c.routine === 'full' ? '✓ Full' : c.routine === 'partial' ? '~ Partial' : '✗ Skipped'}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
