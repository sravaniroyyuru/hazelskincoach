'use client'

import { useState, useRef, useCallback } from 'react'
import { Mic, MicOff, Square } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Props = {
  onTranscript: (text: string) => void
  placeholder?: string
}

type SpeechRecognitionResult = {
  isFinal: boolean
  0: { transcript: string }
}

type SpeechRecognitionResultEvent = {
  resultIndex: number
  results: SpeechRecognitionResult[]
}

type SpeechRecognitionType = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionType
    webkitSpeechRecognition: new () => SpeechRecognitionType
  }
}

export default function VoiceInput({ onTranscript, placeholder = 'Tap to speak...' }: Props) {
  const [isListening, setIsListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [unsupported, setUnsupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionType | null>(null)

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (typeof SR === 'undefined') {
      setUnsupported(true)
      return
    }

    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-GB'

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => {
      setIsListening(false)
      setInterim('')
    }
    recognition.onerror = () => {
      setIsListening(false)
      setInterim('')
    }
    recognition.onresult = (e: SpeechRecognitionResultEvent) => {
      let interimText = ''
      let finalText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t
        else interimText += t
      }
      setInterim(interimText)
      if (finalText) onTranscript(finalText.trim())
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [onTranscript])

  function stopListening() {
    recognitionRef.current?.stop()
  }

  if (unsupported) return null

  return (
    <div className="flex items-center gap-2">
      <button
        onMouseDown={startListening}
        onMouseUp={stopListening}
        onTouchStart={startListening}
        onTouchEnd={stopListening}
        onClick={isListening ? stopListening : startListening}
        className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
          isListening
            ? 'bg-red-500 text-white shadow-lg shadow-red-200'
            : 'bg-[#F5F0EB] text-[#7C6B5A] hover:bg-[#EDE5DC]'
        }`}
        title={isListening ? 'Stop recording' : 'Speak'}
      >
        <AnimatePresence mode="wait">
          {isListening ? (
            <motion.span key="stop" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
              <Square size={14} fill="white" />
            </motion.span>
          ) : (
            <motion.span key="mic" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}>
              <Mic size={16} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {isListening && (
        <motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[0, 1, 2, 3].map(i => (
              <motion.div key={i}
                className="w-0.5 bg-red-400 rounded-full"
                animate={{ height: ['6px', '14px', '6px'] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </div>
          {interim && <span className="text-xs text-stone-400 italic">{interim}</span>}
        </motion.div>
      )}

      {!isListening && !interim && (
        <span className="text-xs text-stone-400">{placeholder}</span>
      )}
    </div>
  )
}
