'use server'

import { revalidatePath } from 'next/cache'
import { adminDb, requireAdmin, requireRootAdmin } from '@/lib/admin'
import { cabinetActivatedTemplate, sendEmailSafe } from '@/lib/email'
import { isPlatformAdmin } from '@/lib/platform-admin'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Result = { ok?: boolean; error?: string }

const UUID = /^[0-9a-f-]{36}$/i

async function logAdminEvent(
  organizationId: string,
  action: string,
  adminEmail: string,
  meta: Record<string, unknown> = {}
) {
  // actor_id reste NULL : l'administrateur n'est pas forcément membre du cabinet.
  await adminDb()
    .from('audit_events')
    .insert({
      organization_id: organizationId,
      actor_id: null,
      action,
      entity_type: 'organization',
      entity_id: organizationId,
      meta: { ...meta, by_platform_admin: adminEmail },
    })
    .then(() => undefined, () => undefined)
}

/** Courriels des propriétaires d'un cabinet. */
async function ownerEmails(organizationId: string): Promise<string[]> {
  const db = adminDb()
  const { data: owners } = await db
    .from('profiles')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('role', 'owner')
  const emails: string[] = []
  for (const o of owners || []) {
    const { data } = await db.auth.admin.getUserById(o.id as string)
    if (data?.user?.email) emails.push(data.user.email)
  }
  return emails
}

/** Valide / suspend / réactive un cabinet. */
export async function setCabinetStatus(formData: FormData): Promise<Result> {
  const admin = await requireAdmin()
  const orgId = String(formData.get('organization_id') || '')
  const status = String(formData.get('status') || '')
  const reason = String(formData.get('reason') || '').trim() || null
  if (!UUID.test(orgId)) return { error: 'Cabinet invalide.' }
  if (!['active', 'suspended', 'pending'].includes(status)) return { error: 'Statut invalide.' }

  const db = adminDb()
  const { data: before } = await db
    .from('organizations')
    .select('name, status, approved_at')
    .eq('id', orgId)
    .maybeSingle()
  if (!before) return { error: 'Cabinet introuvable.' }

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { status }
  if (status === 'active') {
    patch.suspended_at = null
    patch.suspended_reason = null
    if (!before.approved_at) {
      patch.approved_at = now
      patch.approved_by = admin.email
    }
  }
  if (status === 'suspended') {
    patch.suspended_at = now
    patch.suspended_reason = reason
  }

  const { error } = await db.from('organizations').update(patch).eq('id', orgId)
  if (error) return { error: error.message }

  await logAdminEvent(orgId, `organization.${status}`, admin.email || '', {
    from: before.status,
    to: status,
    reason,
  })

  // Première activation : prévenir le(s) propriétaire(s)
  if (status === 'active' && before.status === 'pending') {
    const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
    if (base.startsWith('https://')) {
      const tpl = cabinetActivatedTemplate({
        cabinetName: before.name as string,
        loginUrl: `${base}/login`,
        appName: process.env.EMAIL_FROM_NAME || 'Tiwizi',
      })
      const emails = await ownerEmails(orgId)
      await Promise.all(emails.map((to) => sendEmailSafe({ to, ...tpl })))
    }
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/cabinets/${orgId}`)
  return { ok: true }
}

/** Met à jour les informations de contrat d'un cabinet. */
export async function updateCabinetContract(formData: FormData): Promise<Result> {
  const admin = await requireAdmin()
  const orgId = String(formData.get('organization_id') || '')
  if (!UUID.test(orgId)) return { error: 'Cabinet invalide.' }

  const text = (k: string) => {
    const v = String(formData.get(k) || '').trim()
    return v || null
  }
  const date = (k: string) => {
    const v = text(k)
    return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
  }
  const patch = {
    contract_plan: text('contract_plan'),
    contract_start: date('contract_start'),
    contract_end: date('contract_end'),
    admin_notes: text('admin_notes'),
  }
  if (patch.contract_start && patch.contract_end && patch.contract_end < patch.contract_start) {
    return { error: 'La date de fin doit être postérieure à la date de début.' }
  }

  const { error } = await adminDb().from('organizations').update(patch).eq('id', orgId)
  if (error) return { error: error.message }
  await logAdminEvent(orgId, 'organization.contract_update', admin.email || '', {
    plan: patch.contract_plan,
    start: patch.contract_start,
    end: patch.contract_end,
  })
  revalidatePath('/admin')
  revalidatePath(`/admin/cabinets/${orgId}`)
  return { ok: true }
}

/** Bloque / débloque la connexion d'un compte utilisateur. */
export async function setUserBlocked(formData: FormData): Promise<Result> {
  const admin = await requireAdmin()
  const userId = String(formData.get('user_id') || '')
  const blocked = String(formData.get('blocked') || '') === 'true'
  if (!UUID.test(userId)) return { error: 'Utilisateur invalide.' }
  if (userId === admin.id) return { error: 'Vous ne pouvez pas bloquer votre propre compte.' }

  const db = adminDb()
  const { data: target } = await db.auth.admin.getUserById(userId)
  if (!target?.user) return { error: 'Utilisateur introuvable.' }
  if (isPlatformAdmin(target.user.email)) return { error: 'Impossible de bloquer un administrateur.' }
  const { data: adminRow } = await db.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle()
  if (adminRow) return { error: 'Retirez d’abord ses droits d’administrateur.' }

  const { error } = await db.auth.admin.updateUserById(userId, {
    ban_duration: blocked ? '876000h' : 'none',
  })
  if (error) return { error: error.message }

  const { data: profile } = await db
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle()
  if (profile?.organization_id) {
    await logAdminEvent(profile.organization_id as string, blocked ? 'user.blocked' : 'user.unblocked', admin.email || '', {
      user_email: target.user.email,
    })
  }
  revalidatePath('/admin/users')
  if (profile?.organization_id) revalidatePath(`/admin/cabinets/${profile.organization_id}`)
  return { ok: true }
}

/**
 * Ajoute un administrateur de la plateforme.
 * Réservé aux propriétaires (PLATFORM_ADMIN_EMAILS). Le compte doit déjà
 * exister et avoir confirmé son adresse e-mail.
 */
export async function addPlatformAdmin(formData: FormData): Promise<Result> {
  const root = await requireRootAdmin()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  if (!EMAIL.test(email)) return { error: 'Adresse e-mail invalide.' }
  if (isPlatformAdmin(email)) return { error: 'Cette adresse est déjà propriétaire de la plateforme.' }

  const db = adminDb()
  // Recherche du compte (pagination Supabase Auth)
  let target: { id: string; email?: string; email_confirmed_at?: string | null } | undefined
  for (let page = 1; page <= 10 && !target; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return { error: error.message }
    target = data.users.find((u) => (u.email || '').toLowerCase() === email)
    if (data.users.length < 1000) break
  }
  if (!target) {
    return { error: 'Aucun compte avec cette adresse. La personne doit d’abord créer un compte et confirmer son e-mail.' }
  }
  if (!target.email_confirmed_at) {
    return { error: 'Ce compte n’a pas encore confirmé son adresse e-mail.' }
  }

  const { error } = await db
    .from('platform_admins')
    .upsert({ user_id: target.id, email, added_by: root.email || '' }, { onConflict: 'user_id' })
  if (error) return { error: error.message }
  revalidatePath('/admin/admins')
  return { ok: true }
}

/** Retire les droits d'un administrateur ajouté. Réservé aux propriétaires. */
export async function removePlatformAdmin(formData: FormData): Promise<Result> {
  await requireRootAdmin()
  const userId = String(formData.get('user_id') || '')
  if (!UUID.test(userId)) return { error: 'Administrateur invalide.' }
  const { error } = await adminDb().from('platform_admins').delete().eq('user_id', userId)
  if (error) return { error: error.message }
  revalidatePath('/admin/admins')
  return { ok: true }
}
