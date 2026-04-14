'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getSnapshot, getTodayCheckin, saveCheckin, getRoutineStreak,
  getTodayPhotoSet, savePhotoSet, saveAnalysis, getAnalysis, isNudgeDismissed,
  getRoutineCompletions, saveRoutineCompletion, getDailyBrief, saveDailyBrief,
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
import {
  Leaf, Flame, CheckCircle2, Circle, Camera, Mic, Square,
  Loader2, Sparkles, ChevronRight, TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import Link from 'next/link'

// ── SpeechRecognition types ──────────────────────────────────────────────────
type SR = {
  continuous: boolean; interimResults: boolean; lang: string
  onstart: (() => void) | null; onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null
  start: () => void; stop: () => void
}
declare global {
  interface Window { SpeechRecognition: new () => SR; webkitSpeechRecognition: new () => SR }
}

// ── Check-in questions ───────────────────────────────────────────────────────
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
      { value: 'none',     label: 'None',        emoji: '🙌' },
      { value: 'minor',    label: 'Minor',       emoji: '😌' },
      { value: 'moderate', label: 'A few',       emoji: '😕' },
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
    question: "How's your mood?",
    options: [
      { value: 'great',   label: 'Great',   emoji: '😄' },
      { value: 'good',    label: 'Good',    emoji: '🙂' },
      { value: 'meh',     label: 'Meh',     emoji: '😐' },
      { value: 'stressed', label: 'Stressed', emoji: '😰' },
    ],
  },
]

const PHOTO_ANGLES: PhotoAngle[] = ['front', 'left-side', 'right-side']

// ── Page ─────────────────────────────────────────────────────────────────────
export default function TodayPage() {
  const [snap, setSnap] = useState(() => getSnapshot())
  const [todayCheckin, setTodayCheckin] = useState<CheckInRecord | null>(null)
  const [checkIn, setCheckIn] = useState<Partial<CheckIn>>({})
  const [questionIndex, setQuestionIndex] = useState(0)
  const [showDermNote, setShowDermNote] = useState(false)
  const [dermNote, setDermNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [streak, setStreak] = useState(0)

  // Routine checklist (persisted)
  const [amChecks, setAmChecks] = useState<Record<string, boolean>>({})
  const [pmChecks, setPmChecks] = useState<Record<string, boolean>>({})
  const amToastedRef = useRef(false)
  const pmToastedRef = useRef(false)

  // Voice note
  const [voiceNote, setVoiceNote] = useState('')
  const [showVoiceNote, setShowVoiceNote] = useState(false)

  // Voice check-in
  const [showVoiceCheckin, setShowVoiceCheckin] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const [voiceExtracted, setVoiceExtracted] = useState<Partial<CheckIn> | null>(null)
  const recognitionRef = useRef<SR | null>(null)

  // Photos + analysis
  const [showPhotoDialog, setShowPhotoDialog] = useState(false)
  const [todayPhotos, setTodayPhotos] = useState(false)
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<SkinAnalysis | null>(null)
  const [showNudge, setShowNudge] = useState(false)

  // Daily brief
  const [dailyBrief, setDailyBrief] = useState<{ brief: string; focusTip: string } | null>(null)
  const [briefLoading, setBriefLoading] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    const existing = getTodayCheckin()
    setTodayCheckin(existing)
    setSubmitted(!!existing)
    setStreak(getRoutineStreak())
    const s = getSnapshot()
    setSnap(s)
    setTodayPhotos(!!getTodayPhotoSet())

    // Load analysis
    const existingAnalysis = getAnalysis(today)
    if (existingAnalysis) {
      setAnalysisResult(existingAnalysis)
      if (existingAnalysis.notableFindings.length > 0 && !isNudgeDismissed(existingAnalysis.date)) {
        setShowNudge(true)
      }
    }

    // Load persisted routine completions
    const completions = getRoutineCompletions(today)
    setAmChecks(completions.am)
    setPmChecks(completions.pm)

    // Load or fetch daily brief
    const cached = getDailyBrief(today)
    if (cached) {
      setDailyBrief(cached)
    } else {
      const recentCheckins = JSON.parse(localStorage.getItem('hazel-checkins') || '[]')
        .filter((c: CheckInRecord) => {
          const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7)
          return new Date(c.date) >= cutoff
        })
      if (recentCheckins.length >= 3) {
        setBriefLoading(true)
        fetch('/api/patient/daily-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snapshot: s, recentCheckins, today }),
        })
          .then(r => r.json())
          .then(data => {
            if (data.brief) {
              saveDailyBrief(today, data)
              setDailyBrief(data)
            }
          })
          .catch(() => {})
          .finally(() => setBriefLoading(false))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const amSteps = snap.routineSteps.filter(s => s.timeOfDay === 'am' && !s.isPaused)
  const pmSteps = snap.routineSteps.filter(s => s.timeOfDay === 'pm' && !s.isPaused)

  // Completion state
  const amComplete = amSteps.length > 0 && amSteps.every(s => amChecks[s.id])
  const pmComplete = pmSteps.length > 0 && pmSteps.every(s => pmChecks[s.id])

  // ── Check-in flow ──────────────────────────────────────────────────────────
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

  function handleSubmitCheckin(data: Partial<CheckIn>) {
    const record: CheckInRecord = {
      id: uuidv4(),
      date: today,
      ...(data as CheckIn),
      dermNote: [dermNote, voiceNote].filter(Boolean).join('\n') || undefined,
    }
    saveCheckin(record)
    setTodayCheckin(record)
    setSubmitted(true)
    setStreak(getRoutineStreak())
  }

  function handleSubmit() {
    handleSubmitCheckin(checkIn)
  }

  // ── Voice check-in ─────────────────────────────────────────────────────────
  function startListening() {
    const SRClass = typeof window !== 'undefined'
      ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
      : null
    if (!SRClass) { toast.error('Voice not supported on this browser'); return }
    const recognition = new SRClass()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-GB'
    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => { setIsListening(false); setInterimText('') }
    recognition.onerror = () => { setIsListening(false); setInterimText('') }
    recognition.onresult = (e) => {
      let interim = ''; let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      setInterimText(interim)
      if (final) setVoiceTranscript(prev => (prev + ' ' + final).trim())
    }
    recognitionRef.current = recognition
    recognition.start()
  }
  function stopListening() { recognitionRef.current?.stop() }

  async function processVoiceCheckin() {
    if (!voiceTranscript.trim()) { toast.error('Nothing recorded yet'); return }
    setIsProcessingVoice(true)
    try {
      const res = await fetch('/api/patient/voice-checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: voiceTranscript }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setVoiceExtracted(data)
    } catch {
      toast.error('Could not process — try again or use the tap flow')
    } finally {
      setIsProcessingVoice(false)
    }
  }

  function submitVoiceCheckin() {
    if (!voiceExtracted) return
    handleSubmitCheckin(voiceExtracted)
    setShowVoiceCheckin(false)
  }

  // ── Routine checklist ──────────────────────────────────────────────────────
  function toggleAm(stepId: string) {
    const next = !amChecks[stepId]
    setAmChecks(prev => ({ ...prev, [stepId]: next }))
    saveRoutineCompletion(today, 'am', stepId, next)
  }
  function togglePm(stepId: string) {
    const next = !pmChecks[stepId]
    setPmChecks(prev => ({ ...prev, [stepId]: next }))
    saveRoutineCompletion(today, 'pm', stepId, next)
  }

  // Fire completion toasts once per session
  useEffect(() => {
    if (amComplete && !amToastedRef.current && amSteps.length > 0) {
      amToastedRef.current = true
      toast.success('Morning routine complete 🌿')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amComplete])
  useEffect(() => {
    if (pmComplete && !pmToastedRef.current && pmSteps.length > 0) {
      pmToastedRef.current = true
      toast.success('Evening routine complete 🌙')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pmComplete])

  // ── Photo handling ─────────────────────────────────────────────────────────
  async function handlePhotosComplete(photos: Record<PhotoAngle, string>) {
    const dateStr = today
    savePhotoSet({
      date: dateStr,
      photos: (Object.entries(photos) as [PhotoAngle, string][]).map(([angle, dataUrl]) => ({ angle, dataUrl })),
    })
    setTodayPhotos(true)
    setShowPhotoDialog(false)
    toast.success("Today's skin photos saved 🌿")
    const frontPhoto = photos['front']
    if (!frontPhoto) return
    setIsAnalysing(true)
    try {
      const s = getSnapshot()
      const res = await fetch('/api/patient/photo-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single', frontPhoto: frontPhoto.split(',')[1],
          context: { skinType: s.skinType, concerns: s.concerns },
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
    } catch { /* silent */ }
    finally { setIsAnalysing(false) }
  }

  function handleVoiceTranscript(text: string) {
    setVoiceNote(prev => prev ? `${prev} ${text}` : text)
    setShowVoiceNote(true)
  }

  const allAnswered = CHECK_IN_QUESTIONS.every(q => checkIn[q.key])
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const isBadDay = todayCheckin?.skinFeel === 'bad' || todayCheckin?.breakouts === 'bad'
  const streakMessage =
    streak >= 7 ? `🌟 A full week. That's not willpower — that's a habit.` :
    streak >= 3 ? `🔥 ${streak} days in a row. Your skin is noticing.` :
    streak === 1 ? `Day 1 — the hardest step is showing up.` :
    `Logged. Hazel is watching for patterns.`

  return (
    <div className="px-5 pt-8 pb-4">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-1.5 text-[#C17A5A] mb-0.5">
            <Leaf size={14} />
            <span className="text-xs font-medium tracking-wide uppercase">hazel</span>
          </div>
          <h1 className="text-xl font-semibold text-stone-800">
            Good {greeting}{snap.userName ? `, ${snap.userName}` : ''} 👋
          </h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Streak badge — tappable when 3+ */}
        {streak >= 3 ? (
          <Link href="/patient/progress">
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 hover:bg-amber-100 transition-colors">
              <Flame size={16} className="text-amber-500" />
              <span className="text-sm font-semibold text-amber-700">{streak}</span>
              <span className="text-[10px] text-amber-500 ml-0.5">→</span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <Flame size={16} className="text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">{streak}</span>
          </div>
        )}
      </div>

      {/* ── Daily brief ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {briefLoading && (
          <motion.div key="brief-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="bg-[#F8EDE6] rounded-2xl p-4 mb-5 border border-[#EDD5C8]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={13} className="text-[#C17A5A]" />
              <span className="text-xs font-semibold text-[#C17A5A] uppercase tracking-wide">Hazel's take on today</span>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-[#EDD5C8] rounded animate-pulse w-full" />
              <div className="h-3 bg-[#EDD5C8] rounded animate-pulse w-4/5" />
              <div className="h-2.5 bg-[#EDD5C8] rounded animate-pulse w-3/5 mt-1" />
            </div>
          </motion.div>
        )}
        {!briefLoading && dailyBrief && (
          <motion.div key="brief" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#F8EDE6] rounded-2xl p-4 mb-5 border border-[#EDD5C8]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={13} className="text-[#C17A5A]" />
              <span className="text-xs font-semibold text-[#C17A5A] uppercase tracking-wide">Hazel's take on today</span>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed">{dailyBrief.brief}</p>
            <p className="text-xs text-[#C17A5A] font-medium mt-2">{dailyBrief.focusTip}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Check-in ────────────────────────────────────────────────────────── */}
      {!submitted ? (
        <div className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-stone-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-700">Today's check-in</h2>
            {!showVoiceCheckin && (
              <button onClick={() => { setShowVoiceCheckin(true); setVoiceTranscript(''); setVoiceExtracted(null) }}
                className="flex items-center gap-1.5 text-xs text-[#C17A5A] font-medium hover:underline">
                <Mic size={12} /> Talk instead
              </button>
            )}
          </div>

          {/* Progress bar */}
          {!showVoiceCheckin && (
            <div className="flex gap-1 mb-4">
              {CHECK_IN_QUESTIONS.map((_, i) => (
                <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                  i < questionIndex ? 'bg-[#C17A5A]' :
                  i === questionIndex ? 'bg-[#D4A898]' : 'bg-stone-200'
                }`} />
              ))}
            </div>
          )}

          {/* ── Voice check-in modal ──────────────────────────────────────── */}
          {showVoiceCheckin && !voiceExtracted && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-stone-500 leading-relaxed">
                Tell me how your skin is today, what your routine was like, and how you're feeling.
              </p>

              {/* Listening state */}
              {isListening && (
                <div className="flex items-center gap-2 text-red-500">
                  <div className="flex gap-0.5 items-end h-5">
                    {[0,1,2,3,4].map(i => (
                      <motion.div key={i} className="w-1 bg-red-400 rounded-full"
                        animate={{ height: ['4px', '16px', '4px'] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.08 }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-red-400">Listening…</span>
                </div>
              )}
              {interimText && <p className="text-xs text-stone-400 italic">{interimText}</p>}

              {/* Transcript preview */}
              {voiceTranscript && (
                <div className="bg-stone-50 rounded-xl p-3 text-sm text-stone-600 leading-relaxed">
                  {voiceTranscript}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={isListening ? stopListening : startListening}
                  className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
                    isListening
                      ? 'bg-red-50 text-red-500 border border-red-200'
                      : 'bg-[#F8EDE6] text-[#C17A5A]'
                  }`}>
                  {isListening ? <><Square size={13} fill="currentColor" /> Stop</> : <><Mic size={14} /> Speak</>}
                </button>
                {voiceTranscript && (
                  <Button onClick={processVoiceCheckin} disabled={isProcessingVoice}
                    className="flex-1 bg-[#C17A5A] hover:bg-[#A86848] text-white rounded-xl text-sm h-10">
                    {isProcessingVoice
                      ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Processing…</>
                      : 'Extract check-in'}
                  </Button>
                )}
              </div>

              <button onClick={() => setShowVoiceCheckin(false)}
                className="text-xs text-stone-400 hover:text-stone-600 self-start">
                ← Use tap instead
              </button>
            </div>
          )}

          {/* ── Voice extracted review ────────────────────────────────────── */}
          {showVoiceCheckin && voiceExtracted && (
            <div className="flex flex-col gap-4">
              <p className="text-sm font-medium text-stone-700">Here's what I heard:</p>
              <div className="grid grid-cols-2 gap-2">
                {CHECK_IN_QUESTIONS.map(q => {
                  const val = voiceExtracted[q.key]
                  const opt = q.options.find(o => o.value === val)
                  return opt ? (
                    <div key={q.key} className="bg-[#F8EDE6] rounded-xl px-3 py-2.5 flex items-center gap-2">
                      <span className="text-lg">{opt.emoji}</span>
                      <div>
                        <p className="text-xs text-stone-400">{q.key === 'skinFeel' ? 'Skin' : q.key === 'breakouts' ? 'Breakouts' : q.key === 'routine' ? 'Routine' : q.key === 'picking' ? 'Picking' : 'Mood'}</p>
                        <p className="text-sm font-medium text-stone-700">{opt.label}</p>
                      </div>
                    </div>
                  ) : null
                })}
              </div>
              <div className="flex gap-2">
                <Button onClick={submitVoiceCheckin}
                  className="flex-1 bg-[#C17A5A] hover:bg-[#A86848] text-white rounded-xl h-11">
                  Submit check-in
                </Button>
                <Button variant="outline" onClick={() => { setShowVoiceCheckin(false); setVoiceExtracted(null) }}
                  className="border-stone-200 text-stone-600 rounded-xl h-11 text-sm">
                  Edit manually
                </Button>
              </div>
            </div>
          )}

          {/* ── Tap check-in flow ─────────────────────────────────────────── */}
          {!showVoiceCheckin && (
            <>
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
                                ? 'border-[#C17A5A] bg-[#F8EDE6] text-stone-800'
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

              {questionIndex > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4 mt-3">
                  {CHECK_IN_QUESTIONS.slice(0, questionIndex).map(q => {
                    const opt = q.options.find(o => o.value === checkIn[q.key])
                    return opt ? (
                      <span key={q.key} className="text-xs bg-[#F8EDE6] text-stone-600 rounded-full px-2.5 py-1">
                        {opt.emoji} {opt.label}
                      </span>
                    ) : null
                  })}
                </div>
              )}

              {allAnswered && showDermNote && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                  <p className="text-xs text-stone-500 mb-2">Sounds like a tough day. Want to note anything for your derm?</p>
                  <Textarea placeholder="e.g. bad flare on left cheek, possible reaction to new SPF..."
                    value={dermNote} onChange={e => setDermNote(e.target.value)}
                    className="text-sm resize-none h-20 border-stone-200" />
                </motion.div>
              )}

              {allAnswered && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-xs text-stone-500 mb-2">Anything else to note?</p>
                  <div className="flex items-start gap-2">
                    <VoiceInput onTranscript={handleVoiceTranscript} placeholder="Tap mic to add a voice note" />
                  </div>
                  {showVoiceNote && (
                    <Textarea value={voiceNote} onChange={e => setVoiceNote(e.target.value)}
                      placeholder="Your note..." className="mt-2 text-sm resize-none h-16 border-stone-200" />
                  )}
                  {!showVoiceNote && (
                    <button onClick={() => setShowVoiceNote(true)} className="text-xs text-stone-400 hover:text-stone-600 mt-1 ml-12">
                      or type a note
                    </button>
                  )}
                </motion.div>
              )}

              {allAnswered && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                  <Button onClick={handleSubmit} className="w-full bg-[#C17A5A] hover:bg-[#A86848] text-white rounded-xl">
                    Save check-in
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ── Post-check-in celebration ──────────────────────────────────────── */
        <AnimatePresence>
          <motion.div key="celebration"
            initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-[#F8EDE6] rounded-2xl p-5 mb-5 border border-[#EDD5C8]">
            <div className="flex items-center gap-2 text-[#C17A5A] mb-2">
              <CheckCircle2 size={16} />
              <span className="text-sm font-semibold">Check-in logged</span>
            </div>
            <p className="text-sm text-stone-700 mb-4">{streakMessage}</p>
            {todayCheckin?.dermNote && (
              <p className="text-xs text-stone-500 mb-3 italic">{todayCheckin.dermNote}</p>
            )}
            <div className="flex gap-2">
              <Link href="/patient/progress" className="flex-1">
                <div className="flex items-center justify-center gap-1.5 bg-white border border-[#EDD5C8] rounded-xl py-2.5 text-sm font-medium text-stone-700 hover:border-[#C17A5A] transition-colors">
                  <TrendingUp size={14} className="text-[#C17A5A]" />
                  My progress
                </div>
              </Link>
              <Link
                href={isBadDay ? '/patient/coach?prompt=bad-day' : '/patient/coach'}
                className="flex-1">
                <div className="flex items-center justify-center gap-1.5 bg-[#C17A5A] rounded-xl py-2.5 text-sm font-medium text-white hover:bg-[#A86848] transition-colors">
                  {isBadDay ? 'Talk to Hazel' : 'Ask Hazel'}
                  <ChevronRight size={14} />
                </div>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Photo update ─────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl p-4 mb-4 border flex items-center justify-between ${
        todayPhotos ? 'bg-[#F8EDE6] border-[#EDD5C8]' : 'bg-white border-stone-100 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
            todayPhotos ? 'bg-[#C17A5A]' : 'bg-stone-100'
          }`}>
            <Camera size={15} className={todayPhotos ? 'text-white' : 'text-stone-500'} />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-800">
              {todayPhotos ? "Today's photos saved" : 'Update skin photos'}
            </p>
            <p className="text-xs text-stone-400">
              {todayPhotos ? 'Front + side captured' : 'Front & side profile'}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPhotoDialog(true)}
          className={`rounded-xl text-xs h-8 ${
            todayPhotos ? 'border-[#C17A5A] text-[#C17A5A]' : 'border-stone-200 text-stone-600'
          }`}>
          {todayPhotos ? 'Retake' : 'Take photos'}
        </Button>
      </div>

      {/* ── Skin analysis ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAnalysing && (
          <motion.div key="analysing" className="mb-4"><SkinAnalysisCard isLoading /></motion.div>
        )}
        {!isAnalysing && analysisResult && (
          <motion.div key="analysis" className="mb-4"><SkinAnalysisCard analysis={analysisResult} /></motion.div>
        )}
        {showNudge && analysisResult && (
          <motion.div key="nudge" className="mb-4">
            <DermNudgeCard nudgeId={analysisResult.date} findings={analysisResult.notableFindings} onDismiss={() => setShowNudge(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AM Routine ───────────────────────────────────────────────────────── */}
      {amSteps.length > 0 && (
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-stone-100">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">☀️ Morning routine</h2>
          <div className="flex flex-col gap-2">
            {amSteps.map(step => (
              <button key={step.id} onClick={() => toggleAm(step.id)}
                className="flex items-center gap-3 text-left">
                {amChecks[step.id]
                  ? <CheckCircle2 size={18} className="text-[#C17A5A] shrink-0" />
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
          <AnimatePresence>
            {amComplete && (
              <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#C17A5A] font-medium mt-3 pt-3 border-t border-stone-100">
                ✓ Morning routine done 🌿
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── PM Routine ───────────────────────────────────────────────────────── */}
      {pmSteps.length > 0 && (
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-stone-100">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">🌙 Evening routine</h2>
          <div className="flex flex-col gap-2">
            {pmSteps.map(step => (
              <button key={step.id} onClick={() => togglePm(step.id)}
                className="flex items-center gap-3 text-left">
                {pmChecks[step.id]
                  ? <CheckCircle2 size={18} className="text-[#C17A5A] shrink-0" />
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
          <AnimatePresence>
            {pmComplete && (
              <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#C17A5A] font-medium mt-3 pt-3 border-t border-stone-100">
                ✓ Evening routine done 🌙
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {amSteps.length === 0 && pmSteps.length === 0 && (
        <div className="bg-white rounded-2xl p-5 mb-4 text-center border border-stone-100">
          <p className="text-stone-500 text-sm mb-3">No routine steps yet.</p>
          <Link href="/patient/routine">
            <Button variant="outline" size="sm" className="rounded-xl border-[#C17A5A] text-[#C17A5A]">
              Build your routine
            </Button>
          </Link>
        </div>
      )}

      {/* ── Photo dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Update skin photos</DialogTitle>
          </DialogHeader>
          <SkinCamera angles={PHOTO_ANGLES} onComplete={handlePhotosComplete} onSkip={() => setShowPhotoDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
