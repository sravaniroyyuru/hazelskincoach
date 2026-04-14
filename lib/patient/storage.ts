'use client'

import type {
  PatientSnapshot,
  RoutineProduct,
  RoutineStep,
  CheckInRecord,
  PhotoSet,
  CoachMessage,
  SkinAnalysis,
} from '@/types/patient'

const SNAPSHOT_KEY  = 'hazel-patient-snapshot'
const CHECKINS_KEY  = 'hazel-checkins'
const PHOTOS_KEY    = 'hazel-skin-photos'
const COACH_KEY     = 'hazel-coach-messages'
const ANALYSES_KEY  = 'hazel-skin-analyses'
const NUDGES_KEY    = 'hazel-dismissed-nudges'
const REPORT_NUDGE_KEY = 'hazel-report-nudge'
const COMPARISON_PREFIX = 'hazel-comparison-'
const ROUTINE_COMPLETIONS_KEY = 'hazel-routine-completions'
const DAILY_BRIEF_PREFIX = 'hazel-daily-brief-'

// ── Snapshot (profile + routine) ──────────────────────────────────────────────

const DEFAULT_SNAPSHOT: PatientSnapshot = {
  userName: '',
  onboarded: false,
  skinType: [],
  concerns: [],
  goals: [],
  products: [],
  routineSteps: [],
}

export function getSnapshot(): PatientSnapshot {
  if (typeof window === 'undefined') return DEFAULT_SNAPSHOT
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    return raw ? { ...DEFAULT_SNAPSHOT, ...JSON.parse(raw) } : DEFAULT_SNAPSHOT
  } catch {
    return DEFAULT_SNAPSHOT
  }
}

export function saveSnapshot(snapshot: Partial<PatientSnapshot>) {
  const current = getSnapshot()
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ ...current, ...snapshot }))
}

export function clearSnapshot() {
  localStorage.removeItem(SNAPSHOT_KEY)
}

// ── Products ──────────────────────────────────────────────────────────────────

export function getProducts(): RoutineProduct[] {
  return getSnapshot().products
}

export function saveProduct(product: RoutineProduct) {
  const snap = getSnapshot()
  const exists = snap.products.findIndex(p => p.id === product.id)
  if (exists >= 0) {
    snap.products[exists] = product
  } else {
    snap.products.push(product)
  }
  saveSnapshot({ products: snap.products })
}

export function deleteProduct(id: string) {
  const snap = getSnapshot()
  saveSnapshot({ products: snap.products.filter(p => p.id !== id) })
}

// ── Routine steps ─────────────────────────────────────────────────────────────

export function getRoutineSteps(): RoutineStep[] {
  return getSnapshot().routineSteps
}

export function saveRoutineStep(step: RoutineStep) {
  const snap = getSnapshot()
  const exists = snap.routineSteps.findIndex(s => s.id === step.id)
  if (exists >= 0) {
    snap.routineSteps[exists] = step
  } else {
    snap.routineSteps.push(step)
  }
  saveSnapshot({ routineSteps: snap.routineSteps })
}

export function deleteRoutineStep(id: string) {
  const snap = getSnapshot()
  saveSnapshot({ routineSteps: snap.routineSteps.filter(s => s.id !== id) })
}

// ── Check-ins ─────────────────────────────────────────────────────────────────

export function getCheckins(): CheckInRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CHECKINS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getTodayCheckin(): CheckInRecord | null {
  const today = new Date().toISOString().split('T')[0]
  return getCheckins().find(c => c.date === today) ?? null
}

export function saveCheckin(checkin: CheckInRecord) {
  const all = getCheckins().filter(c => c.date !== checkin.date)
  localStorage.setItem(CHECKINS_KEY, JSON.stringify([checkin, ...all]))
}

export function getRecentCheckins(days = 7): CheckInRecord[] {
  const all = getCheckins()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return all.filter(c => new Date(c.date) >= cutoff)
}

// ── Photos ────────────────────────────────────────────────────────────────────

const MAX_PHOTO_DAYS = 30

export function getPhotoSets(): PhotoSet[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PHOTOS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function savePhotoSet(photoSet: PhotoSet) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - MAX_PHOTO_DAYS)
  const existing = getPhotoSets()
    .filter(p => p.date !== photoSet.date && new Date(p.date) >= cutoff)
  localStorage.setItem(PHOTOS_KEY, JSON.stringify([photoSet, ...existing]))
}

export function getTodayPhotoSet(): PhotoSet | null {
  const today = new Date().toISOString().split('T')[0]
  return getPhotoSets().find(p => p.date === today) ?? null
}

// ── Coach messages ────────────────────────────────────────────────────────────

export function getCoachMessages(): CoachMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(COACH_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCoachMessages(messages: CoachMessage[]) {
  // Keep last 50 messages
  localStorage.setItem(COACH_KEY, JSON.stringify(messages.slice(-50)))
}

// ── Skin analyses ─────────────────────────────────────────────────────────────

export function getAnalyses(): SkinAnalysis[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ANALYSES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveAnalysis(analysis: SkinAnalysis) {
  const all = getAnalyses().filter(a => a.date !== analysis.date)
  localStorage.setItem(ANALYSES_KEY, JSON.stringify([analysis, ...all]))
}

export function getAnalysis(date: string): SkinAnalysis | null {
  return getAnalyses().find(a => a.date === date) ?? null
}

export function getRecentAnalyses(days = 7): SkinAnalysis[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return getAnalyses().filter(a => new Date(a.date) >= cutoff)
}

// ── Nudge management ──────────────────────────────────────────────────────────

export function dismissNudge(id: string) {
  const dismissed = getDismissedNudges()
  dismissed.push(id)
  localStorage.setItem(NUDGES_KEY, JSON.stringify(dismissed))
}

export function getDismissedNudges(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(NUDGES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function isNudgeDismissed(id: string): boolean {
  return getDismissedNudges().includes(id)
}

// ── Report nudge (pre-populate derm report with notable findings) ──────────────

export function setReportNudge(text: string) {
  localStorage.setItem(REPORT_NUDGE_KEY, text)
}

export function getReportNudge(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REPORT_NUDGE_KEY)
}

export function clearReportNudge() {
  localStorage.removeItem(REPORT_NUDGE_KEY)
}

// ── Comparison cache ──────────────────────────────────────────────────────────

export function getComparisonCache(dateA: string, dateB: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`${COMPARISON_PREFIX}${dateA}-${dateB}`)
}

export function saveComparisonCache(dateA: string, dateB: string, summary: string) {
  localStorage.setItem(`${COMPARISON_PREFIX}${dateA}-${dateB}`, summary)
}

// ── Routine completions (daily checklist persistence) ────────────────────────

type RoutineCompletions = {
  am: Record<string, boolean>
  pm: Record<string, boolean>
}

export function getRoutineCompletions(date: string): RoutineCompletions {
  if (typeof window === 'undefined') return { am: {}, pm: {} }
  try {
    const raw = localStorage.getItem(ROUTINE_COMPLETIONS_KEY)
    const all: Record<string, RoutineCompletions> = raw ? JSON.parse(raw) : {}
    return all[date] ?? { am: {}, pm: {} }
  } catch {
    return { am: {}, pm: {} }
  }
}

export function saveRoutineCompletion(
  date: string,
  period: 'am' | 'pm',
  stepId: string,
  checked: boolean
) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(ROUTINE_COMPLETIONS_KEY)
    const all: Record<string, RoutineCompletions> = raw ? JSON.parse(raw) : {}
    if (!all[date]) all[date] = { am: {}, pm: {} }
    all[date][period][stepId] = checked
    // Keep only last 14 days to avoid bloat
    const keys = Object.keys(all).sort().slice(-14)
    const pruned: Record<string, RoutineCompletions> = {}
    keys.forEach(k => { pruned[k] = all[k] })
    localStorage.setItem(ROUTINE_COMPLETIONS_KEY, JSON.stringify(pruned))
  } catch {
    // silent
  }
}

// ── Daily brief cache ─────────────────────────────────────────────────────────

type DailyBrief = { brief: string; focusTip: string }

export function getDailyBrief(date: string): DailyBrief | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${DAILY_BRIEF_PREFIX}${date}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveDailyBrief(date: string, data: DailyBrief) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${DAILY_BRIEF_PREFIX}${date}`, JSON.stringify(data))
}

// ── Streak helpers ────────────────────────────────────────────────────────────

export function getRoutineStreak(): number {
  const checkins = getCheckins()
  if (checkins.length === 0) return 0
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const checkin = checkins.find(c => c.date === dateStr)
    if (checkin && checkin.routine !== 'skipped') {
      streak++
    } else if (i > 0) {
      break
    }
  }
  return streak
}
