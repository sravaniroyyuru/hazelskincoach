'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { saveSnapshot, savePhotoSet } from '@/lib/patient/storage'
import type { SkinType, SkinConcern, RoutineGoal } from '@/types/patient'
import type { PhotoAngle } from '@/components/patient/SkinCamera'
import SkinCamera from '@/components/patient/SkinCamera'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Leaf, ChevronRight, Check } from 'lucide-react'
import { toast } from 'sonner'

const SKIN_TYPES: { value: SkinType; label: string; description: string }[] = [
  { value: 'oily',        label: 'Oily',         description: 'Shiny, enlarged pores' },
  { value: 'dry',         label: 'Dry',          description: 'Tight, flaky, dull' },
  { value: 'combination', label: 'Combination',  description: 'Oily T-zone, dry cheeks' },
  { value: 'normal',      label: 'Normal',       description: 'Balanced, few concerns' },
  { value: 'sensitive',   label: 'Sensitive',    description: 'Reacts easily, prone to redness' },
]

const CONCERNS: { value: SkinConcern; label: string; emoji: string }[] = [
  { value: 'acne',         label: 'Acne & breakouts',  emoji: '🔴' },
  { value: 'pigmentation', label: 'Pigmentation',       emoji: '🟤' },
  { value: 'anti-ageing',  label: 'Anti-ageing',        emoji: '⏳' },
  { value: 'redness',      label: 'Redness',            emoji: '🌸' },
  { value: 'texture',      label: 'Texture',            emoji: '🪨' },
  { value: 'hydration',    label: 'Hydration',          emoji: '💧' },
  { value: 'sensitivity',  label: 'Sensitivity',        emoji: '🌿' },
  { value: 'dark-circles', label: 'Dark circles',       emoji: '🌑' },
]

const GOALS: { value: RoutineGoal; label: string; emoji: string }[] = [
  { value: 'clear-skin',   label: 'Clear skin',        emoji: '✨' },
  { value: 'glow',         label: 'Natural glow',      emoji: '🌟' },
  { value: 'anti-ageing',  label: 'Slow ageing',       emoji: '⏳' },
  { value: 'calm-redness', label: 'Calm redness',      emoji: '🌸' },
  { value: 'hydration',    label: 'Deep hydration',    emoji: '💧' },
  { value: 'consistency',  label: 'Build consistency', emoji: '📅' },
]

const PHOTO_ANGLES: PhotoAngle[] = ['front', 'left-side', 'right-side']

type Step = 'name' | 'skin-type' | 'concerns' | 'goals' | 'photos' | 'welcome'
const STEPS: Step[] = ['name', 'skin-type', 'concerns', 'goals', 'photos', 'welcome']

const variants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('name')
  const [userName, setUserName] = useState('')
  const [skinType, setSkinType] = useState<SkinType | null>(null)
  const [concerns, setConcerns] = useState<SkinConcern[]>([])
  const [goals, setGoals] = useState<RoutineGoal[]>([])
  const [photosCaptured, setPhotosCaptured] = useState(false)

  function toggleConcern(c: SkinConcern) {
    setConcerns(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }
  function toggleGoal(g: RoutineGoal) {
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  }

  function next() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }

  function handlePhotosComplete(photos: Record<PhotoAngle, string>) {
    const today = new Date().toISOString().split('T')[0]
    savePhotoSet({
      date: today,
      photos: (Object.entries(photos) as [PhotoAngle, string][]).map(([angle, dataUrl]) => ({
        angle,
        dataUrl,
      })),
    })
    setPhotosCaptured(true)
    toast.success('Baseline photos saved 🌿')
    setStep('welcome')
  }

  function handleComplete() {
    saveSnapshot({
      userName,
      onboarded: true,
      skinType,
      concerns,
      goals,
      products: [],
      routineSteps: [],
    })
    router.replace('/patient/today')
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <Leaf className="text-[#7C6B5A]" size={22} />
        <span className="text-lg font-semibold tracking-wide text-stone-800">hazel</span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${
            i === stepIndex ? 'w-6 bg-[#7C6B5A]' :
            i < stepIndex  ? 'w-4 bg-[#C4B5A5]' : 'w-1.5 bg-stone-300'
          }`} />
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* Name */}
        {step === 'name' && (
          <motion.div key="name" variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="w-full max-w-sm flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-1">Welcome to Hazel</h1>
              <p className="text-stone-500 text-sm">Your personal skin coach. Let's start with your name.</p>
            </div>
            <Input
              placeholder="Your first name"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && userName.trim() && next()}
              className="bg-white border-stone-200 h-12 text-base"
              autoFocus
            />
            <Button onClick={next} disabled={!userName.trim()}
              className="bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white h-12 rounded-xl">
              Continue <ChevronRight size={16} className="ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Skin type */}
        {step === 'skin-type' && (
          <motion.div key="skin-type" variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="w-full max-w-sm flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-1">Your skin type</h1>
              <p className="text-stone-500 text-sm">This helps Hazel tailor your routine.</p>
            </div>
            <div className="flex flex-col gap-3">
              {SKIN_TYPES.map(({ value, label, description }) => (
                <button key={value} onClick={() => setSkinType(value)}
                  className={`flex items-center justify-between p-4 rounded-xl border text-left transition-colors ${
                    skinType === value
                      ? 'border-[#7C6B5A] bg-[#F5F0EB]'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                  <div>
                    <div className="font-medium text-stone-800">{label}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{description}</div>
                  </div>
                  {skinType === value && <Check size={16} className="text-[#7C6B5A]" />}
                </button>
              ))}
            </div>
            <Button onClick={next} disabled={!skinType}
              className="bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white h-12 rounded-xl">
              Continue <ChevronRight size={16} className="ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Concerns */}
        {step === 'concerns' && (
          <motion.div key="concerns" variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="w-full max-w-sm flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-1">Skin concerns</h1>
              <p className="text-stone-500 text-sm">Select all that apply.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CONCERNS.map(({ value, label, emoji }) => (
                <button key={value} onClick={() => toggleConcern(value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm transition-colors ${
                    concerns.includes(value)
                      ? 'border-[#7C6B5A] bg-[#F5F0EB] text-stone-800'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}>
                  <span>{emoji}</span> {label}
                </button>
              ))}
            </div>
            <Button onClick={next} disabled={concerns.length === 0}
              className="bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white h-12 rounded-xl">
              Continue <ChevronRight size={16} className="ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Goals */}
        {step === 'goals' && (
          <motion.div key="goals" variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="w-full max-w-sm flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-1">Your goals</h1>
              <p className="text-stone-500 text-sm">What do you want to achieve?</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(({ value, label, emoji }) => (
                <button key={value} onClick={() => toggleGoal(value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm transition-colors ${
                    goals.includes(value)
                      ? 'border-[#7C6B5A] bg-[#F5F0EB] text-stone-800'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}>
                  <span>{emoji}</span> {label}
                </button>
              ))}
            </div>
            <Button onClick={next} disabled={goals.length === 0}
              className="bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white h-12 rounded-xl">
              Continue <ChevronRight size={16} className="ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Photos */}
        {step === 'photos' && (
          <motion.div key="photos" variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="w-full max-w-sm flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-1">Baseline photos</h1>
              <p className="text-stone-500 text-sm">
                Front, left, and right — so you can see your skin change over time.
                These stay on your device only.
              </p>
            </div>
            <SkinCamera
              angles={PHOTO_ANGLES}
              onComplete={handlePhotosComplete}
              onSkip={() => setStep('welcome')}
            />
          </motion.div>
        )}

        {/* Welcome */}
        {step === 'welcome' && (
          <motion.div key="welcome" variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25 }} className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5F0EB] flex items-center justify-center">
              <Leaf className="text-[#7C6B5A]" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-stone-800 mb-2">
                You're all set, {userName} 🌿
              </h1>
              <p className="text-stone-500 text-sm leading-relaxed">
                Hazel will help you track your skin, understand your patterns, and feel more at ease — one day at a time.
                {photosCaptured && ' Your baseline photos are saved.'}
              </p>
            </div>
            <Button onClick={handleComplete}
              className="w-full bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white h-12 rounded-xl">
              Start my skin journey
            </Button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
