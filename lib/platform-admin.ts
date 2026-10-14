/**
 * Administrateurs de la plateforme Tiwizi (super-admins).
 *
 * Définis uniquement par la variable d'environnement serveur
 * PLATFORM_ADMIN_EMAILS (liste séparée par des virgules), jamais par une
 * donnée modifiable depuis l'application. Sans dépendance : utilisable dans
 * le middleware comme côté serveur.
 */
export function platformAdminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return platformAdminEmails().includes(email.trim().toLowerCase())
}
