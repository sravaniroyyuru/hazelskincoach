'use client'

import { useState, useEffect } from 'react'
import { getSnapshot, getRecentCheckins, getReportNudge, clearReportNudge, getRecentAnalyses } from '@/lib/patient/storage'
import type { PatientSnapshot, CheckInRecord, SkinAnalysis } from '@/types/patient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

type Report = {
  skinProfile: string
  currentRoutine: string
  recentHistory: string
  trends: string
  concerns: string
  questionsForDerm: string[]
  summary: string
}

const REPORT_SECTIONS: { key: keyof Omit<Report, 'questionsForDerm'>; title: string }[] = [
  { key: 'summary', title: 'Summary' },
  { key: 'skinProfile', title: 'Skin profile' },
  { key: 'currentRoutine', title: 'Current routine' },
  { key: 'recentHistory', title: 'Recent history' },
  { key: 'trends', title: 'Trends' },
  { key: 'concerns', title: 'Areas of concern' },
]

export default function ReportPage() {
  const [snap, setSnap] = useState<PatientSnapshot | null>(null)
  const [checkins, setCheckins] = useState<CheckInRecord[]>([])
  const [appointmentDate, setAppointmentDate] = useState('')
  const [patientConcerns, setPatientConcerns] = useState('')
  const [patientQuestions, setPatientQuestions] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>('summary')
  const [nudgeApplied, setNudgeApplied] = useState(false)
  const [recentAnalyses, setRecentAnalyses] = useState<SkinAnalysis[]>([])

  useEffect(() => {
    setSnap(getSnapshot())
    setCheckins(getRecentCheckins(7))
    const nudge = getReportNudge()
    if (nudge) {
      setPatientConcerns(nudge)
      setNudgeApplied(true)
      clearReportNudge()
    }
    setRecentAnalyses(getRecentAnalyses(14))
  }, [])

  async function handleGenerate() {
    setIsGenerating(true)
    setReport(null)
    try {
      const res = await fetch('/api/patient/derm-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot: snap,
          checkins,
          appointmentDate,
          patientConcerns,
          patientQuestions,
          photoAnalyses: recentAnalyses,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setReport(data)
      setExpandedSection('summary')
      toast.success('Report generated 🌿')
    } catch {
      toast.error('Could not generate report. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="px-5 pt-8 pb-4">
      <div className="flex items-center gap-2 mb-1">
        <FileText size={18} className="text-[#C17A5A]" />
        <h1 className="text-xl font-semibold text-stone-800">Derm report</h1>
      </div>
      <p className="text-stone-500 text-sm mb-6">
        Generate a summary to share with your dermatologist before your appointment.
      </p>

      {/* Form */}
      {!report && (
        <div className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-stone-100">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-stone-500 mb-1.5 block">Appointment date (optional)</label>
              <Input
                type="date"
                value={appointmentDate}
                onChange={e => setAppointmentDate(e.target.value)}
                className="border-stone-200"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-xs text-stone-500">Specific concerns to raise</label>
                {nudgeApplied && (
                  <span className="text-[10px] bg-[#F8EDE6] text-[#C17A5A] border border-[#EDD5C8] rounded-full px-2 py-0.5">
                    Added from Hazel's observations
                  </span>
                )}
              </div>
              <Textarea
                placeholder="e.g. Persistent breakouts on jawline, possible hormonal acne..."
                value={patientConcerns}
                onChange={e => setPatientConcerns(e.target.value)}
                className="resize-none h-20 border-stone-200 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1.5 block">Questions you want to ask</label>
              <Textarea
                placeholder="e.g. Is tretinoin right for me? Should I do a patch test before trying acids?"
                value={patientQuestions}
                onChange={e => setPatientQuestions(e.target.value)}
                className="resize-none h-20 border-stone-200 text-sm"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-[#C17A5A] hover:bg-[#A86848] text-white h-12 rounded-xl"
            >
              {isGenerating ? (
                <><Loader2 size={16} className="animate-spin mr-2" /> Generating report...</>
              ) : (
                <><Sparkles size={16} className="mr-2" /> Generate report</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Report */}
      <AnimatePresence>
        {report && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            {/* Regenerate button */}
            <Button variant="outline" size="sm" onClick={() => setReport(null)}
              className="self-start rounded-xl border-[#C17A5A] text-[#C17A5A] mb-1">
              ← Edit & regenerate
            </Button>

            {/* Report sections */}
            {REPORT_SECTIONS.map(({ key, title }) => (
              <div key={key} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  onClick={() => setExpandedSection(expandedSection === key ? null : key)}
                >
                  <span className="text-sm font-semibold text-stone-700">{title}</span>
                  {expandedSection === key
                    ? <ChevronUp size={16} className="text-stone-400" />
                    : <ChevronDown size={16} className="text-stone-400" />}
                </button>
                <AnimatePresence>
                  {expandedSection === key && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 border-t border-stone-100">
                        <p className="text-sm text-stone-600 leading-relaxed pt-3">{report[key]}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            {/* Questions for derm */}
            <div className="bg-[#F8EDE6] rounded-2xl p-5 border border-[#EDD5C8]">
              <h2 className="text-sm font-semibold text-stone-700 mb-3">
                💬 Suggested questions for your dermatologist
              </h2>
              <ul className="flex flex-col gap-2">
                {report.questionsForDerm.map((q, i) => (
                  <li key={i} className="flex gap-2 text-sm text-stone-600">
                    <span className="text-[#C17A5A] font-medium shrink-0">{i + 1}.</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-stone-400 text-center pb-2">
              This report is for your reference only. Always follow your dermatologist's advice.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
