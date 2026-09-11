"use client";

import { useState } from "react";

const clients = [
  ["ABC SARL", "contact@abc.ma", "Actif", "12"],
  ["XYZ SARL", "direction@xyz.ma", "Actif", "7"],
  ["DEF SARL", "compta@def.ma", "En attente", "3"],
  ["Atlas Services", "admin@atlas.ma", "Actif", "18"],
];

const messages = [
  ["ABC SARL", "Bonjour, le relevé bancaire de juillet est disponible.", "10:42"],
  ["XYZ SARL", "Pouvez-vous confirmer la réception des factures ?", "09:18"],
  ["Atlas Services", "Merci pour votre retour.", "Hier"],
];

export default function Home() {
  const [active, setActive] = useState("Tableau de bord");
  const [search, setSearch] = useState("");
  const filtered = clients.filter(([name, email]) => `${name} ${email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Fido<span>.</span></div>
        <nav className="nav">
          {['Tableau de bord','Clients','Messages','Documents','Paramètres'].map(item => (
            <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}>
              {item === 'Tableau de bord' ? '⌂' : item === 'Clients' ? '♙' : item === 'Messages' ? '✉' : item === 'Documents' ? '▣' : '⚙'} &nbsp; {item}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">Cabinet Atlas Conseil</div>
            <h1 className="title">{active}</h1>
          </div>
          <div className="user"><span>Rachid</span><div className="avatar">R</div></div>
        </header>

        {active === 'Tableau de bord' && <Dashboard />}
        {active === 'Clients' && <section className="section card table-card"><div className="section-head"><div className="section-title">Vos clients</div><div><input className="search" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} /> <button className="primary">+ Nouveau client</button></div></div><table className="table"><thead><tr><th>Client</th><th>E-mail</th><th>Statut</th><th>Documents</th></tr></thead><tbody>{filtered.map(c=><tr key={c[0]}><td><b>{c[0]}</b></td><td>{c[1]}</td><td><span className="status">{c[2]}</span></td><td>{c[3]}</td></tr>)}</tbody></table></section>}
        {active === 'Messages' && <section className="section card"><div className="section-head"><div className="section-title">Messages récents</div><button className="primary">+ Nouveau message</button></div>{messages.map(m=><div className="message" key={m[0]}><div className="message-top"><span>{m[0]}</span><span className="eyebrow">{m[2]}</span></div><p>{m[1]}</p></div>)}</section>}
        {active === 'Documents' && <section className="section card"><div className="section-head"><div className="section-title">Documents</div><button className="primary">+ Demander un document</button></div><div className="message"><b>📄 Relevé bancaire — ABC SARL</b><p>Reçu aujourd'hui · Juillet 2026</p></div><div className="message"><b>📄 Factures fournisseurs — XYZ SARL</b><p>Reçu hier · 12 fichiers</p></div><div className="message"><b>📄 Déclaration TVA — DEF SARL</b><p>Demandé · En attente du client</p></div></section>}
        {active === 'Paramètres' && <section className="section card"><div className="section-title">Paramètres du cabinet</div><div className="message"><b>Informations du cabinet</b><p>Nom, adresse, téléphone et logo.</p></div><div className="message"><b>Utilisateurs et rôles</b><p>Gérer les collaborateurs et leurs permissions.</p></div><div className="message"><b>Notifications</b><p>Configurer les notifications et rappels.</p></div></section>}
      </main>
      <nav className="mobile-nav">{['Tableau de bord','Clients','Messages','Documents'].map(item=><button key={item} onClick={()=>setActive(item)}>{item}</button>)}</nav>
    </div>
  );
}

function Dashboard() {
  return <>
    <div className="grid">
      <div className="card"><div className="kpi-label">Clients actifs</div><div className="kpi">24</div><div className="trend">↑ 3 ce mois</div></div>
      <div className="card"><div className="kpi-label">Messages non lus</div><div className="kpi">8</div><div className="trend">À traiter</div></div>
      <div className="card"><div className="kpi-label">Documents reçus</div><div className="kpi">37</div><div className="trend">↑ 12 cette semaine</div></div>
      <div className="card"><div className="kpi-label">Demandes ouvertes</div><div className="kpi">11</div><div className="trend">5 urgentes</div></div>
    </div>
    <div className="content section">
      <section className="card"><div className="section-head"><div className="section-title">Dernières activités</div><button className="primary">Voir tout</button></div>{messages.map(m=><div className="message" key={m[0]}><div className="message-top"><span>{m[0]}</span><span className="eyebrow">{m[2]}</span></div><p>{m[1]}</p></div>)}</section>
      <section className="card"><div className="section-title">À faire</div><div className="message"><b>5 documents en attente</b><p>Relancer les clients concernés.</p></div><div className="message"><b>3 messages non lus</b><p>Répondre aujourd'hui.</p></div><div className="message"><b>3 demandes à vérifier</b><p>Contrôler les documents reçus.</p></div></section>
    </div>
  </>;
}
