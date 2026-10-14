'use server'

import { revalidatePath } from 'next/cache'
import { adminDb, requireAdmin } from '@/lib/admin'
import { cabinetActivatedTemplate, sendEmailSafe } from '@/lib/email'
import { isPlatformAdmin } from '@/lib/platform-admin'

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
