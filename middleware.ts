import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect clinic dashboard routes — never patient or root
  const isClinicRoute =
    pathname.startsWith('/appointments') ||
    pathname.startsWith('/calls') ||
    pathname.startsWith('/patients') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/sms')

  if (!isClinicRoute) {
    return NextResponse.next({ request })
  }

  // Skip Supabase auth if keys aren't configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  return await updateSession(request)
}

// Only run middleware on clinic dashboard routes
// Explicitly exclude / and /patient/* so they are never intercepted
export const config = {
  matcher: [
    '/appointments/:path*',
    '/calls/:path*',
    '/patients/:path*',
    '/settings/:path*',
    '/sms/:path*',
  ],
}
