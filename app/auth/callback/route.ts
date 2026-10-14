import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publicOrigin, safeInternalPath } from '@/lib/site-url'

/**
 * Supabase Auth PKCE callback.
 *
 * Après un clic sur un lien d'e-mail (confirmation d'inscription, invitation
 * Supabase native…), Supabase redirige vers
 * `/auth/callback?code=<pkce_code>&next=/…` (ou avec `error=…` si le lien est
 * invalide/expiré). Ce handler échange le `code` contre une session puis
 * redirige vers `next`.
 */
export async function GET(request: NextRequest) {
  const base = publicOrigin(request)
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeInternalPath(searchParams.get('next'))
  const isInvite = next.startsWith('/invite/')
  const errorCode = searchParams.get('error_code')
  const errorParam = searchParams.get('error_description') || searchParams.get('error')

  // Lien invalide / expiré / déjà utilisé
  if (errorParam || !code) {
    if (isInvite) {
      const reason = errorCode === 'otp_expired' || errorParam ? 'link-expired' : 'missing-code'
      return NextResponse.redirect(`${base}${next}?error=${reason}`)
    }
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent(errorParam || 'missing-code')}`
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    // Cas typique : lien ouvert sur un autre appareil/navigateur que celui de
    // l'inscription (PKCE). L'e-mail est confirmé côté Supabase : il suffit de
    // se connecter, puis l'invitation est finalisée.
    if (isInvite) {
      return NextResponse.redirect(
        `${base}/login?error=email-confirmed&redirect=${encodeURIComponent(next)}`
      )
    }
    return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${base}${next}`)
}
