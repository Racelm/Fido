/**
 * Returns the canonical application URL for links and Supabase Auth redirects.
 * NEXT_PUBLIC_SITE_URL is embedded at build time; set it in each deployment.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const base = configured || 'http://localhost:3000'
  return base.replace(/\/+$/, '')
}
