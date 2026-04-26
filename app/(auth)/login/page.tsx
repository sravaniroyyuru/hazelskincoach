'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Leaf } from 'lucide-react'

/**
 * /login — safety-net page.
 *
 * The old middleware redirected every unauthenticated request here.
 * This is a patient-facing app with no Supabase auth for patients, so we
 * simply forward visitors on to the patient hub. If Supabase auth is needed
 * for the clinic dashboard in future, add a clinic login form here.
 */
export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/patient')
  }, [router])

  return (
    <div className="min-h-screen bg-[#FAF4EF] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#F8EDE6] flex items-center justify-center">
          <Leaf size={18} className="text-[#C17A5A]" />
        </div>
        <div className="w-5 h-5 rounded-full border-2 border-[#C17A5A] border-t-transparent animate-spin" />
      </div>
    </div>
  )
}
