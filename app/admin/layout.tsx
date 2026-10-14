import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { signOut } from '@/app/actions/auth'

export const dynamic = 'force-dynamic'

const NAV = [
  { href: '/admin', label: 'Vue d’ensemble', icon: '◫' },
  { href: '/admin/users', label: 'Utilisateurs', icon: '◉' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()

  return (
    <div className="shell">
      <aside className="sidebar" data-testid="admin-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-logo">T</span>
            <span>Tiwizi</span>
          </div>
        </div>
        <p className="eyebrow" style={{ padding: '0 18px', margin: '6px 0 2px' }}>
          Administration
        </p>
        <nav className="nav">
          {NAV.map((it) => (
            <Link key={it.href} href={it.href}>
              <span className="nav-icon" aria-hidden>
                {it.icon}
              </span>
              <span>{it.label}</span>
            </Link>
          ))}
          <Link href="/">
            <span className="nav-icon" aria-hidden>
              ←
            </span>
            <span>Retour à l’application</span>
          </Link>
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">AD</div>
          <div className="sidebar-user-info">
            <strong>Super-admin</strong>
            <span>{admin.email}</span>
          </div>
          <form action={signOut}>
            <button type="submit" title="Déconnexion">
              ↩
            </button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
