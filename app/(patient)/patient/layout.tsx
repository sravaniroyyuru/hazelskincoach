import BottomNav from '@/components/patient/BottomNav'
import WelcomeTour from '@/components/patient/WelcomeTour'

export default function PatientTabLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-lg mx-auto min-h-screen" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
      {children}
      <BottomNav />
      <WelcomeTour />
    </div>
  )
}
