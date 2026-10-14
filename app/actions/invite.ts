'use server'

import { headers } from 'next/headers'
import { createHash } from 'crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdminClient(url, key, { auth: { persistSession: false } })
}

/**
 * Retourne l'adresse e-mail à laquelle l'invitation a été envoyée, pour que la
 * page d'invitation n'utilise jamais une autre session ouverte dans le navigateur.
 * Seul le détenteur du lien (token secret) peut l'interroger. Rate-limited.
 */
export async function getInvitationInfo(
  rawToken: string
): Promise<{ email?: string; error?: string }> {
  const h = await headers()
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  const rl = rateLimit(`invite-info:${ip}`, 30, 5 * 60 * 1000)
  if (!rl.allowed) {
    return { error: `Trop de tentatives, réessayez dans ${Math.ceil(rl.retryAfterMs / 1000)}s.` }
  }
  if (!/^[a-f0-9]{64}$/i.test(rawToken)) return { error: 'Lien d’invitation invalide.' }

  const admin = adminClient()
  if (!admin) return { error: 'Configuration serveur incomplète.' }

  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const { data } = await admin
    .from('client_invitations')
    .select('email, expires_at, accepted_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!data) return { error: 'Lien d’invitation invalide.' }
  if (data.accepted_at) return { error: 'Cette invitation a déjà été utilisée. Connectez-vous.' }
  if (new Date(data.expires_at) < new Date()) {
    return { error: 'Cette invitation a expiré. Demandez un nouveau lien à votre cabinet.' }
  }
  return { email: data.email as string }
}

/**
 * Résout une invitation à partir du token brut. Rate-limited pour freiner
 * les tentatives d'énumération / brute-force.
 */
export async function acceptInvitation(rawToken: string, userName: string) {
  const h = await headers()
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'

  const rl = rateLimit(`invite:${ip}`, 10, 5 * 60 * 1000)
  if (!rl.allowed) {
    return { error: `Trop de tentatives, réessayez dans ${Math.ceil(rl.retryAfterMs / 1000)}s.` }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session non initialisée.' }

  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const { data: clientId, error } = await supabase.rpc('claim_client_invitation', {
    invitation_token_hash: tokenHash,
    user_name: userName,
  })
  if (error) return { error: error.message }
  return { success: true, clientId }
}
