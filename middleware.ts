import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Patient routes are localStorage-based — never need Supabase auth
  if (pathname === '/' || pathname.startsWith('/patient')) {
    return NextResponse.next({ request })
  }

  // Only protect clinic dashboard and auth routes
  const isClinicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/vapi|api/twilio|api/patient|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
