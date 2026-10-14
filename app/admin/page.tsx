import Link from 'next/link'
import {
  adminDb,
  formatBytes,
  formatDate,
  listAllAuthUsers,
  orgStatsMap,
  requireAdmin,
  STATUS_LABELS,
  type AuthUserLite,
  type OrgStats,
} from '@/lib/admin'
import { setCabinetStatus } from '@/app/actions/admin'
import ActionForm from '@/components/admin/ActionForm'

type Org = {
  id: string
  name: string
  status: string
  created_at: string
  approved_at: string | null
  contract_plan: string | null
  contract_end: string | null
}

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'pending', label: 'À valider' },
  { key: 'active', label: 'Actifs' },
  { key: 'suspended', label: 'Suspendus' },
]

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  await requireAdmin()
  const params = await searchParams
  const filter = FILTERS.some((f) => f.key === params.status) ? params.status! : 'all'
  const q = (params.q || '').trim().toLowerCase()

  const db = adminDb()
  const [{ data: orgRows, error: orgError }, stats, users, { data: owners }] = await Promise.all([
    db
      .from('organizations')
      .select('id, name, status, created_at, approved_at, contract_plan, contract_end')
      .order('created_at', { ascending: false }),
    orgStatsMap().catch(() => new Map<string, OrgStats>()),
    listAllAuthUsers().catch((): AuthUserLite[] => []),
    db.from('profiles').select('id, organization_id, full_name').eq('role', 'owner'),
  ])

  if (orgError) {
    return (
      <section className="card card-padded">
        <h1>Administration</h1>
        <p className="auth-error">
          Impossible de charger les cabinets : {orgError.message}. Avez-vous exécuté la migration
          012 dans Supabase ?
        </p>
      </section>
    )
  }

  const orgs = (orgRows || []) as Org[]
  const emailById = new Map<string, string>(users.map((u) => [u.id, u.email] as const))
  const ownerByOrg = new Map<string, { name: string; email: string }>()
  for (const o of owners || []) {
    if (!ownerByOrg.has(o.organization_id as string)) {
      ownerByOrg.set(o.organization_id as string, {
        name: (o.full_name as string) || '',
        email: emailById.get(o.id as string) || '',
      })
    }
  }

  const count = (s: string) => orgs.filter((o) => o.status === s).length
  const sum = (k: 'client_count' | 'document_count' | 'storage_bytes' | 'portal_client_count') =>
    [...stats.values()].reduce((acc, s) => acc + (s[k] || 0), 0)
  const since30 = Date.now() - 30 * 86400000
  const newOrgs30 = orgs.filter((o) => new Date(o.created_at).getTime() > since30).length
  const today = new Date().toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const expiring = orgs.filter(
    (o) => o.status === 'active' && o.contract_end && o.contract_end <= in30
  )

  const visible = orgs.filter((o) => {
    if (filter !== 'all' && o.status !== filter) return false
    if (!q) return true
    const owner = ownerByOrg.get(o.id)
    return [o.name, owner?.name, owner?.email].some((v) => (v || '').toLowerCase().includes(q))
  })

  return (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">Administration de la plateforme</div>
          <h1>Vue d’ensemble</h1>
          <p className="welcome">Cabinets, clients et utilisateurs de Tiwizi.</p>
        </div>
        <div />
        <div />
      </header>

      <section className="kpi-grid" data-testid="admin-kpis">
        <div className="kpi k-red">
          <div className="kpi-value">{count('pending')}</div>
          <div className="kpi-label">Cabinets à valider</div>
        </div>
        <div className="kpi k-green">
          <div className="kpi-value">{count('active')}</div>
          <div className="kpi-label">Cabinets actifs</div>
          <div className="kpi-delta">{count('suspended')} suspendu(s) · {newOrgs30} nouveau(x) sur 30 j</div>
        </div>
        <div className="kpi k-violet">
          <div className="kpi-value">{sum('client_count')}</div>
          <div className="kpi-label">Clients gérés</div>
          <div className="kpi-delta">{sum('portal_client_count')} avec accès au portail</div>
        </div>
        <div className="kpi k-blue">
          <div className="kpi-value">{users.length}</div>
          <div className="kpi-label">Comptes utilisateurs</div>
          <div className="kpi-delta">
            {sum('document_count')} documents · {formatBytes(sum('storage_bytes'))}
          </div>
        </div>
      </section>

      {expiring.length > 0 && (
        <section className="card card-padded" style={{ marginTop: 16 }} data-testid="admin-expiring">
          <h2 className="section-title">Contrats à renouveler</h2>
          <p className="section-sub">Contrats actifs qui expirent dans les 30 jours ou sont déjà échus.</p>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {expiring.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/cabinets/${o.id}`}>{o.name}</Link> — fin le{' '}
                <strong>{formatDate(o.contract_end)}</strong>
                {o.contract_end! < today && <span className="pill pill-red" style={{ marginLeft: 8 }}>Échu</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-head">
          <div>
            <h2 className="section-title">Cabinets</h2>
            <p className="section-sub">{visible.length} affiché(s) sur {orgs.length}</p>
          </div>
          <form style={{ display: 'flex', gap: 8 }}>
            {filter !== 'all' && <input type="hidden" name="status" value={filter} />}
            <input
              className="search auth-input"
              name="q"
              defaultValue={params.q || ''}
              placeholder="Rechercher un cabinet, un e-mail…"
              style={{ minWidth: 240 }}
            />
            <button className="btn-secondary" type="submit">
              Rechercher
            </button>
          </form>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '0 22px 12px', flexWrap: 'wrap' }}>
          {FILTERS.map((f) => {
            const n = f.key === 'all' ? orgs.length : count(f.key)
            const href = `/admin${f.key === 'all' ? '' : `?status=${f.key}`}${q ? `${f.key === 'all' ? '?' : '&'}q=${encodeURIComponent(q)}` : ''}`
            return (
              <Link
                key={f.key}
                href={href}
                className={`pill ${filter === f.key ? 'pill-violet' : 'pill-gray'}`}
                data-testid={`admin-filter-${f.key}`}
              >
                {f.label} ({n})
              </Link>
            )
          })}
        </div>

        {visible.length === 0 ? (
          <p className="empty-state" style={{ padding: 22 }}>
            Aucun cabinet pour ce filtre.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="audit-table" data-testid="admin-cabinets">
              <thead>
                <tr>
                  <th>Cabinet</th>
                  <th>Propriétaire</th>
                  <th>Statut</th>
                  <th>Inscrit le</th>
                  <th>Clients</th>
                  <th>Équipe</th>
                  <th>Documents</th>
                  <th>Dernière activité</th>
                  <th>Contrat</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((o) => {
                  const s = stats.get(o.id)
                  const owner = ownerByOrg.get(o.id)
                  const st = STATUS_LABELS[o.status] || { label: o.status, pill: 'pill-gray' }
                  return (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/admin/cabinets/${o.id}`}>
                          <strong>{o.name}</strong>
                        </Link>
                      </td>
                      <td>
                        {owner?.name || '—'}
                        <br />
                        <small className="muted">{owner?.email || ''}</small>
                      </td>
                      <td>
                        <span className={`pill ${st.pill}`}>{st.label}</span>
                      </td>
                      <td>{formatDate(o.created_at)}</td>
                      <td>
                        {s?.client_count ?? 0}
                        <br />
                        <small className="muted">{s?.portal_client_count ?? 0} sur le portail</small>
                      </td>
                      <td>{(s?.owner_count ?? 0) + (s?.staff_count ?? 0)}</td>
                      <td>
                        {s?.document_count ?? 0}
                        <br />
                        <small className="muted">{formatBytes(s?.storage_bytes ?? 0)}</small>
                      </td>
                      <td>{formatDate(s?.last_activity_at, true)}</td>
                      <td>
                        {o.contract_plan || '—'}
                        {o.contract_end && (
                          <>
                            <br />
                            <small className="muted">jusqu’au {formatDate(o.contract_end)}</small>
                          </>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {o.status === 'pending' ? (
                          <ActionForm
                            action={setCabinetStatus}
                            confirmText={`Activer le cabinet « ${o.name} » ? Le propriétaire recevra un e-mail.`}
                          >
                            <input type="hidden" name="organization_id" value={o.id} />
                            <input type="hidden" name="status" value="active" />
                            <button className="btn-primary" type="submit" data-testid={`approve-${o.id}`}>
                              Valider
                            </button>
                          </ActionForm>
                        ) : (
                          <Link className="btn-secondary" href={`/admin/cabinets/${o.id}`}>
                            Gérer
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
