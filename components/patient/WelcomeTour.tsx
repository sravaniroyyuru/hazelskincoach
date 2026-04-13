'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Leaf, X, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const TOUR_KEY = 'hazel-tour-shown'

const STEPS = [
  {
    emoji: '🌿',
    title: 'Welcome to Hazel',
    body: "Your personal skin companion — built around how skin really feels to live with. Here's a quick look at what's here for you.",
    cta: 'Show me around',
  },
  {
    emoji: '☀️',
    title: 'Today',
    body: "Check in each morning or evening — how your skin feels, any breakouts, your routine. Take photos to track changes over time. Hazel notices patterns you might miss.",
    cta: 'Next',
  },
  {
    emoji: '📈',
    title: 'Progress',
    body: 'See your skin trends over the past 7 days, compare photos side by side, and understand what\'s actually shifting — not just how you feel on a bad day.',
    cta: 'Next',
  },
  {
    emoji: '🧴',
    title: 'Routine',
    body: 'Build your AM and PM routine steps, link your products, and let Hazel flag any ingredient conflicts. Search by name or scan a product photo.',
    cta: 'Next',
  },
  {
    emoji: '💬',
    title: 'Coach',
    body: "Talk to Hazel about anything — whether your skin is making you anxious, or you just want to know if niacinamide is right for you. Get a personalised skin assessment anytime.",
    cta: 'Next',
  },
  {
    emoji: '📋',
    title: 'Derm report',
    body: 'Before a dermatologist appointment, generate a clear summary of your skin history, routine, and concerns — ready to share or read aloud.',
    cta: "Let's go 🌿",
  },
]

export default function WelcomeTour() {
  const [visible, setVisible] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const shown = localStorage.getItem(TOUR_KEY)
    if (!shown) {
      // Small delay so layout settles first
      const t = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(TOUR_KEY, '1')
    setVisible(false)
  }

  function next() {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(i => i + 1)
    } else {
      dismiss()
    }
  }

  const current = STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={dismiss}
          />

          {/* Card */}
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="fixed bottom-24 left-4 right-4 z-50 bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 pt-5 pb-1">
              <div className="flex items-center gap-1.5 text-[#7C6B5A]">
                <Leaf size={14} />
                <span className="text-xs font-medium tracking-wide uppercase">hazel</span>
              </div>
              <button onClick={dismiss} className="text-stone-300 hover:text-stone-500 p-1">
                <X size={16} />
              </button>
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="px-5 pb-5 pt-3"
              >
                <div className="text-3xl mb-3">{current.emoji}</div>
                <h2 className="text-lg font-semibold text-stone-800 mb-1.5">{current.title}</h2>
                <p className="text-sm text-stone-500 leading-relaxed mb-5">{current.body}</p>

                {/* Progress dots */}
                {!isFirst && (
                  <div className="flex gap-1.5 mb-4">
                    {STEPS.slice(1).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === stepIndex - 1 ? 'w-5 bg-[#7C6B5A]' :
                          i < stepIndex - 1 ? 'w-3 bg-[#C4B5A5]' : 'w-1.5 bg-stone-200'
                        }`}
                      />
                    ))}
                  </div>
                )}

                <Button
                  onClick={next}
                  className="w-full bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white rounded-xl h-11"
                >
                  {current.cta}
                  {!isLast && <ChevronRight size={16} className="ml-1" />}
                </Button>

                {isFirst && (
                  <button onClick={dismiss} className="w-full text-center text-xs text-stone-400 hover:text-stone-600 mt-3">
                    Skip tour
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
