'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSnapshot } from '@/lib/patient/storage'

export default function PatientRoot() {
  const router = useRouter()

  useEffect(() => {
    const snap = getSnapshot()
    if (snap.onboarded) {
      router.replace('/patient/today')
    } else {
      router.replace('/patient/onboarding')
    }
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 rounded-full border-2 border-[#C17A5A] border-t-transparent animate-spin" />
    </div>
  )
}
