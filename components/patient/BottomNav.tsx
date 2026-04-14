'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, TrendingUp, BookOpen, MessageCircle, FileText } from 'lucide-react'

const tabs = [
  { href: '/patient/today', label: 'Today', icon: Sun },
  { href: '/patient/progress', label: 'Progress', icon: TrendingUp },
  { href: '/patient/routine', label: 'Routine', icon: BookOpen },
  { href: '/patient/coach', label: 'Coach', icon: MessageCircle },
  { href: '/patient/report', label: 'Report', icon: FileText },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 h-16">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
                active
                  ? 'text-[#C17A5A]'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
