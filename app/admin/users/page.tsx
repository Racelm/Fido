import Link from 'next/link'
import {
  adminDb,
  formatDate,
  isBanned,
  listAllAuthUsers,
  requireAdmin,
  ROLE_LABELS,
  STATUS_LABELS,
} from '@/lib/admin'
import { isPlatformAdmin } from '@/lib/platform-admin'
import { setUserBlocked } from '@/app/actions/admin'
import ActionForm from '@/components/admin/ActionForm'

const ROLE_FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'owner', label: 'Propriétaires' },
  { key: 'staff', label: 'Collaborateurs' },
  { key: 'client', label: 'Clients' },
  { key: 'none', label: 'Sans espace' },
  { key: 'blocked', label: 'Bloqués' },
]

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>
}) {
  const admin = await requireAdmin()
  const params = await searchParams
  const filter = ROLE_FILTERS.some((f) => f.key === params.role) ? params.role! : 'all'
  const q = (params.q || '').trim().toLowerCase()

  const db = adminDb()
  const [users, { data: profiles }, { data: orgs }] = await Promise.all([
    listAllAuthUsers(),
    db.from('profiles').select('id, full_name, role, organization_id'),
    db.from('organizations').select('id, name, status'),
  ])

  type ProfileRow = { id: string; full_name: string | null; role: string; organization_id: string | null }
  type OrgRow = { id: string; name: string; status: string }
  const profileById = new Map(((profiles || []) as ProfileRow[]).map((p) => [p.id, p]))
  const orgById = new Map(((orgs || []) as OrgRow[]).map((o) => [o.id, o]))

  const rows = users
    .map((u) => {
      const p = profileById.get(u.id)
      const org = p?.organization_id ? orgById.get(p.organization_id) : undefined
      return { u, p, org, banned: isBanned(u) }
    })
    .sort((a, b) => b.u.createdAt.localeCompare(a.u.createdAt))

  const matches = (r: (typeof rows)[number], key: string) =>
    key === 'all' ||
    (key === 'blocked' && r.banned) ||
    (key === 'none' && !r.p) ||
    r.p?.role === key

  const visible = rows.filter((r) => {
    if (!matches(r, filter)) return false
    if (!q) return true
    return [r.u.email, r.p?.full_name as string, r.org?.name as string].some((v) =>
      (v || '').toLowerCase().includes(q)
    )
  })

  return (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">
            <Link href="/admin">Administration</Link> · Utilisateurs
          </div>
          <h1>Utilisateurs</h1>
          <p className="welcome">Tous les comptes de la plateforme ({users.length}).</p>
        </div>
        <div />
        <div />
      </header>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title">Comptes</h2>
            <p className="section-sub">{visible.length} affiché(s)</p>
          </div>
          <form style={{ display: 'flex', gap: 8 }}>
            {filter !== 'all' && <input type="hidden" name="role" value={filter} />}
            <input
              className="search auth-input"
              name="q"
              defaultValue={params.q || ''}
              placeholder="E-mail, nom, cabinet…"
              style={{ minWidth: 240 }}
            />
            <button className="btn-secondary" type="submit">
              Rechercher
            </button>
          </form>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '0 22px 12px', flexWrap: 'wrap' }}>
          {ROLE_FILTERS.map((f) => {
            const n = rows.filter((r) => matches(r, f.key)).length
            const qs = new URLSearchParams()
            if (f.key !== 'all') qs.set('role', f.key)
            if (q) qs.set('q', q)
            return (
              <Link
                key={f.key}
                href={`/admin/users${qs.toString() ? `?${qs}` : ''}`}
                className={`pill ${filter === f.key ? 'pill-violet' : 'pill-gray'}`}
              >
                {f.label} ({n})
              </Link>
            )
          })}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="audit-table" data-testid="admin-users">
            <thead>
              <tr>
                <th>E-mail</th>
                <th>Nom</th>
                <th>Rôle</th>
                <th>Cabinet</th>
                <th>Créé le</th>
                <th>Dernière connexion</th>
                <th>État</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map(({ u, p, org, banned }) => {
                const orgSt = org ? STATUS_LABELS[org.status as string] : undefined
                const isAdminAccount = isPlatformAdmin(u.email)
                return (
                  <tr key={u.id}>
                    <td>
                      {u.email}
                      {isAdminAccount && (
                        <span className="pill pill-violet" style={{ marginLeft: 6 }}>
                          Admin
                        </span>
                      )}
                      {!u.confirmed && (
                        <>
                          <br />
                          <small className="muted">e-mail non confirmé</small>
                        </>
                      )}
                    </td>
                    <td>{(p?.full_name as string) || '—'}</td>
                    <td>{p ? ROLE_LABELS[p.role as string] || p.role : <span className="muted">—</span>}</td>
                    <td>
                      {org ? (
                        <>
                          <Link href={`/admin/cabinets/${org.id}`}>{org.name as string}</Link>
                          {orgSt && org.status !== 'active' && (
                            <span className={`pill ${orgSt.pill}`} style={{ marginLeft: 6 }}>
                              {orgSt.label}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>{formatDate(u.lastSignInAt, true)}</td>
                    <td>
                      <span className={`pill ${banned ? 'pill-red' : 'pill-green'}`}>
                        {banned ? 'Bloqué' : 'Actif'}
                      </span>
                    </td>
                    <td>
                      {!isAdminAccount && u.id !== admin.id && (
                        <ActionForm
                          action={setUserBlocked}
                          confirmText={banned ? `Débloquer ${u.email} ?` : `Bloquer la connexion de ${u.email} ?`}
                        >
                          <input type="hidden" name="user_id" value={u.id} />
                          <input type="hidden" name="blocked" value={banned ? 'false' : 'true'} />
                          <button className="btn-ghost" type="submit">
                            {banned ? 'Débloquer' : 'Bloquer'}
                          </button>
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
