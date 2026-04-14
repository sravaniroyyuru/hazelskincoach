'use client'

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSnapshot } from '@/lib/patient/storage'
import type { PatientSnapshot, CoachMessage } from '@/types/patient'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Leaf, Send, Loader2, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion } from 'framer-motion'

const ASSESSMENT_PROMPT = "I'd like a personalised skin assessment. Based on what you know about me, and a few questions, give me a thorough understanding of my skin."

function getPersonalisedStarters(snap: PatientSnapshot | null) {
  const concerns = snap?.concerns ?? []
  const base = [
    { text: "Today I felt really anxious about my skin", emoji: '💭' },
    { text: "I've been cancelling plans because of my skin", emoji: '😔' },
    { text: "I'm frustrated — nothing seems to be working", emoji: '😤' },
    { text: "I'm not sure my routine is actually working", emoji: '🧴' },
    { text: "I want to feel better in my skin", emoji: '🌿' },
  ]
  // Swap in concern-specific starter at position 3
  if (concerns.includes('acne')) {
    base[3] = { text: "Why do I keep breaking out in the same spots?", emoji: '🔴' }
  } else if (concerns.includes('anti-ageing')) {
    base[3] = { text: "Which ingredients in my routine actually work?", emoji: '⏳' }
  } else if (concerns.includes('pigmentation')) {
    base[3] = { text: "Will my dark spots ever fade?", emoji: '🟤' }
  } else if (concerns.includes('redness')) {
    base[3] = { text: "How do I calm my skin when it flares up?", emoji: '🌸' }
  }
  return base
}

// ── Inner component (needs useSearchParams → must be inside Suspense) ─────────

function CoachPageInner() {
  const searchParams = useSearchParams()
  const [snap, setSnap] = useState<PatientSnapshot | null>(null)
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const seededRef = useRef(false)

  useEffect(() => {
    const s = getSnapshot()
    setSnap(s)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: CoachMessage = { role: 'user', content: text.trim() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setIsLoading(true)

    const assistantMsg: CoachMessage = { role: 'assistant', content: '' }
    setMessages([...updated, assistantMsg])

    try {
      const s = getSnapshot()
      const res = await fetch('/api/patient/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated,
          context: s
            ? {
                userName: s.userName,
                skinType: s.skinType,
                concerns: s.concerns,
                goals: s.goals,
                routineSteps: s.routineSteps,
              }
            : {},
        }),
      })

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error ?? `Server error ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        setMessages(prev => {
          const msgs = [...prev]
          msgs[msgs.length - 1] = { role: 'assistant', content: accumulated }
          return msgs
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not connect'
      setMessages(prev => {
        const msgs = [...prev]
        msgs[msgs.length - 1] = {
          role: 'assistant',
          content: `Sorry, I couldn't respond right now — ${msg}. Please try again.`,
        }
        return msgs
      })
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading])

  // Seed conversation from URL param (bad-day or trend)
  useEffect(() => {
    if (seededRef.current || isLoading) return
    const prompt = searchParams.get('prompt')
    if (prompt === 'bad-day') {
      seededRef.current = true
      setTimeout(() => {
        sendMessage("I had a rough skin day today — can you help me understand what might be going on and what I can do?")
      }, 400)
    } else if (prompt === 'trend') {
      seededRef.current = true
      setTimeout(() => {
        sendMessage("Can you help me understand my skin trends from the past week? I want to know what's driving them.")
      }, 400)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  // Personalised empty state
  const firstName = snap?.userName?.split(' ')[0]
  const topConcern = snap?.concerns?.[0]?.replace(/-/g, ' ')
  const skinTypesText = snap?.skinType?.length ? snap.skinType.join(', ') : null
  const starters = getPersonalisedStarters(snap)

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 border-b border-stone-100 bg-[#FAF4EF]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#F8EDE6] flex items-center justify-center">
            <Leaf size={14} className="text-[#C17A5A]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">Hazel</p>
            <p className="text-xs text-stone-400">Your skin confidante. Ask anything.</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-5 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-4 py-6">
            {/* Personalised header */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#F8EDE6] flex items-center justify-center mx-auto mb-3">
                <Leaf size={20} className="text-[#C17A5A]" />
              </div>
              <p className="text-stone-700 font-medium">
                {firstName ? `Hi ${firstName}` : 'Hi there'}
                {topConcern ? ` — I know you're working on ${topConcern}.` : '.'}
              </p>
              <p className="text-stone-400 text-sm mt-1 leading-relaxed">
                {skinTypesText
                  ? `Ask me anything — about your ${skinTypesText} skin, your routine, or how today feels.`
                  : 'Ask me anything about your skin, routine, or how today feels.'
                }
              </p>
            </div>

            {/* Skin assessment CTA */}
            <button
              onClick={() => sendMessage(ASSESSMENT_PROMPT)}
              className="w-full p-4 bg-[#C17A5A] rounded-2xl text-left text-white flex items-center gap-3 hover:bg-[#A86848] transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">Get my skin assessment</p>
                <p className="text-xs text-white/70 mt-0.5">
                  A conversation that maps your skin, your concerns, and what'll actually work for you.
                </p>
              </div>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-stone-100" />
              <p className="text-xs text-stone-400">or start a conversation</p>
              <div className="flex-1 h-px bg-stone-100" />
            </div>

            {/* Starter prompts */}
            <div className="flex flex-col gap-2">
              {starters.map(s => (
                <button
                  key={s.text}
                  onClick={() => sendMessage(s.text)}
                  className="text-sm text-left px-4 py-3 bg-white border border-stone-200 rounded-xl text-stone-600 hover:border-[#C17A5A] hover:text-stone-800 transition-colors flex items-center gap-3"
                >
                  <span className="text-base shrink-0">{s.emoji}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-[#F8EDE6] flex items-center justify-center mr-2 mt-1 shrink-0">
                    <Leaf size={11} className="text-[#C17A5A]" />
                  </div>
                )}
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#C17A5A] text-white rounded-br-sm'
                    : 'bg-white border border-stone-100 text-stone-800 rounded-bl-sm shadow-sm'
                }`}>
                  {m.role === 'assistant' ? (
                    m.content ? (
                      <ReactMarkdown components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      }}>
                        {m.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="flex gap-1">
                        {[0, 1, 2].map(j => (
                          <motion.div key={j} className="w-1.5 h-1.5 bg-stone-400 rounded-full"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: j * 0.2 }} />
                        ))}
                      </div>
                    )
                  ) : m.content}
                </div>
              </motion.div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="px-5 py-4 border-t border-stone-100 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
            }}
            placeholder="How are you feeling today..."
            className="resize-none min-h-[44px] max-h-32 border-stone-200 rounded-xl text-sm"
            rows={1}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-[#C17A5A] hover:bg-[#A86848] text-white rounded-xl h-11 w-11 p-0 shrink-0"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </form>
      </div>
    </div>
  )
}

// ── Exported page (wraps inner in Suspense for useSearchParams) ───────────────

export default function CoachPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[#C17A5A]" />
      </div>
    }>
      <CoachPageInner />
    </Suspense>
  )
}
