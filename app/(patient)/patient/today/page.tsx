'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getSnapshot, getTodayCheckin, saveCheckin, getRoutineStreak,
  getTodayPhotoSet, savePhotoSet, saveAnalysis, getAnalysis, isNudgeDismissed,
} from '@/lib/patient/storage'
import type { CheckIn, CheckInRecord, SkinAnalysis } from '@/types/patient'
import type { PhotoAngle } from '@/components/patient/SkinCamera'
import SkinCamera from '@/components/patient/SkinCamera'
import VoiceInput from '@/components/patient/VoiceInput'
import SkinAnalysisCard from '@/components/patient/SkinAnalysisCard'
import DermNudgeCard from '@/components/patient/DermNudgeCard'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Leaf, Flame, CheckCircle2, Circle, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import Link from 'next/link'

const CHECK_IN_QUESTIONS = [
  {
    key: 'skinFeel' as keyof CheckIn,
    question: 'How does your skin feel today?',
    options: [
      { value: 'great',  label: 'Great',  emoji: '✨' },
      { value: 'good',   label: 'Good',   emoji: '🙂' },
      { value: 'meh',    label: 'Meh',    emoji: '😐' },
      { value: 'bad',    label: 'Rough',  emoji: '😣' },
    ],
  },
  {
    key: 'breakouts' as keyof CheckIn,
    question: 'Any new breakouts?',
    options: [
      { value: 'none',     label: 'None',       emoji: '🙌' },
      { value: 'minor',    label: 'Minor',      emoji: '😌' },
      { value: 'moderate', label: 'A few',      emoji: '😕' },
      { value: 'bad',      label: 'Quite a few', emoji: '😩' },
    ],
  },
  {
    key: 'routine' as keyof CheckIn,
    question: 'Did you do your routine?',
    options: [
      { value: 'full',    label: 'Full routine', emoji: '💯' },
      { value: 'partial', label: 'Partial',      emoji: '🤏' },
      { value: 'skipped', label: 'Skipped',      emoji: '😅' },
    ],
  },
  {
    key: 'picking' as keyof CheckIn,
    question: 'Any picking or touching?',
    options: [
      { value: 'none',  label: 'Hands off', emoji: '🙌' },
      { value: 'a-bit', label: 'A little',  emoji: '😬' },
      { value: 'yes',   label: 'Yes',       emoji: '😔' },
    ],
  },
  {
    key: 'mood' as keyof CheckIn,
    question: 'How\'s your mood?',
    options: [
      { value: 'great',   label: 'Great',   emoji: '😄' },
      { value: 'good',    label: 'Good',    emoji: '🙂' },
      { value: 'meh',     label: 'Meh',     emoji: '😐' },
      { value: 'stressed', label: 'Stressed', emoji: '😰' },
    ],
  },
]

const PHOTO_ANGLES: PhotoAngle[] = ['front', 'left-side', 'right-side']

export default function TodayPage() {
  const [snap, setSnap] = useState(() => getSnapshot())
  const [todayCheckin, setTodayCheckin] = useState<CheckInRecord | null>(null)
  const [checkIn, setCheckIn] = useState<Partial<CheckIn>>({})
  const [questionIndex, setQuestionIndex] = useState(0)
  const [showDermNote, setShowDermNote] = useState(false)
  const [dermNote, setDermNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [streak, setStreak] = useState(0)
  const [amChecks, setAmChecks] = useState<Record<string, boolean>>({})
  const [pmChecks, setPmChecks] = useState<Record<string, boolean>>({})

  // Voice note state
  const [voiceNote, setVoiceNote] = useState('')
  const [showVoiceNote, setShowVoiceNote] = useState(false)

  // Photo + analysis state
  const [showPhotoDialog, setShowPhotoDialog] = useState(false)
  const [todayPhotos, setTodayPhotos] = useState(false)
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<SkinAnalysis | null>(null)
  const [showNudge, setShowNudge] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const existing = getTodayCheckin()
    setTodayCheckin(existing)
    setSubmitted(!!existing)
    setStreak(getRoutineStreak())
    setSnap(getSnapshot())
    setTodayPhotos(!!getTodayPhotoSet())
    // Load any existing analysis for today
    const existingAnalysis = getAnalysis(new Date().toISOString().split('T')[0])
    if (existingAnalysis) {
      setAnalysisResult(existingAnalysis)
      if (existingAnalysis.notableFindings.length > 0 && !isNudgeDismissed(existingAnalysis.date)) {
        setShowNudge(true)
      }
    }
  }, [])

  const amSteps = snap.routineSteps.filter(s => s.timeOfDay === 'am' && !s.isPaused)
  const pmSteps = snap.routineSteps.filter(s => s.timeOfDay === 'pm' && !s.isPaused)

  function handleAnswer(key: keyof CheckIn, value: string) {
    const updated = { ...checkIn, [key]: value }
    setCheckIn(updated)
    if (questionIndex < CHECK_IN_QUESTIONS.length - 1) {
      setTimeout(() => setQuestionIndex(i => i + 1), 300)
    } else {
      const shouldShowDermNote = updated.skinFeel === 'bad' || updated.breakouts === 'bad'
      setShowDermNote(shouldShowDermNote)
    }
  }

  function handleSubmit() {
    const record: CheckInRecord = {
      id: uuidv4(),
      date: new Date().toISOString().split('T')[0],
      ...(checkIn as CheckIn),
      dermNote: [dermNote, voiceNote].filter(Boolean).join('\n') || undefined,
    }
    saveCheckin(record)
    setTodayCheckin(record)
    setSubmitted(true)
    toast.success('Check-in saved 🌿')
  }

  function handleVoiceTranscript(text: string) {
    setVoiceNote(prev => prev ? `${prev} ${text}` : text)
    setShowVoiceNote(true)
  }

  async function handlePhotosComplete(photos: Record<PhotoAngle, string>) {
    const dateStr = new Date().toISOString().split('T')[0]
    savePhotoSet({
      date: dateStr,
      photos: (Object.entries(photos) as [PhotoAngle, string][]).map(([angle, dataUrl]) => ({
        angle,
        dataUrl,
      })),
    })
    setTodayPhotos(true)
    setShowPhotoDialog(false)
    toast.success("Today's skin photos saved 🌿")

    // Auto-trigger analysis
    const frontPhoto = photos['front']
    if (!frontPhoto) return
    setIsAnalysing(true)
    try {
      const snap = getSnapshot()
      const res = await fetch('/api/patient/photo-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single',
          frontPhoto: frontPhoto.split(',')[1],
          context: { skinType: snap.skinType, concerns: snap.concerns },
        }),
      })
      const data = await res.json()
      if (data.summary) {
        const analysis: SkinAnalysis = { ...data, date: dateStr }
        saveAnalysis(analysis)
        setAnalysisResult(analysis)
        if (analysis.notableFindings.length > 0 && !isNudgeDismissed(analysis.date)) {
          setShowNudge(true)
        }
      }
    } catch {
      // silently fail — not critical
    } finally {
      setIsAnalysing(false)
    }
  }

  const allAnswered = CHECK_IN_QUESTIONS.every(q => checkIn[q.key])
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  return (
    <div className="px-5 pt-8 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-1.5 text-[#7C6B5A] mb-0.5">
            <Leaf size={14} />
            <span className="text-xs font-medium tracking-wide uppercase">hazel</span>
          </div>
          <h1 className="text-xl font-semibold text-stone-800">
            Good {greeting}, {snap.userName} 👋
          </h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <Flame size={16} className="text-amber-500" />
          <span className="text-sm font-semibold text-amber-700">{streak}</span>
        </div>
      </div>

      {/* Check-in */}
      {!submitted ? (
        <div className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-stone-100">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">Today's check-in</h2>

          <AnimatePresence mode="wait">
            {CHECK_IN_QUESTIONS.slice(0, questionIndex + 1).map((q, i) =>
              i === questionIndex ? (
                <motion.div key={q.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <p className="text-sm text-stone-600 mb-3">{q.question}</p>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map(opt => (
                      <button key={opt.value} onClick={() => handleAnswer(q.key, opt.value)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-colors ${
                          checkIn[q.key] === opt.value
                            ? 'border-[#7C6B5A] bg-[#F5F0EB] text-stone-800'
                            : 'border-stone-200 bg-stone-50 text-stone-600'
                        }`}>
                        <span>{opt.emoji}</span> {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : null
            )}
          </AnimatePresence>

          {/* Previous answers */}
          {questionIndex > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4 mt-3">
              {CHECK_IN_QUESTIONS.slice(0, questionIndex).map(q => {
                const opt = q.options.find(o => o.value === checkIn[q.key])
                return opt ? (
                  <span key={q.key} className="text-xs bg-[#F5F0EB] text-stone-600 rounded-full px-2.5 py-1">
                    {opt.emoji} {opt.label}
                  </span>
                ) : null
              })}
            </div>
          )}

          {/* Derm note */}
          {allAnswered && showDermNote && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
              <p className="text-xs text-stone-500 mb-2">Sounds like a tough day. Want to note anything for your derm?</p>
              <Textarea placeholder="e.g. bad flare on left cheek, possible reaction to new SPF..."
                value={dermNote} onChange={e => setDermNote(e.target.value)}
                className="text-sm resize-none h-20 border-stone-200" />
            </motion.div>
          )}

          {/* Voice note section */}
          {allAnswered && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-4 border-t border-stone-100">
              <p className="text-xs text-stone-500 mb-2">Anything else to note? Speak or type.</p>
              <div className="flex items-start gap-2">
                <VoiceInput
                  onTranscript={handleVoiceTranscript}
                  placeholder="Tap mic to add a voice note"
                />
              </div>
              {showVoiceNote && (
                <Textarea
                  value={voiceNote}
                  onChange={e => setVoiceNote(e.target.value)}
                  placeholder="Your note..."
                  className="mt-2 text-sm resize-none h-16 border-stone-200"
                />
              )}
              {!showVoiceNote && (
                <button onClick={() => setShowVoiceNote(true)}
                  className="text-xs text-stone-400 hover:text-stone-600 mt-1 ml-12">
                  or type a note
                </button>
              )}
            </motion.div>
          )}

          {allAnswered && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
              <Button onClick={handleSubmit}
                className="w-full bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white rounded-xl">
                Save check-in
              </Button>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="bg-[#F5F0EB] rounded-2xl p-5 mb-5 border border-[#E8DDD4]">
          <div className="flex items-center gap-2 text-[#7C6B5A]">
            <CheckCircle2 size={16} />
            <span className="text-sm font-medium">Check-in complete for today</span>
          </div>
          {todayCheckin?.dermNote && (
            <p className="text-xs text-stone-500 mt-2 pl-6 italic">{todayCheckin.dermNote}</p>
          )}
        </div>
      )}

      {/* Skin photo update */}
      <div className={`rounded-2xl p-4 mb-4 border flex items-center justify-between ${
        todayPhotos
          ? 'bg-[#F5F0EB] border-[#E8DDD4]'
          : 'bg-white border-stone-100 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
            todayPhotos ? 'bg-[#7C6B5A]' : 'bg-stone-100'
          }`}>
            <Camera size={15} className={todayPhotos ? 'text-white' : 'text-stone-500'} />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-800">
              {todayPhotos ? "Today's photos saved" : 'Update skin photos'}
            </p>
            <p className="text-xs text-stone-400">
              {todayPhotos ? 'Front + side profile captured' : 'Front & side profile'}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPhotoDialog(true)}
          className={`rounded-xl text-xs h-8 ${
            todayPhotos
              ? 'border-[#7C6B5A] text-[#7C6B5A]'
              : 'border-stone-200 text-stone-600'
          }`}>
          {todayPhotos ? 'Retake' : 'Take photos'}
        </Button>
      </div>

      {/* Skin analysis */}
      <AnimatePresence>
        {isAnalysing && (
          <motion.div key="analysing" className="mb-4">
            <SkinAnalysisCard isLoading />
          </motion.div>
        )}
        {!isAnalysing && analysisResult && (
          <motion.div key="analysis" className="mb-4">
            <SkinAnalysisCard analysis={analysisResult} />
          </motion.div>
        )}
        {showNudge && analysisResult && (
          <motion.div key="nudge" className="mb-4">
            <DermNudgeCard
              nudgeId={analysisResult.date}
              findings={analysisResult.notableFindings}
              onDismiss={() => setShowNudge(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* AM Routine */}
      {amSteps.length > 0 && (
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-stone-100">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">☀️ Morning routine</h2>
          <div className="flex flex-col gap-2">
            {amSteps.map(step => (
              <button key={step.id}
                onClick={() => setAmChecks(prev => ({ ...prev, [step.id]: !prev[step.id] }))}
                className="flex items-center gap-3 text-left">
                {amChecks[step.id]
                  ? <CheckCircle2 size={18} className="text-[#7C6B5A] shrink-0" />
                  : <Circle size={18} className="text-stone-300 shrink-0" />}
                <div>
                  <p className={`text-sm ${amChecks[step.id] ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                    {step.stepName}
                  </p>
                  {step.product && <p className="text-xs text-stone-400">{step.product.name}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PM Routine */}
      {pmSteps.length > 0 && (
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-stone-100">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">🌙 Evening routine</h2>
          <div className="flex flex-col gap-2">
            {pmSteps.map(step => (
              <button key={step.id}
                onClick={() => setPmChecks(prev => ({ ...prev, [step.id]: !prev[step.id] }))}
                className="flex items-center gap-3 text-left">
                {pmChecks[step.id]
                  ? <CheckCircle2 size={18} className="text-[#7C6B5A] shrink-0" />
                  : <Circle size={18} className="text-stone-300 shrink-0" />}
                <div>
                  <p className={`text-sm ${pmChecks[step.id] ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                    {step.stepName}
                  </p>
                  {step.product && <p className="text-xs text-stone-400">{step.product.name}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {amSteps.length === 0 && pmSteps.length === 0 && (
        <div className="bg-white rounded-2xl p-5 mb-4 text-center border border-stone-100">
          <p className="text-stone-500 text-sm mb-3">No routine steps yet.</p>
          <Link href="/patient/routine">
            <Button variant="outline" size="sm" className="rounded-xl border-[#7C6B5A] text-[#7C6B5A]">
              Build your routine
            </Button>
          </Link>
        </div>
      )}

      {/* Photo dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Update skin photos</DialogTitle>
          </DialogHeader>
          <SkinCamera
            angles={PHOTO_ANGLES}
            onComplete={handlePhotosComplete}
            onSkip={() => setShowPhotoDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
