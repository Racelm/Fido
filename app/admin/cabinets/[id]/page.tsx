import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  adminDb,
  formatBytes,
  formatDate,
  isBanned,
  listAllAuthUsers,
  orgStatsMap,
  requireAdmin,
  ROLE_LABELS,
  STATUS_LABELS,
  type AuthUserLite,
  type OrgStats,
} from '@/lib/admin'
import { setCabinetStatus, setUserBlocked, updateCabinetContract } from '@/app/actions/admin'
import ActionForm from '@/components/admin/ActionForm'

const PLANS = ['Essai gratuit', 'Starter', 'Pro', 'Cabinet+', 'Sur mesure']

export default async function AdminCabinetPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const db = adminDb()
  const { data: org } = await db.from('organizations').select('*').eq('id', id).maybeSingle()
  if (!org) notFound()

  const [stats, users, { data: members }, { data: clients }, { data: events }] = await Promise.all([
    orgStatsMap().catch(() => new Map<string, OrgStats>()),
    listAllAuthUsers().catch((): AuthUserLite[] => []),
    db.from('profiles').select('id, full_name, role').eq('organization_id', id),
    db
      .from('clients')
      .select('id, company_name, email, status, profile_id, created_at')
      .eq('organization_id', id)
      .is('deleted_at', null)
      .order('company_name'),
    db
      .from('audit_events')
      .select('id, action, entity_type, meta, created_at')
      .eq('organization_id', id)
      .order('created_at', { ascending: false })
      .limit(25),
  ])

  const s = stats.get(id)
  const userById = new Map<string, AuthUserLite>(users.map((u) => [u.id, u] as const))
  const st = STATUS_LABELS[org.status] || { label: org.status, pill: 'pill-gray' }
  const team = (members || []).filter((m) => m.role !== 'client')
  const portalUsers = (members || []).filter((m) => m.role === 'client')

  return (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">
            <Link href="/admin">Administration</Link> · Cabinet
          </div>
          <h1>
            {org.name} <span className={`pill ${st.pill}`} style={{ verticalAlign: 'middle' }}>{st.label}</span>
          </h1>
          <p className="welcome">
            Inscrit le {formatDate(org.created_at)}
            {org.approved_at && ` · validé le ${formatDate(org.approved_at)}${org.approved_by ? ` par ${org.approved_by}` : ''}`}
          </p>
        </div>
        <div />
        <div />
      </header>

      <section className="kpi-grid">
        <div className="kpi k-violet">
          <div className="kpi-value">{s?.client_count ?? 0}</div>
          <div className="kpi-label">Clients</div>
          <div className="kpi-delta">{s?.portal_client_count ?? 0} sur le portail</div>
        </div>
        <div className="kpi k-blue">
          <div className="kpi-value">{(s?.owner_count ?? 0) + (s?.staff_count ?? 0)}</div>
          <div className="kpi-label">Membres de l’équipe</div>
        </div>
        <div className="kpi k-green">
          <div className="kpi-value">{s?.document_count ?? 0}</div>
          <div className="kpi-label">Documents</div>
          <div className="kpi-delta">{formatBytes(s?.storage_bytes ?? 0)}</div>
        </div>
        <div className="kpi k-red">
          <div className="kpi-value">{s?.open_request_count ?? 0}</div>
          <div className="kpi-label">Demandes en attente</div>
          <div className="kpi-delta">Activité : {formatDate(s?.last_activity_at, true)}</div>
        </div>
      </section>

      <div className="grid-2" style={{ marginTop: 16, gap: 16, alignItems: 'start' }}>
        {/* Statut */}
        <section className="card card-padded" data-testid="admin-status">
          <h2 className="section-title">Accès du cabinet</h2>
          {org.status === 'pending' && (
            <>
              <p className="section-sub">
                Ce cabinet attend votre validation. Ni l’équipe ni ses clients ne peuvent utiliser
                l’application tant qu’il n’est pas activé.
              </p>
              <ActionForm
                action={setCabinetStatus}
                confirmText={`Activer le cabinet « ${org.name} » ? Le propriétaire recevra un e-mail.`}
                successText="Cabinet activé."
                style={{ marginTop: 12 }}
              >
                <input type="hidden" name="organization_id" value={org.id} />
                <input type="hidden" name="status" value="active" />
                <button className="btn-primary" type="submit" data-testid="admin-activate">
                  Valider et activer le cabinet
                </button>
              </ActionForm>
            </>
          )}
          {org.status === 'active' && (
            <>
              <p className="section-sub">
                Le cabinet et ses clients ont accès à l’application. La suspension bloque
                immédiatement tous leurs accès (les données sont conservées).
              </p>
              <ActionForm
                action={setCabinetStatus}
                confirmText={`Suspendre l’accès du cabinet « ${org.name} » et de tous ses clients ?`}
                successText="Cabinet suspendu."
                style={{ marginTop: 12, display: 'grid', gap: 8 }}
              >
                <input type="hidden" name="organization_id" value={org.id} />
                <input type="hidden" name="status" value="suspended" />
                <input
                  className="search auth-input"
                  name="reason"
                  placeholder="Motif (ex. impayé, fin de contrat)"
                />
                <button className="btn-secondary" type="submit" data-testid="admin-suspend">
                  Suspendre le cabinet
                </button>
              </ActionForm>
            </>
          )}
          {org.status === 'suspended' && (
            <>
              <p className="section-sub">
                Suspendu le {formatDate(org.suspended_at, true)}
                {org.suspended_reason ? ` — motif : ${org.suspended_reason}` : ''}.
              </p>
              <ActionForm
                action={setCabinetStatus}
                confirmText={`Réactiver le cabinet « ${org.name} » ?`}
                successText="Cabinet réactivé."
                style={{ marginTop: 12 }}
              >
                <input type="hidden" name="organization_id" value={org.id} />
                <input type="hidden" name="status" value="active" />
                <button className="btn-primary" type="submit" data-testid="admin-reactivate">
                  Réactiver le cabinet
                </button>
              </ActionForm>
            </>
          )}
        </section>

        {/* Contrat */}
        <section className="card card-padded" data-testid="admin-contract">
          <h2 className="section-title">Contrat</h2>
          <ActionForm
            action={updateCabinetContract}
            successText="Contrat enregistré."
            style={{ display: 'grid', gap: 10, marginTop: 10 }}
          >
            <input type="hidden" name="organization_id" value={org.id} />
            <label className="upload-label">
              <span className="muted">Formule</span>
              <input
                className="search auth-input"
                name="contract_plan"
                list="plans"
                defaultValue={org.contract_plan || ''}
                placeholder="Starter, Pro…"
              />
              <datalist id="plans">
                {PLANS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>
            <div className="grid-2">
              <label className="upload-label">
                <span className="muted">Début</span>
                <input className="search auth-input" type="date" name="contract_start" defaultValue={org.contract_start || ''} />
              </label>
              <label className="upload-label">
                <span className="muted">Fin</span>
                <input className="search auth-input" type="date" name="contract_end" defaultValue={org.contract_end || ''} />
              </label>
            </div>
            <label className="upload-label">
              <span className="muted">Notes internes (non visibles par le cabinet)</span>
              <textarea
                className="search auth-input"
                name="admin_notes"
                rows={3}
                defaultValue={org.admin_notes || ''}
                placeholder="Contact, tarif négocié, échéances de paiement…"
              />
            </label>
            <button className="btn-secondary" type="submit" data-testid="admin-contract-save">
              Enregistrer le contrat
            </button>
          </ActionForm>
        </section>
      </div>

      {/* Équipe */}
      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-head">
          <div>
            <h2 className="section-title">Équipe du cabinet</h2>
            <p className="section-sub">{team.length} membre(s)</p>
          </div>
        </div>
        <UsersTable rows={team} userById={userById} adminId={admin.id} />
      </section>

      {/* Clients */}
      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-head">
          <div>
            <h2 className="section-title">Clients du cabinet</h2>
            <p className="section-sub">
              {clients?.length || 0} client(s) · {portalUsers.length} compte(s) portail
            </p>
          </div>
        </div>
        {clients?.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>E-mail</th>
                  <th>Portail</th>
                  <th>Dernière connexion</th>
                  <th>Créé le</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const u = c.profile_id ? userById.get(c.profile_id as string) : undefined
                  return (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.company_name}</strong>
                      </td>
                      <td>{c.email || '—'}</td>
                      <td>
                        {c.profile_id ? (
                          u && isBanned(u) ? (
                            <span className="pill pill-red">Bloqué</span>
                          ) : (
                            <span className="pill pill-green">Actif</span>
                          )
                        ) : (
                          <span className="pill pill-gray">Pas encore</span>
                        )}
                      </td>
                      <td>{formatDate(u?.lastSignInAt, true)}</td>
                      <td>{formatDate(c.created_at)}</td>
                      <td>
                        {u && <BlockButton userId={u.id} banned={isBanned(u)} email={u.email} />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state" style={{ padding: 22 }}>
            Aucun client pour l’instant.
          </p>
        )}
      </section>

      {/* Activité */}
      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-head">
          <div>
            <h2 className="section-title">Activité récente</h2>
            <p className="section-sub">25 derniers événements du journal d’audit</p>
          </div>
        </div>
        {events?.length ? (
          <table className="audit-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{formatDate(e.created_at, true)}</td>
                  <td>
                    <span className="pill pill-violet">{e.action}</span>
                  </td>
                  <td>
                    <code>{JSON.stringify(e.meta || {}).slice(0, 160)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state" style={{ padding: 22 }}>
            Aucune activité enregistrée.
          </p>
        )}
      </section>
    </>
  )
}

function UsersTable({
  rows,
  userById,
  adminId,
}: {
  rows: { id: string; full_name: string | null; role: string }[]
  userById: Map<string, AuthUserLite>
  adminId: string
}) {
  if (!rows.length) {
    return (
      <p className="empty-state" style={{ padding: 22 }}>
        Aucun membre.
      </p>
    )
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="audit-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>E-mail</th>
            <th>Rôle</th>
            <th>E-mail confirmé</th>
            <th>Dernière connexion</th>
            <th>État</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const u = userById.get(m.id)
            const banned = u ? isBanned(u) : false
            return (
              <tr key={m.id}>
                <td>{m.full_name || '—'}</td>
                <td>{u?.email || '—'}</td>
                <td>{ROLE_LABELS[m.role] || m.role}</td>
                <td>{u?.confirmed ? 'Oui' : 'Non'}</td>
                <td>{formatDate(u?.lastSignInAt, true)}</td>
                <td>
                  <span className={`pill ${banned ? 'pill-red' : 'pill-green'}`}>
                    {banned ? 'Bloqué' : 'Actif'}
                  </span>
                </td>
                <td>{u && u.id !== adminId && <BlockButton userId={u.id} banned={banned} email={u.email} />}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function BlockButton({ userId, banned, email }: { userId: string; banned: boolean; email: string }) {
  return (
    <ActionForm
      action={setUserBlocked}
      confirmText={banned ? `Débloquer ${email} ?` : `Bloquer la connexion de ${email} ?`}
    >
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="blocked" value={banned ? 'false' : 'true'} />
      <button className="btn-ghost" type="submit">
        {banned ? 'Débloquer' : 'Bloquer'}
      </button>
    </ActionForm>
  )
}
