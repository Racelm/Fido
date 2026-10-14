/**
 * Adresse publique de l'application (p. ex. https://raeldata.com).
 *
 * Derrière le proxy de l'hébergeur, `request.url` contient l'adresse interne
 * du serveur Node (p. ex. http://0.0.0.0:3000). Les redirections doivent donc
 * toujours être construites à partir de l'URL publique.
 */
export function publicOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      /* valeur invalide : on continue */
    }
  }
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (host && !/^(0\.0\.0\.0|127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) {
    const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
    return `${proto}://${host}`
  }
  return new URL(request.url).origin
}

/** N'accepte que des chemins internes (« /… », jamais « //… » ni une URL absolue). */
export function safeInternalPath(path: string | null | undefined, fallback = '/'): string {
  if (!path) return fallback
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : fallback
}
