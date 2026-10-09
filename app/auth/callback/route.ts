import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function loginError(request: NextRequest, message: string) {
  const url = new URL('/login', request.url)
  url.searchParams.set('error', message)
  return NextResponse.redirect(url)
}

/** Exchange Supabase's PKCE code for a cookie-backed session. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/'
  const authError = searchParams.get('error_description') || searchParams.get('error')

  if (authError) {
    return loginError(request, 'Le lien de connexion a expiré ou n’est plus valide. Demandez un nouveau lien.')
  }
  if (!code) {
    return loginError(request, 'Le lien de confirmation est incomplet. Demandez un nouvel e-mail.')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return loginError(request, 'Impossible de confirmer votre connexion. Le lien est peut-être expiré.')
  }

  // Accept only internal absolute-path references, never protocol-relative or external URLs.
  const safeNext = next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')
    ? next
    : '/'
  const destination = new URL(safeNext, request.url)
  if (destination.origin !== new URL(request.url).origin) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  return NextResponse.redirect(destination)
}
