import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'

type Profile = { full_name: string | null; role: 'owner' | 'staff' | 'client'; organization_id: string | null; organizations: { name: string } | null }

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name, role, organization_id, organizations(name)').eq('id', user.id).single<Profile>()
  if (!profile) return <main className="auth-page"><section className="auth-card"><div className="brand auth-brand">Fido<span>.</span></div><h1>Configuration en cours</h1><p className="auth-copy">Votre espace est en cours de création. Rafraîchissez cette page dans quelques instants.</p><form action={signOut}><button className="auth-switch">Se déconnecter</button></form></section></main>
  if (profile.role === 'client') redirect('/client')

  const organizationId = profile.organization_id!
  const [{ count: clientsCount }, { count: requestsCount }, { count: documentsCount }, { count: unreadCount }, { data: recentRequests }, { data: recentDocuments }] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active'),
    supabase.from('document_requests').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'pending'),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('recipient_id', user.id).is('read_at', null),
    supabase.from('document_requests').select('id,title,status,due_date,clients(company_name)').eq('organization_id', organizationId).eq('status','pending').order('created_at',{ascending:false}).limit(5),
    supabase.from('documents').select('id,name,created_at,clients(company_name)').eq('organization_id', organizationId).order('created_at',{ascending:false}).limit(5),
  ])

  return <main className="app"><aside className="sidebar"><div className="brand">Fido<span>.</span></div><nav className="nav">
    <Link className="active" href="/">⌂ &nbsp; Tableau de bord</Link><Link href="/clients">♙ &nbsp; Clients</Link><Link href="/documents">▣ &nbsp; Documents</Link><Link href="/requests">✓ &nbsp; À traiter</Link><Link href="/messages">✉ &nbsp; Messages</Link><Link href="/notifications">● &nbsp; Notifications {unreadCount ? <span className="nav-badge">{unreadCount}</span> : null}</Link><Link href="/settings">⚙ &nbsp; Paramètres</Link>
  </nav></aside><section className="main"><Header profile={profile} unread={unreadCount || 0} />
    <div className="grid"><Metric label="Clients actifs" value={clientsCount ?? 0} /><Metric label="Demandes ouvertes" value={requestsCount ?? 0} /><Metric label="Documents reçus" value={documentsCount ?? 0} /><Metric label="Notifications" value={unreadCount ?? 0} note={unreadCount ? 'À consulter' : 'Tout est à jour'} /></div>
    <section className="content-grid section"><section className="card"><div className="section-header"><div><div className="section-title">À traiter</div><p className="muted">Les demandes qui nécessitent une action.</p></div><Link className="secondary" href="/requests">Tout voir</Link></div>
      {recentRequests?.length ? recentRequests.map(r=><Link className="request-card request-link" href={`/clients/${r.clients?.id}`} key={r.id}><div><strong>{r.title}</strong><p className="muted">{r.clients?.company_name || 'Client'}</p></div><span className="status status-invited">En attente</span></Link>) : <div className="empty-state"><strong>Tout est à jour</strong><span>Aucune demande en attente.</span></div>}
    </section><section className="card"><div className="section-header"><div><div className="section-title">Documents récents</div><p className="muted">Derniers fichiers reçus.</p></div><Link className="secondary" href="/documents">Tout voir</Link></div>
      {recentDocuments?.length ? recentDocuments.map(d=><div className="client-row" key={d.id}><div className="client-avatar">▣</div><div className="client-info"><strong>{d.name}</strong><span>{d.clients?.company_name || 'Client'} · {new Date(d.created_at).toLocaleDateString('fr-FR')}</span></div></div>) : <div className="empty-state"><strong>Aucun document</strong><span>Les fichiers reçus apparaîtront ici.</span></div>}
    </section></section>
    <section className="card section"><div className="section-header"><div><div className="section-title">Bienvenue dans Fido</div><p className="auth-copy">Une seule plateforme pour gérer vos clients, demandes, documents et conversations.</p></div><Link className="primary" href="/clients">Ajouter un client</Link></div></section>
  </section></main>
}

function Header({ profile, unread }: { profile: Profile; unread: number }) {
  const initial = (profile.full_name || 'U').trim().charAt(0).toUpperCase()
  return <header className="topbar"><div><div className="eyebrow">{profile.organizations?.name}</div><h1 className="title">Tableau de bord</h1><p className="muted">Vue opérationnelle de votre cabinet</p></div><div className="user"><Link href="/notifications" className="notification-link">● {unread}</Link><span>{profile.full_name || 'Utilisateur'}</span><div className="avatar">{initial}</div><form action={signOut}><button className="logout" type="submit">Se déconnecter</button></form></div></header>
}

function Metric({ label, value, note = 'Données en temps réel' }: { label: string; value: number | string; note?: string }) {
  return <div className="card"><div className="kpi-label">{label}</div><div className="kpi">{value}</div><div className="trend">{note}</div></div>
}
