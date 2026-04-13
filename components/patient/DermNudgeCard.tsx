'use client'

import { motion } from 'framer-motion'
import { FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { setReportNudge, dismissNudge } from '@/lib/patient/storage'
import { useRouter } from 'next/navigation'

type Props = {
  nudgeId: string          // unique ID to track dismissal (e.g. analysis date)
  findings: string[]       // notableFindings from SkinAnalysis
  onDismiss: () => void    // callback to hide card in parent state
}

export default function DermNudgeCard({ nudgeId, findings, onDismiss }: Props) {
  const router = useRouter()

  function handleAddToReport() {
    const text = `Hazel noticed the following from your recent skin photos:\n${findings.map(f => `• ${f}`).join('\n')}`
    setReportNudge(text)
    dismissNudge(nudgeId)
    onDismiss()
    router.push('/patient/report')
  }

  function handleDismiss() {
    dismissNudge(nudgeId)
    onDismiss()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <FileText size={13} className="text-[#7C6B5A] shrink-0" />
          <p className="text-xs font-semibold text-stone-700">Worth mentioning to your derm</p>
        </div>
        <button onClick={handleDismiss}
          className="text-stone-300 hover:text-stone-500 shrink-0 -mt-0.5">
          <X size={14} />
        </button>
      </div>

      <ul className="flex flex-col gap-1 mb-3 pl-1">
        {findings.slice(0, 3).map((f, i) => (
          <li key={i} className="text-xs text-stone-600 flex gap-1.5">
            <span className="text-[#7C6B5A] shrink-0">•</span> {f}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDismiss}
          className="flex-1 h-8 text-xs rounded-xl border-stone-200 text-stone-400">
          Not now
        </Button>
        <Button size="sm" onClick={handleAddToReport}
          className="flex-1 h-8 text-xs rounded-xl bg-[#7C6B5A] hover:bg-[#6B5A4A] text-white">
          Add to report →
        </Button>
      </div>
    </motion.div>
  )
}
