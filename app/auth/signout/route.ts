import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publicOrigin } from '@/lib/site-url'

/**
 * Déconnexion via une URL fixe (formulaire POST classique).
 * Contrairement à une Server Action, elle fonctionne même si la page ouverte
 * date d'une version précédente de l'application (après une mise en ligne).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut().catch(() => undefined)
  // 303 : le navigateur suit la redirection en GET
  return NextResponse.redirect(`${publicOrigin(request)}/login`, { status: 303 })
}

// Un simple lien /auth/signout ne déconnecte pas (évite les déconnexions
// déclenchées par un lien externe) : on renvoie vers la page de connexion.
export async function GET(request: NextRequest) {
  return NextResponse.redirect(`${publicOrigin(request)}/login`, { status: 303 })
}
