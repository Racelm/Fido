import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Safety net for old Supabase templates that still return code to "/".
  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  return updateSession(request)
}

export const config = {
  // On exclut les assets statiques ; l'authentification s'occupe du reste.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
