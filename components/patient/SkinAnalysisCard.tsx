'use client'

import { motion } from 'framer-motion'
import { Leaf, Loader2 } from 'lucide-react'
import type { SkinAnalysis } from '@/types/patient'

const CONDITION_CONFIG = {
  clear:       { label: 'Looking clear',      colour: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
  mild:        { label: 'Mild concerns',      colour: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100' },
  moderate:    { label: 'Some concerns',      colour: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  significant: { label: 'Worth monitoring',   colour: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100' },
}

type Props = {
  analysis: SkinAnalysis
  isLoading?: false
} | {
  analysis?: undefined
  isLoading: true
}

export default function SkinAnalysisCard({ analysis, isLoading }: Props) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#F8EDE6] rounded-2xl p-4 border border-[#EDD5C8] flex items-center gap-3"
      >
        <Loader2 size={15} className="text-[#C17A5A] animate-spin shrink-0" />
        <p className="text-sm text-stone-500 italic">Hazel is looking at your skin…</p>
      </motion.div>
    )
  }

  const condition = CONDITION_CONFIG[analysis.overallCondition]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-[#F8EDE6] rounded-2xl p-4 border border-[#EDD5C8]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Leaf size={13} className="text-[#C17A5A]" />
          <span className="text-xs font-medium text-[#C17A5A] uppercase tracking-wide">
            Hazel's observations
          </span>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${condition.bg} ${condition.colour} ${condition.border}`}>
          {condition.label}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-stone-700 leading-relaxed mb-3">{analysis.summary}</p>

      {/* Observations */}
      {analysis.observations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {analysis.observations.map((obs, i) => (
            <span key={i}
              className="text-xs bg-white/70 text-stone-600 border border-stone-200 rounded-full px-2.5 py-1">
              {obs}
            </span>
          ))}
        </div>
      )}

      {/* Confidence note */}
      {analysis.confidence === 'low' && (
        <p className="text-[10px] text-stone-400 mt-2">
          Photo quality made this harder to read — try in better light for a clearer analysis.
        </p>
      )}
    </motion.div>
  )
}
