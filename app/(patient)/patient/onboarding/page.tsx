'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { saveSnapshot, savePhotoSet } from '@/lib/patient/storage'
import type { SkinType, SkinConcern, RoutineGoal, RoutineProduct } from '@/types/patient'
import type { PhotoAngle } from '@/components/patient/SkinCamera'
import SkinCamera from '@/components/patient/SkinCamera'
import ProductCamera from '@/components/patient/ProductCamera'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Leaf, ChevronRight, ChevronLeft, Mic, Square, Loader2, Check, X, ScanLine, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 'intake' | 'confirm' | 'photos' | 'photo-review' | 'welcome'
const STEPS: Step[] = ['intake', 'confirm', 'photos', 'photo-review', 'welcome']

type IntakeResult = {
  userName?: string
  skinTypes: SkinType[]
  concerns: SkinConcern[]
  goals: RoutineGoal[]
  products: { name: string; brand?: string }[]
}

type PhotoAnalysis = {
  summary: string
  observations: string[]
  overallCondition: 'clear' | 'mild' | 'moderate' | 'significant'
  notableFindings: string[]
  confidence: 'high' | 'medium' | 'low'
}

// ── Label maps ───────────────────────────────────────────────────────────────

const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  oily: 'Oily', dry: 'Dry', dehydrated: 'Dehydrated',
  combination: 'Combination', normal: 'Normal', sensitive: 'Sensitive',
}
const CONCERN_LABELS: Record<SkinConcern, string> = {
  acne: 'Acne', pigmentation: 'Pigmentation', 'anti-ageing': 'Anti-ageing',
  redness: 'Redness', texture: 'Texture', hydration: 'Hydration',
  sensitivity: 'Sensitivity', 'dark-circles': 'Dark circles',
}
const GOAL_LABELS: Record<RoutineGoal, string> = {
  'clear-skin': 'Clear skin', glow: 'Natural glow', 'anti-ageing': 'Slow ageing',
  'calm-redness': 'Calm redness', hydration: 'Deep hydration', consistency: 'Build consistency',
}
const GOAL_PROMISE: Record<RoutineGoal, string> = {
  'clear-skin': 'Watch breakouts reduce as consistency builds.',
  glow: 'See your natural radiance return over weeks.',
  'anti-ageing': 'Track the slow, real changes your mirror might miss.',
  'calm-redness': 'Build a routine your skin can finally trust.',
  hydration: 'Build the barrier your skin has been asking for.',
  consistency: 'Small daily acts. Compounding results.',
}

const PHOTO_ANGLES: PhotoAngle[] = ['front', 'left-side', 'right-side']
const ANGLE_LABELS: Record<PhotoAngle, string> = {
  front: 'Front', 'left-side': 'Left', 'right-side': 'Right',
}

const ALL_SKIN_TYPES: SkinType[] = ['oily', 'dry', 'dehydrated', 'combination', 'normal', 'sensitive']
const ALL_CONCERNS: SkinConcern[] = ['acne', 'pigmentation', 'anti-ageing', 'redness', 'texture', 'hydration', 'sensitivity', 'dark-circles']
const ALL_GOALS: RoutineGoal[] = ['clear-skin', 'glow', 'anti-ageing', 'calm-redness', 'hydration', 'consistency']

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

// ── Slide variants ───────────────────────────────────────────────────────────

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 32 : -32 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -32 : 32 }),
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('intake')
  const [direction, setDirection] = useState(1)

  // Intake state
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const recognitionRef = useRef<SR | null>(null)

  // Confirm state (populated by AI extraction)
  const [userName, setUserName] = useState('')
  const [skinTypes, setSkinTypes] = useState<SkinType[]>([])
  const [concerns, setConcerns] = useState<SkinConcern[]>([])
  const [goals, setGoals] = useState<RoutineGoal[]>([])
  const [products, setProducts] = useState<RoutineProduct[]>([])
  const [productQuery, setProductQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Partial<RoutineProduct>[]>([])
  const [showCamera, setShowCamera] = useState(false)

  // Photo state
  const [capturedPhotos, setCapturedPhotos] = useState<Record<PhotoAngle, string> | null>(null)
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysis | null>(null)
  const [isAnalysing, setIsAnalysing] = useState(false)

  // ── Navigation ─────────────────────────────────────────────────────────────

  function goTo(s: Step, dir: number) { setDirection(dir); setStep(s) }
  function next() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) goTo(STEPS[idx + 1], 1)
  }
  function prev() {
    const idx = STEPS.indexOf(step)
    if (idx > 0) goTo(STEPS[idx - 1], -1)
  }

  // ── Voice recording ────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    const SRClass = (typeof window !== 'undefined')
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
      if (final) setTranscript(prev => (prev + ' ' + final).trim())
    }
    recognitionRef.current = recognition
    recognition.start()
  }, [])

  function stopListening() {
    recognitionRef.current?.stop()
  }

  // ── Process intake transcript via Claude ───────────────────────────────────

  async function handleProcessIntake() {
    const text = transcript.trim()
    if (!text) { toast.error('Tell Hazel about your skin first'); return }
    setIsProcessing(true)
    try {
      const res = await fetch('/api/patient/voice-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      })
      const data: IntakeResult = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed')

      setUserName(data.userName ?? '')
      setSkinTypes(data.skinTypes ?? [])
      setConcerns(data.concerns ?? [])
      setGoals(data.goals ?? [])
      // Convert extracted products to RoutineProduct shape
      setProducts((data.products ?? []).map(p => ({
        id: uuidv4(), name: p.name, brand: p.brand ?? null,
        category: null, keyIngredients: [], flags: [], status: 'active' as const,
      })))
      goTo('confirm', 1)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not process — try again')
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Confirm step helpers ───────────────────────────────────────────────────

  function toggle<T>(arr: T[], setArr: (a: T[]) => void, val: T) {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  async function searchProducts(q: string) {
    if (q.trim().length < 3) { setSearchResults([]); return }
    setIsSearching(true)
    try {
      const res = await fetch('/api/patient/product-lookup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()
      setSearchResults(Array.isArray(data) ? data : [])
    } catch { setSearchResults([]) }
    finally { setIsSearching(false) }
  }

  function addFoundProduct(found: Partial<RoutineProduct>) {
    setProducts(prev => [...prev, {
      id: uuidv4(), name: found.name ?? '', brand: found.brand ?? null,
      category: found.category ?? null, keyIngredients: found.keyIngredients ?? [],
      flags: found.flags ?? [], status: 'active',
    }])
    setSearchResults([]); setProductQuery('')
  }

  function handleScannedProduct(scanned: Omit<RoutineProduct, 'id' | 'status'>) {
    setProducts(prev => [...prev, { id: uuidv4(), status: 'active', ...scanned }])
    setShowCamera(false)
  }

  // ── Photo handling ─────────────────────────────────────────────────────────

  async function handlePhotosComplete(photos: Record<PhotoAngle, string>) {
    const today = new Date().toISOString().split('T')[0]
    savePhotoSet({
      date: today,
      photos: (Object.entries(photos) as [PhotoAngle, string][]).map(([angle, dataUrl]) => ({ angle, dataUrl })),
    })
    setCapturedPhotos(photos)
    toast.success('Photos saved 🌿')
    goTo('photo-review', 1)

    setIsAnalysing(true)
    setPhotoAnalysis(null)
    try {
      const base64 = photos['front'].split(',')[1]
      const res = await fetch('/api/patient/photo-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single', frontPhoto: base64,
          context: {
            skinType: skinTypes.length ? skinTypes.join(', ') : undefined,
            concerns: concerns.length ? concerns : undefined,
          },
        }),
      })
      const data = await res.json()
      if (!data.error) setPhotoAnalysis(data)
    } catch { /* silent */ }
    finally { setIsAnalysing(false) }
  }

  // ── Complete onboarding ────────────────────────────────────────────────────

  function handleComplete() {
    saveSnapshot({
      userName: userName || 'Friend',
      onboarded: true,
      skinType: skinTypes,
      concerns,
      goals,
      products,
      routineSteps: [],
    })
    router.replace('/patient/today')
  }

  // ── Progress dots ──────────────────────────────────────────────────────────

  const visibleSteps = STEPS.filter(s => s !== 'photo-review')
  const dotIndex = step === 'photo-review'
    ? STEPS.indexOf('photos')
    : STEPS.indexOf(step) > STEPS.indexOf('photo-review')
      ? STEPS.indexOf(step) - 1
      : STEPS.indexOf(step)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAF4EF] flex flex-col items-center justify-center px-6 py-12">

      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <Leaf className="text-[#C17A5A]" size={22} />
        <span className="text-lg font-semibold tracking-wide text-stone-800">hazel</span>
      </div>

      {/* Progress dots */}
      {step !== 'photos' && (
        <div className="flex gap-2 mb-8">
          {visibleSteps.map((s, i) => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${
              i === dotIndex ? 'w-6 bg-[#C17A5A]' :
              i < dotIndex  ? 'w-4 bg-[#D4A898]' : 'w-1.5 bg-stone-300'
            }`} />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait" custom={direction}>

        {/* ── INTAKE: Talk to Hazel ─────────────────────────────────────────── */}
        {step === 'intake' && (
          <motion.div key="intake" custom={direction} variants={variants}
            initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}
            className="w-full max-w-sm flex flex-col gap-6">

            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-2">Tell Hazel about your skin.</h1>
              <p className="text-stone-500 text-sm leading-relaxed">
                How it's been lately, what bothers you, what you've tried. Your own words — no forms.
              </p>
            </div>

            {/* Example prompt */}
            <div className="bg-stone-100 rounded-xl px-4 py-3 border border-stone-200">
              <p className="text-xs text-stone-400 italic leading-relaxed">
                "I have oily skin with hormonal acne along my jaw. I've been using The Ordinary niacinamide and a CeraVe cleanser. I want clearer skin."
              </p>
            </div>

            {/* Voice / text area */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col gap-3">

              {/* Voice wave while listening */}
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

              {/* Interim speech preview */}
              {interimText && (
                <p className="text-xs text-stone-400 italic">{interimText}</p>
              )}

              {/* Textarea */}
              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder="Speak or type here…"
                rows={4}
                className="w-full text-sm text-stone-700 placeholder:text-stone-300 resize-none bg-transparent outline-none"
              />

              {/* Mic button */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl transition-colors ${
                    isListening
                      ? 'bg-red-50 text-red-500 border border-red-200'
                      : 'bg-[#F8EDE6] text-[#C17A5A] hover:bg-[#EDD5C8]'
                  }`}
                >
                  {isListening
                    ? <><Square size={13} fill="currentColor" /> Stop</>
                    : <><Mic size={14} /> Tap to speak</>
                  }
                </button>
                {transcript && (
                  <button onClick={() => setTranscript('')}
                    className="text-xs text-stone-300 hover:text-stone-500">
                    Clear
                  </button>
                )}
              </div>
            </div>

            <Button
              onClick={handleProcessIntake}
              disabled={!transcript.trim() || isProcessing}
              className="bg-[#C17A5A] hover:bg-[#A86848] text-white h-12 rounded-xl disabled:opacity-50"
            >
              {isProcessing
                ? <><Loader2 size={15} className="animate-spin mr-2" /> Hazel is reading…</>
                : <>Hazel, I'm done <ChevronRight size={16} className="ml-1" /></>
              }
            </Button>
          </motion.div>
        )}

        {/* ── CONFIRM: Here's what I heard ─────────────────────────────────── */}
        {step === 'confirm' && (
          <motion.div key="confirm" custom={direction} variants={variants}
            initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}
            className="w-full max-w-sm flex flex-col gap-5">

            <button onClick={() => goTo('intake', -1)}
              className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 self-start -mb-1">
              <ChevronLeft size={16} /> Edit my description
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={15} className="text-[#C17A5A]" />
                <h1 className="text-xl font-semibold text-stone-800">Here's what I heard</h1>
              </div>
              <p className="text-stone-500 text-sm">Tap to add or remove. Add products below.</p>
            </div>

            {/* Name */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col gap-2">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Your name</p>
              <Input
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="What should Hazel call you?"
                className="border-stone-200 h-10 text-sm"
              />
            </div>

            {/* Skin types */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Your skin</p>
              <div className="flex flex-wrap gap-2">
                {ALL_SKIN_TYPES.map(t => (
                  <button key={t} onClick={() => toggle(skinTypes, setSkinTypes, t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                      skinTypes.includes(t)
                        ? 'border-[#C17A5A] bg-[#F8EDE6] text-stone-800'
                        : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'
                    }`}>
                    {skinTypes.includes(t) && <Check size={11} className="text-[#C17A5A]" />}
                    {SKIN_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Concerns + Goals */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">What you're working on</p>
              <div className="flex flex-wrap gap-2">
                {ALL_CONCERNS.map(c => (
                  <button key={c} onClick={() => toggle(concerns, setConcerns, c)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                      concerns.includes(c)
                        ? 'border-[#C17A5A] bg-[#F8EDE6] text-stone-800'
                        : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'
                    }`}>
                    {CONCERN_LABELS[c]}
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mt-1">Goals</p>
              <div className="flex flex-wrap gap-2">
                {ALL_GOALS.map(g => (
                  <button key={g} onClick={() => toggle(goals, setGoals, g)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                      goals.includes(g)
                        ? 'border-[#C17A5A] bg-[#F8EDE6] text-stone-800'
                        : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'
                    }`}>
                    {GOAL_LABELS[g]}
                  </button>
                ))}
              </div>
            </div>

            {/* Products */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Products</p>

              {products.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {products.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-1">
                      <div>
                        <p className="text-sm text-stone-800 font-medium">{p.name}</p>
                        {p.brand && <p className="text-xs text-stone-400">{p.brand}</p>}
                      </div>
                      <button onClick={() => setProducts(prev => prev.filter(x => x.id !== p.id))}
                        className="text-stone-300 hover:text-red-400 p-1">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search to add more */}
              <div className="relative">
                <Input
                  placeholder="Search to add a product…"
                  value={productQuery}
                  onChange={e => { setProductQuery(e.target.value); searchProducts(e.target.value) }}
                  className="border-stone-200 h-9 text-sm pr-8"
                />
                {isSearching && <Loader2 size={13} className="animate-spin absolute right-3 top-2.5 text-stone-400" />}
              </div>

              {searchResults.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {searchResults.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-[#F8EDE6] rounded-xl border border-[#EDD5C8]">
                      <div>
                        <p className="text-xs font-medium text-stone-800">{r.name}</p>
                        {r.brand && <p className="text-xs text-stone-400">{r.brand}</p>}
                      </div>
                      <button onClick={() => addFoundProduct(r)}
                        className="text-xs bg-[#C17A5A] text-white px-2 py-1 rounded-lg">Add</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Camera scan */}
              {!showCamera && (
                <button onClick={() => setShowCamera(true)}
                  className="flex items-center gap-2 text-xs text-stone-400 hover:text-[#C17A5A] transition-colors">
                  <ScanLine size={13} /> Scan a product label instead
                </button>
              )}
              {showCamera && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-stone-600">Scan product</p>
                    <button onClick={() => setShowCamera(false)}><X size={14} className="text-stone-400" /></button>
                  </div>
                  <ProductCamera onProductFound={handleScannedProduct} onClose={() => setShowCamera(false)} />
                </div>
              )}
            </div>

            <Button
              onClick={next}
              disabled={skinTypes.length === 0 && concerns.length === 0}
              className="bg-[#C17A5A] hover:bg-[#A86848] text-white h-12 rounded-xl"
            >
              This looks right <ChevronRight size={16} className="ml-1" />
            </Button>
          </motion.div>
        )}

        {/* ── PHOTOS ───────────────────────────────────────────────────────── */}
        {step === 'photos' && (
          <motion.div key="photos" custom={direction} variants={variants}
            initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}
            className="w-full max-w-sm flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-1">Baseline photos</h1>
              <p className="text-stone-500 text-sm">
                Front, left, and right — so you can see your skin change over time. Stored on your device only.
              </p>
            </div>
            <SkinCamera
              angles={PHOTO_ANGLES}
              onComplete={handlePhotosComplete}
              onSkip={() => goTo('welcome', 1)}
            />
          </motion.div>
        )}

        {/* ── PHOTO REVIEW ─────────────────────────────────────────────────── */}
        {step === 'photo-review' && capturedPhotos && (
          <motion.div key="photo-review" custom={direction} variants={variants}
            initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}
            className="w-full max-w-sm flex flex-col gap-6">

            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-1">Your baseline photos</h1>
              <p className="text-stone-500 text-sm">Saved to your device. Hazel will track changes over time.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {PHOTO_ANGLES.map(angle => (
                <div key={angle} className="flex flex-col items-center gap-1.5">
                  <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-[#C17A5A] bg-stone-100">
                    <img src={capturedPhotos[angle]} alt={`${angle} view`} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs text-stone-500 font-medium">{ANGLE_LABELS[angle]}</span>
                </div>
              ))}
            </div>

            {/* AI analysis card */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-100 bg-[#F8EDE6]">
                <Sparkles size={14} className="text-[#C17A5A]" />
                <span className="text-xs font-semibold text-[#C17A5A] uppercase tracking-wide">Hazel's first look</span>
              </div>

              {isAnalysing && (
                <div className="flex items-center gap-3 px-4 py-5">
                  <Loader2 size={16} className="animate-spin text-[#C17A5A] shrink-0" />
                  <p className="text-sm text-stone-500">Reading your skin…</p>
                </div>
              )}

              {!isAnalysing && photoAnalysis && (
                <div className="px-4 py-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      photoAnalysis.overallCondition === 'clear'    ? 'bg-emerald-50 text-emerald-700' :
                      photoAnalysis.overallCondition === 'mild'     ? 'bg-amber-50 text-amber-700' :
                      photoAnalysis.overallCondition === 'moderate' ? 'bg-orange-50 text-orange-700' :
                                                                       'bg-rose-50 text-rose-700'
                    }`}>
                      {photoAnalysis.overallCondition.charAt(0).toUpperCase() + photoAnalysis.overallCondition.slice(1)} skin
                    </span>
                    {photoAnalysis.confidence === 'low' && (
                      <span className="text-xs text-stone-400">Low confidence — photo quality</span>
                    )}
                  </div>
                  <p className="text-sm text-stone-700 leading-relaxed">{photoAnalysis.summary}</p>
                  {photoAnalysis.observations.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {photoAnalysis.observations.map((obs, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-[#C17A5A] mt-1.5 shrink-0" />
                          <p className="text-xs text-stone-500">{obs}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {photoAnalysis.notableFindings.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-3 flex flex-col gap-1">
                      <p className="text-xs font-semibold text-amber-700">Worth mentioning to a dermatologist</p>
                      {photoAnalysis.notableFindings.map((f, i) => (
                        <p key={i} className="text-xs text-amber-600">{f}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!isAnalysing && !photoAnalysis && (
                <div className="px-4 py-4">
                  <p className="text-sm text-stone-400">Analysis unavailable — you can view your skin report later.</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={next} disabled={isAnalysing}
                className="bg-[#C17A5A] hover:bg-[#A86848] text-white h-12 rounded-xl disabled:opacity-60">
                {isAnalysing
                  ? <><Loader2 size={15} className="animate-spin mr-2" /> Analysing…</>
                  : <>Continue <ChevronRight size={16} className="ml-1" /></>
                }
              </Button>
              <button onClick={() => goTo('photos', -1)}
                className="text-sm text-stone-400 hover:text-stone-600 py-1">
                Retake photos
              </button>
            </div>
          </motion.div>
        )}

        {/* ── WELCOME ──────────────────────────────────────────────────────── */}
        {step === 'welcome' && (
          <motion.div key="welcome" custom={direction} variants={variants}
            initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}
            className="w-full max-w-sm flex flex-col items-center gap-6 text-center">

            <div className="w-16 h-16 rounded-full bg-[#F8EDE6] flex items-center justify-center">
              <Leaf className="text-[#C17A5A]" size={28} />
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-3">
                Your skin journey starts now{userName ? `, ${userName}` : ''}.
              </h1>
              {goals.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {goals.slice(0, 2).map(g => (
                    <p key={g} className="text-stone-500 text-sm">{GOAL_PROMISE[g]}</p>
                  ))}
                </div>
              ) : (
                <p className="text-stone-500 text-sm leading-relaxed">
                  Hazel will help you track your skin, understand your patterns, and feel more at ease — one day at a time.
                </p>
              )}
            </div>

            <Button onClick={handleComplete}
              className="w-full bg-[#C17A5A] hover:bg-[#A86848] text-white h-12 rounded-xl">
              Open my daily hub →
            </Button>

            <p className="text-xs text-stone-400">
              Your first task: complete today's check-in. It takes 60 seconds.
            </p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
