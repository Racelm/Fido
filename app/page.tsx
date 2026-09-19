import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'

type Profile = {
  full_name: string | null
  role: 'owner' | 'staff' | 'client'
  organization_id: string | null
  organizations: { name: string } | null
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, organization_id, organizations(name)')
    .eq('id', user.id)
    .single<Profile>()

  if (!profile) {
    return <main className="auth-page"><section className="auth-card"><div className="brand auth-brand">Fido<span>.</span></div><h1>Configuration en cours</h1><p className="auth-copy">Votre espace est en cours de création. Rafraîchissez cette page dans quelques instants.</p><form action={signOut}><button className="auth-switch">Se déconnecter</button></form></section></main>
  }
  if (profile.role === 'client') return <ClientHome profile={profile} />

  const organizationId = profile.organization_id
  const [clients, requests, documents] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId!).eq('status', 'active'),
    supabase.from('document_requests').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId!).eq('status', 'pending'),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId!),
  ])

  return <main className="app"><aside className="sidebar"><div className="brand">Fido<span>.</span></div><nav className="nav"><Link className="active" href="/">⌂ &nbsp; Tableau de bord</Link><Link href="/clients">♙ &nbsp; Clients</Link><Link href="/documents">▣ &nbsp; Documents</Link><Link href="/requests">✓ &nbsp; À traiter</Link><Link href="/messages">✉ &nbsp; Messages</Link><Link href="/settings">⚙ &nbsp; Paramètres</Link></nav></aside><section className="main"><Header profile={profile} /><div className="grid"><Metric label="Clients actifs" value={clients.count ?? 0} /><Metric label="Demandes ouvertes" value={requests.count ?? 0} /><Metric label="Documents reçus" value={documents.count ?? 0} /><Metric label="Messages non lus" value="—" note="Bientôt disponible" /></div><section className="section card"><div className="section-header"><div><div className="section-title">Bienvenue dans Fido</div><p className="auth-copy">Votre espace cabinet est prêt. Ajoutez vos clients pour commencer à collaborer de façon sécurisée.</p></div><Link className="primary" href="/clients">Ajouter un client</Link></div></section></section></main>
}

function Header({ profile }: { profile: Profile }) {
  const initial = (profile.full_name || 'U').trim().charAt(0).toUpperCase()
  return <header className="topbar"><div><div className="eyebrow">{profile.organizations?.name}</div><h1 className="title">Tableau de bord</h1></div><div className="user"><span>{profile.full_name || 'Utilisateur'}</span><div className="avatar">{initial}</div><form action={signOut}><button className="logout" type="submit">Se déconnecter</button></form></div></header>
}

function Metric({ label, value, note = 'Données en temps réel' }: { label: string; value: number | string; note?: string }) {
  return <div className="card"><div className="kpi-label">{label}</div><div className="kpi">{value}</div><div className="trend">{note}</div></div>
}

function ClientHome({ profile }: { profile: Profile }) {
  return <main className="app"><section className="main client-main"><Header profile={profile} /><section className="card"><div className="section-title">Votre espace client</div><p className="auth-copy">Vos documents, demandes et messages apparaîtront ici. Vous n’avez accès qu’aux données de votre cabinet.</p></section></section></main>
}
