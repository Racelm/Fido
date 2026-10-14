import { redirect } from 'next/navigation'
import { createClient as createAdminClient, type User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isPlatformAdmin as isPlatformAdminEmail, isRootAdmin } from '@/lib/platform-admin'

type SessionClient = Awaited<ReturnType<typeof createClient>>

/**
 * L'utilisateur est-il administrateur ?
 *  - propriétaire (PLATFORM_ADMIN_EMAILS + e-mail confirmé), ou
 *  - administrateur ajouté par un propriétaire (table platform_admins).
 */
export async function isAdminUser(
  user: (User & { email_confirmed_at?: string | null }) | null | undefined,
  supabase?: SessionClient
): Promise<boolean> {
  if (!user) return false
  if (isRootAdmin(user)) return true
  if (!user.email_confirmed_at) return false
  const client = supabase || (await createClient())
  const { data, error } = await client.rpc('is_platform_admin')
  return !error && data === true
}

/**
 * Vérifie que l'utilisateur connecté est administrateur de la plateforme.
 * À appeler en tête de CHAQUE page et action admin.
 */
export async function requireAdmin(): Promise<User & { isRoot: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin')
  if (!(await isAdminUser(user, supabase))) redirect('/')
  return Object.assign(user, { isRoot: isRootAdmin(user) })
}

/** Réservé aux propriétaires de la plateforme (gestion des administrateurs). */
export async function requireRootAdmin(): Promise<User & { isRoot: boolean }> {
  const user = await requireAdmin()
  if (!user.isRoot) redirect('/admin')
  return user
}

/** Client service_role (contourne la RLS) — uniquement après requireAdmin(). */
export function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant : administration indisponible.')
  }
  return createAdminClient(url, key, { auth: { persistSession: false } })
}

export type AuthUserLite = {
  id: string
  email: string
  createdAt: string
  lastSignInAt: string | null
  confirmed: boolean
  bannedUntil: string | null
}

/** Tous les comptes Supabase Auth (paginé, plafonné à 10 000). */
export async function listAllAuthUsers(): Promise<AuthUserLite[]> {
  const db = adminDb()
  const out: AuthUserLite[] = []
  const perPage = 1000
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(error.message)
    for (const u of data.users) {
      out.push({
        id: u.id,
        email: u.email || '',
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at || null,
        confirmed: Boolean(u.email_confirmed_at),
        bannedUntil: (u as { banned_until?: string | null }).banned_until || null,
      })
    }
    if (data.users.length < perPage) break
  }
  return out
}

/** Identifiants de tous les administrateurs (propriétaires + ajoutés). */
export async function adminUserIds(users: AuthUserLite[]): Promise<Set<string>> {
  const ids = new Set<string>()
  for (const u of users) if (u.confirmed && isPlatformAdminEmail(u.email)) ids.add(u.id)
  const { data } = await adminDb().from('platform_admins').select('user_id')
  for (const r of data || []) ids.add(r.user_id as string)
  return ids
}

export function isBanned(u: AuthUserLite): boolean {
  return Boolean(u.bannedUntil && new Date(u.bannedUntil) > new Date())
}

export type OrgStats = {
  organization_id: string
  owner_count: number
  staff_count: number
  client_count: number
  portal_client_count: number
  document_count: number
  storage_bytes: number
  open_request_count: number
  last_activity_at: string | null
}

export async function orgStatsMap(): Promise<Map<string, OrgStats>> {
  const { data, error } = await adminDb().rpc('admin_organization_stats')
  if (error) throw new Error(`Statistiques indisponibles (migration 012 appliquée ?) : ${error.message}`)
  const map = new Map<string, OrgStats>()
  for (const row of (data || []) as OrgStats[]) {
    map.set(row.organization_id, {
      ...row,
      owner_count: Number(row.owner_count),
      staff_count: Number(row.staff_count),
      client_count: Number(row.client_count),
      portal_client_count: Number(row.portal_client_count),
      document_count: Number(row.document_count),
      storage_bytes: Number(row.storage_bytes),
      open_request_count: Number(row.open_request_count),
    })
  }
  return map
}

export const STATUS_LABELS: Record<string, { label: string; pill: string }> = {
  pending: { label: 'À valider', pill: 'pill-orange' },
  active: { label: 'Actif', pill: 'pill-green' },
  suspended: { label: 'Suspendu', pill: 'pill-red' },
}

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Propriétaire',
  staff: 'Collaborateur',
  client: 'Client',
}

export function formatBytes(n: number): string {
  if (!n) return '0 Mo'
  const mb = n / (1024 * 1024)
  return mb < 1024 ? `${mb.toFixed(mb < 10 ? 1 : 0)} Mo` : `${(mb / 1024).toFixed(1)} Go`
}

export function formatDate(d: string | null | undefined, withTime = false): string {
  if (!d) return '—'
  const date = new Date(d)
  return withTime
    ? date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
    : date.toLocaleDateString('fr-FR')
}
