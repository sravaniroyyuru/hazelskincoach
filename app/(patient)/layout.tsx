import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Hazel — Your Skin Coach',
  description: 'Your personal AI skin coach',
}

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAF4EF] text-stone-900">
      {children}
      <Toaster position="top-center" />
    </div>
  )
}
