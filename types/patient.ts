export type SkinType = 'oily' | 'dry' | 'combination' | 'normal' | 'sensitive' | 'dehydrated'

export type SkinConcern =
  | 'acne'
  | 'pigmentation'
  | 'anti-ageing'
  | 'redness'
  | 'texture'
  | 'hydration'
  | 'sensitivity'
  | 'dark-circles'

export type RoutineGoal =
  | 'clear-skin'
  | 'glow'
  | 'anti-ageing'
  | 'calm-redness'
  | 'hydration'
  | 'consistency'

export type RoutineProduct = {
  id: string
  name: string
  brand: string | null
  category: string | null
  keyIngredients: string[]
  flags: string[]
  status: 'active' | 'stopped'
}

export type RoutineStep = {
  id: string
  stepName: string
  timeOfDay: 'am' | 'pm'
  frequency: 'daily' | 'every_other_day' | 'weekly' | 'as_needed'
  sortOrder: number
  isPaused: boolean
  usageNotes: string
  productId: string | null
  product?: RoutineProduct | null
}

export type CheckIn = {
  skinFeel: string   // great | good | meh | bad
  breakouts: string  // none | minor | moderate | bad
  routine: string    // full | partial | skipped
  picking: string    // none | a-bit | yes
  mood: string       // great | good | meh | stressed
}

export type CheckInRecord = CheckIn & {
  id: string
  date: string // ISO date string YYYY-MM-DD
  dermNote?: string
}

export type SkinPhoto = {
  angle: 'front' | 'left-profile' | 'right-profile' | 'left-side' | 'right-side'
  dataUrl: string
}

export type PhotoSet = {
  date: string // YYYY-MM-DD
  photos: SkinPhoto[]
}

export type PatientSnapshot = {
  userName: string
  onboarded: boolean
  skinType: SkinType[]
  concerns: SkinConcern[]
  goals: RoutineGoal[]
  products: RoutineProduct[]
  routineSteps: RoutineStep[]
}

export type CoachMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type SkinAnalysis = {
  date: string                                                        // YYYY-MM-DD
  summary: string                                                     // 1–2 sentence overall
  observations: string[]                                              // specific visible notes
  overallCondition: 'clear' | 'mild' | 'moderate' | 'significant'
  notableFindings: string[]                                           // items worth flagging to derm
  confidence: 'high' | 'medium' | 'low'
}
