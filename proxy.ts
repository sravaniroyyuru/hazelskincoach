import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  // Patient routes are localStorage-based — no Supabase auth needed
  if (request.nextUrl.pathname.startsWith('/patient')) {
    return NextResponse.next({ request })
  }

  // Clinic dashboard routes require Supabase auth
  // Skip if keys aren't configured yet (local dev without Supabase)
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
