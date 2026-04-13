import BottomNav from '@/components/patient/BottomNav'

export default function PatientTabLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-lg mx-auto min-h-screen pb-20">
      {children}
      <BottomNav />
    </div>
  )
}
