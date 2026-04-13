'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { getSnapshot } from '@/lib/patient/storage'
import type { PatientSnapshot, CoachMessage } from '@/types/patient'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Leaf, Send, Loader2, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion } from 'framer-motion'

const ASSESSMENT_PROMPT = "I'd like a personalised skin assessment. Based on what you know about me, and a few questions, give me a thorough understanding of my skin."

const STARTERS = [
  { text: 'Today I felt really anxious about my skin', emoji: '💭' },
  { text: "I've been cancelling plans because of my skin", emoji: '😔' },
  { text: "I'm frustrated — nothing seems to be working", emoji: '😤' },
  { text: 'What should I know about my skin type?', emoji: '🌿' },
  { text: "Help me understand what's in my routine", emoji: '🧴' },
]

export default function CoachPage() {
  const [snap, setSnap] = useState<PatientSnapshot | null>(null)
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSnap(getSnapshot())
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

    // Placeholder for streaming assistant response
    const assistantMsg: CoachMessage = { role: 'assistant', content: '' }
    setMessages([...updated, assistantMsg])

    try {
      const res = await fetch('/api/patient/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated,
          context: snap
            ? {
                userName: snap.userName,
                skinType: snap.skinType,
                concerns: snap.concerns,
                goals: snap.goals,
                routineSteps: snap.routineSteps,
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
  }, [messages, isLoading, snap])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 border-b border-stone-100 bg-[#FAF8F5]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#F5F0EB] flex items-center justify-center">
            <Leaf size={14} className="text-[#7C6B5A]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">Hazel</p>
            <p className="text-xs text-stone-400">Here for you — skin, feelings, all of it</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-5 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-4 py-6">
            {/* Header */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#F5F0EB] flex items-center justify-center mx-auto mb-3">
                <Leaf size={20} className="text-[#7C6B5A]" />
              </div>
              <p className="text-stone-700 font-medium">This is your space</p>
              <p className="text-stone-400 text-sm mt-1 leading-relaxed">
                Talk about how your skin is making you feel, or ask anything. Hazel is here for both.
              </p>
            </div>

            {/* Skin assessment CTA */}
            <button
              onClick={() => sendMessage(ASSESSMENT_PROMPT)}
              className="w-full p-4 bg-[#7C6B5A] rounded-2xl text-left text-white flex items-center gap-3 hover:bg-[#6B5A4A] transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">Get my skin assessment</p>
                <p className="text-xs text-white/70 mt-0.5">Hazel will ask a few questions and give you a personalised skin profile</p>
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
              {STARTERS.map(s => (
                <button
                  key={s.text}
                  onClick={() => sendMessage(s.text)}
                  className="text-sm text-left px-4 py-3 bg-white border border-stone-200 rounded-xl text-stone-600 hover:border-[#7C6B5A] hover:text-stone-800 transition-colors flex items-center gap-3"
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
                  <div className="w-6 h-6 rounded-full bg-[#F5F0EB] flex items-center justify-center mr-2 mt-1 shrink-0">
                    <Leaf size={11} className="text-[#7C6B5A]" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#7C6B5A] text-white rounded-br-sm'
                      : 'bg-white border border-stone-100 text-stone-800 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    m.content ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        }}
                      >
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
                  ) : (
                    m.content
                  )}
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
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            placeholder="How are you feeling today..."
            className="resize-none min-h-[44px] max-h-32 border-stone-200 rounded-xl text-sm"
            rows={1}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white rounded-xl h-11 w-11 p-0 shrink-0"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </form>
      </div>
    </div>
  )
}
