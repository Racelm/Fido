'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
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

/**
 * Invitation en attente pour l'utilisateur connecté (sans profil), retrouvée
 * via son adresse e-mail confirmée. Sert de filet de sécurité quand le lien
 * d'invitation n'a pas pu être finalisé (lien ouvert sur un autre appareil…).
 */
async function pendingInvitationForCurrentUser(): Promise<{
  tokenHash: string
  cabinetName: string
  clientCompany: string
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !user.email_confirmed_at) return null

  const admin = adminClient()
  if (!admin) return null
  const { data } = await admin
    .from('client_invitations')
    .select('token_hash, expires_at, clients(company_name, organizations(name))')
    // ilike = comparaison insensible à la casse ; on échappe les jokers % et _
    .ilike('email', user.email.replace(/[\\%_]/g, (c) => `\\${c}`))
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null

  const client = (Array.isArray(data.clients) ? data.clients[0] : data.clients) as
    | { company_name?: string | null; organizations?: { name?: string | null } | { name?: string | null }[] | null }
    | null
  const org = Array.isArray(client?.organizations) ? client?.organizations[0] : client?.organizations
  return {
    tokenHash: data.token_hash as string,
    cabinetName: org?.name || 'votre cabinet',
    clientCompany: client?.company_name || '',
  }
}

/** Résumé affichable (sans le hash du jeton) de l'invitation en attente. */
export async function findPendingInvitationForCurrentUser(): Promise<{
  cabinetName: string
  clientCompany: string
} | null> {
  const pending = await pendingInvitationForCurrentUser()
  return pending ? { cabinetName: pending.cabinetName, clientCompany: pending.clientCompany } : null
}

/** Finalise l'invitation en attente de l'utilisateur connecté (e-mail vérifié). */
export async function claimPendingInvitation(formData: FormData): Promise<void> {
  const name = String(formData.get('name') || '').trim()
  const pending = await pendingInvitationForCurrentUser()
  if (!pending) redirect('/no-access?error=none')

  const supabase = await createClient()
  // La fonction SQL vérifie que l'e-mail du JWT correspond à l'invitation.
  const { error } = await supabase.rpc('claim_client_invitation', {
    invitation_token_hash: pending.tokenHash,
    user_name: name,
  })
  if (error) redirect(`/no-access?error=${encodeURIComponent(error.message)}`)
  redirect('/client')
}
