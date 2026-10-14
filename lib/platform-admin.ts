/**
 * Propriétaires de la plateforme Tiwizi (super-admins racine).
 *
 * Définis uniquement par la variable d'environnement serveur
 * PLATFORM_ADMIN_EMAILS (liste séparée par des virgules), jamais par une
 * donnée modifiable depuis l'application. Sans dépendance : utilisable dans
 * le middleware comme côté serveur.
 *
 * Les administrateurs ajoutés depuis /admin/admins sont vérifiés à part
 * (table platform_admins, voir lib/admin.ts).
 */
export function platformAdminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

/** L'adresse figure-t-elle dans PLATFORM_ADMIN_EMAILS ? (sans vérifier le compte) */
export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return platformAdminEmails().includes(email.trim().toLowerCase())
}

type AuthUserLike = {
  email?: string | null
  email_confirmed_at?: string | null
} | null | undefined

/**
 * Propriétaire de la plateforme : adresse dans PLATFORM_ADMIN_EMAILS ET
 * e-mail confirmé. La confirmation empêche qu'un tiers s'inscrive avec une
 * adresse admin qui n'aurait pas encore de compte.
 */
export function isRootAdmin(user: AuthUserLike): boolean {
  return Boolean(user?.email_confirmed_at) && isPlatformAdmin(user?.email)
}
