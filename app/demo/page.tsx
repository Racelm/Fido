'use client'

import { useState } from 'react'
import Link from 'next/link'

const clients = [
  { name: 'Atlas Distribution SARL', contact: 'Youssef Amrani', status: 'Actif', pending: 2 },
  { name: 'CasaTech Services', contact: 'Nadia El Mansouri', status: 'Actif', pending: 0 },
  { name: 'Rabat Conseil', contact: 'Omar Alaoui', status: 'Invitation', pending: 1 },
]

export default function DemoPage() {
  const [section, setSection] = useState<'dashboard' | 'clients' | 'requests' | 'documents' | 'messages'>('dashboard')
  const [uploaded, setUploaded] = useState(false)
  const nav = [['dashboard','⌂  Tableau de bord'],['clients','♙  Clients'],['documents','▣  Documents'],['requests','✓  À traiter'],['messages','✉  Messages']] as const

  return <main className="app">
    <aside className="sidebar"><div className="brand">Fido<span>.</span></div><div className="demo-badge">MODE DÉMO</div><nav className="nav">{nav.map(([id,label]) => <button key={id} className={section === id ? 'demo-nav active' : 'demo-nav'} onClick={() => setSection(id)}>{label}</button>)}</nav></aside>
    <section className="main">
      <header className="topbar"><div><div className="eyebrow">Cabinet Atlas Comptabilité</div><h1 className="title">{section === 'dashboard' ? 'Tableau de bord' : section === 'clients' ? 'Clients' : section === 'documents' ? 'Documents' : section === 'requests' ? 'À traiter' : 'Messages'}</h1><p className="muted">Environnement de démonstration — aucune donnée réelle</p></div><Link href="/login" className="secondary">Quitter la démo</Link></header>
      {section === 'dashboard' && <Dashboard uploaded={uploaded} onUpload={() => setUploaded(true)} />}
      {section === 'clients' && <Clients />}
      {section === 'documents' && <Documents uploaded={uploaded} />}
      {section === 'requests' && <Requests uploaded={uploaded} onUpload={() => setUploaded(true)} />}
      {section === 'messages' && <Messages />}
    </section>
  </main>
}

function Dashboard({ uploaded, onUpload }: { uploaded: boolean; onUpload: () => void }) {
  return <>
    <div className="grid"><Metric label="Clients actifs" value="24" /><Metric label="Demandes ouvertes" value={uploaded ? '7' : '8'} /><Metric label="Documents reçus" value={uploaded ? '156' : '155'} /><Metric label="Notifications" value="3" note="À consulter" /></div>
    <section className="content-grid section"><section className="card"><div className="section-header"><div><div className="section-title">À traiter</div><p className="muted">Les demandes qui nécessitent une action.</p></div></div>
      <div className="request-card"><div><strong>Relevé bancaire septembre 2026</strong><p className="muted">Atlas Distribution SARL</p></div><span className="status status-invited">{uploaded ? 'Reçu' : 'En attente'}</span></div>
      <div className="request-card"><div><strong>Déclaration TVA T3 2026</strong><p className="muted">Rabat Conseil</p></div><span className="status status-invited">En attente</span></div>
    </section><section className="card"><div className="section-header"><div><div className="section-title">Documents récents</div><p className="muted">Derniers fichiers reçus.</p></div></div>
      <div className="client-row"><div className="client-avatar">▣</div><div className="client-info"><strong>Facture_Fournisseur_Septembre.pdf</strong><span>Atlas Distribution SARL · aujourd'hui</span></div></div>
      <div className="client-row"><div className="client-avatar">▣</div><div className="client-info"><strong>Releve_Bancaire_Aout.pdf</strong><span>CasaTech Services · hier</span></div></div>
    </section></section>
    <section className="card section"><div className="section-header"><div><div className="section-title">Tester le workflow client</div><p className="muted">Simulez la réception d'un document sans créer de compte.</p></div><button className="primary" onClick={onUpload}>{uploaded ? 'Document reçu ✓' : 'Simuler un upload client'}</button></div></section>
  </>
}
function Clients(){return <section className="card section"><div className="section-title">Vos clients</div><p className="muted">Liste de démonstration.</p>{clients.map(c=><div className="client-row" key={c.name}><div className="client-avatar">{c.name.charAt(0)}</div><div className="client-info"><strong>{c.name}</strong><span>{c.contact} · {c.pending} demande(s) en attente</span></div><span className="status status-invited">{c.status}</span></div>)}</section>}
function Documents({uploaded}:{uploaded:boolean}){return <section className="card section"><div className="section-title">Documents</div><p className="muted">Documents reçus dans l'espace du cabinet.</p><div className="client-row"><div className="client-avatar">▣</div><div className="client-info"><strong>Facture_Fournisseur_Septembre.pdf</strong><span>Atlas Distribution SARL · 1,2 MB</span></div></div>{uploaded&&<div className="client-row"><div className="client-avatar">▣</div><div className="client-info"><strong>Releve_Bancaire_Septembre_2026.pdf</strong><span>Atlas Distribution SARL · nouveau</span></div></div>}</section>}
function Requests({uploaded,onUpload}:{uploaded:boolean;onUpload:()=>void}){return <section className="card section"><div className="section-title">Demandes de documents</div><p className="muted">Suivez les demandes envoyées aux clients.</p><div className="request-card"><div><strong>Relevé bancaire septembre 2026</strong><p className="muted">Atlas Distribution SARL</p></div><button className="secondary" onClick={onUpload}>{uploaded?'Reçu ✓':'Simuler réception'}</button></div><div className="request-card"><div><strong>Déclaration TVA T3 2026</strong><p className="muted">Rabat Conseil</p></div><span className="status status-invited">En attente</span></div></section>}
function Messages(){return <section className="card section"><div className="section-title">Messages</div><p className="muted">Conversation de démonstration.</p><div className="message-row"><strong>Youssef Amrani</strong><span>Bonjour, le relevé bancaire vient d'être envoyé. Merci.</span></div><div className="message-row"><strong>Cabinet Atlas</strong><span>Parfait, nous allons le vérifier.</span></div></section>}
function Metric({label,value,note='Données de démonstration'}:{label:string;value:string;note?:string}){return <div className="card"><div className="kpi-label">{label}</div><div className="kpi">{value}</div><div className="trend">{note}</div></div>}
