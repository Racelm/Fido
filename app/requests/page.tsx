import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles')
    .select('full_name, role, organization_id, organizations(name)')
    .eq('id', user.id).single()

  if (!profile || !['owner', 'staff'].includes(profile.role)) return null

  const { data: requests } = await supabase.from('document_requests')
    .select('id, title, description, status, due_date, created_at, client_id, clients(company_name)')
    .eq('organization_id', profile.organization_id)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false }).limit(100)

  const items = requests || []
  const pending = items.filter((r: any) => r.status === 'pending')
  const received = items.filter((r: any) => r.status === 'received')
  const overdue = pending.filter((r: any) => r.due_date && new Date(r.due_date + 'T23:59:59') < new Date())

  return <main className="app">
    <aside className="sidebar">
      <div className="brand">Fido<span>.</span></div>
      <nav className="nav">
        <Link href="/">⌂ &nbsp; Tableau de bord</Link>
        <Link href="/clients">♙ &nbsp; Clients</Link>
        <Link href="/documents">▣ &nbsp; Documents</Link>
        <Link className="active" href="/requests">✓ &nbsp; À traiter</Link>
        <Link href="/messages">✉ &nbsp; Messages</Link>
        <Link href="/settings">⚙ &nbsp; Paramètres</Link>
      </nav>
    </aside>
    <section className="main">
      <header className="topbar">
        <div><div className="eyebrow">{profile.organizations?.name}</div><h1 className="title">À traiter</h1></div>
        <div className="user"><span>{profile.full_name || 'Utilisateur'}</span><div className="avatar">{(profile.full_name || 'U').charAt(0).toUpperCase()}</div></div>
      </header>

      <div className="grid">
        <div className="card"><div className="kpi-label">Demandes ouvertes</div><div className="kpi">{pending.length}</div><div className="trend">En attente du client</div></div>
        <div className="card"><div className="kpi-label">En retard</div><div className="kpi">{overdue.length}</div><div className="trend">À relancer</div></div>
        <div className="card"><div className="kpi-label">Documents reçus</div><div className="kpi">{received.length}</div><div className="trend">À vérifier / traiter</div></div>
        <div className="card"><div className="kpi-label">Total demandes</div><div className="kpi">{items.length}</div><div className="trend">Historique récent</div></div>
      </div>

      <section className="card section">
        <div className="section-header"><div><div className="section-title">File de travail</div><p className="muted">Un seul endroit pour voir ce qui nécessite une action.</p></div></div>
        {items.length ? <div className="client-list">{items.map((request: any) => {
          const isOverdue = request.status === 'pending' && request.due_date && new Date(request.due_date + 'T23:59:59') < new Date()
          const label = request.status === 'pending' ? 'En attente' : request.status === 'received' ? 'Reçu' : 'Traité'
          return <Link className="client-row" href={'/clients/' + request.client_id} key={request.id}>
            <div className="client-avatar">{request.status === 'received' ? '✓' : '!'}</div>
            <div className="client-info"><strong>{request.title}</strong><span>{request.clients?.company_name || 'Client'} · {request.due_date ? 'Échéance ' + new Date(request.due_date + 'T12:00:00').toLocaleDateString('fr-FR') : 'Sans échéance'}</span></div>
            <span className={isOverdue ? 'status status-overdue' : 'status status-' + request.status}>{isOverdue ? 'En retard' : label}</span>
          </Link>
        })}</div> : <div className="empty-state"><div className="empty-icon">✓</div><strong>Tout est à jour</strong><span>Aucune demande de document à traiter.</span></div>}
      </section>
    </section>
  </main>
}