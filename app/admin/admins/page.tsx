import Link from 'next/link'
import { adminDb, formatDate, listAllAuthUsers, requireRootAdmin } from '@/lib/admin'
import { platformAdminEmails } from '@/lib/platform-admin'
import { addPlatformAdmin, removePlatformAdmin } from '@/app/actions/admin'
import ActionForm from '@/components/admin/ActionForm'

/**
 * Gestion des administrateurs — accessible UNIQUEMENT aux propriétaires de la
 * plateforme (PLATFORM_ADMIN_EMAILS). Les administrateurs ajoutés ne peuvent
 * ni voir cette page ni nommer d'autres administrateurs.
 */
export default async function AdminAdminsPage() {
  await requireRootAdmin()

  const [users, { data: rows }] = await Promise.all([
    listAllAuthUsers().catch(() => []),
    adminDb().from('platform_admins').select('user_id, email, added_by, created_at').order('created_at'),
  ])
  const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u] as const))
  const userById = new Map(users.map((u) => [u.id, u] as const))
  const roots = platformAdminEmails()

  return (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">
            <Link href="/admin">Administration</Link> · Administrateurs
          </div>
          <h1>Administrateurs</h1>
          <p className="welcome">
            Seules les personnes listées ici accèdent à l’administration de Tiwizi.
          </p>
        </div>
        <div />
        <div />
      </header>

      <section className="card">
        <div className="section-head">
          <div>
            <h2 className="section-title">Propriétaires de la plateforme</h2>
            <p className="section-sub">
              Définis sur le serveur (variable PLATFORM_ADMIN_EMAILS chez l’hébergeur) — non
              modifiables depuis l’application. Eux seuls peuvent nommer des administrateurs.
            </p>
          </div>
        </div>
        <table className="audit-table" data-testid="admin-roots">
          <thead>
            <tr>
              <th>E-mail</th>
              <th>Compte</th>
              <th>Dernière connexion</th>
            </tr>
          </thead>
          <tbody>
            {roots.map((email) => {
              const u = userByEmail.get(email)
              return (
                <tr key={email}>
                  <td>
                    {email} <span className="pill pill-violet">Propriétaire</span>
                  </td>
                  <td>
                    {!u ? (
                      <span className="pill pill-gray">Aucun compte</span>
                    ) : u.confirmed ? (
                      <span className="pill pill-green">Actif</span>
                    ) : (
                      <span className="pill pill-orange">E-mail non confirmé (accès refusé)</span>
                    )}
                  </td>
                  <td>{formatDate(u?.lastSignInAt, true)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-head">
          <div>
            <h2 className="section-title">Administrateurs ajoutés</h2>
            <p className="section-sub">
              Ils gèrent les cabinets et les utilisateurs, mais ne peuvent pas nommer d’autres
              administrateurs.
            </p>
          </div>
        </div>
        {rows?.length ? (
          <table className="audit-table" data-testid="admin-added">
            <thead>
              <tr>
                <th>E-mail</th>
                <th>Ajouté par</th>
                <th>Ajouté le</th>
                <th>Dernière connexion</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id as string}>
                  <td>{r.email as string}</td>
                  <td>{r.added_by as string}</td>
                  <td>{formatDate(r.created_at as string)}</td>
                  <td>{formatDate(userById.get(r.user_id as string)?.lastSignInAt, true)}</td>
                  <td>
                    <ActionForm
                      action={removePlatformAdmin}
                      confirmText={`Retirer les droits d’administrateur de ${r.email} ?`}
                    >
                      <input type="hidden" name="user_id" value={r.user_id as string} />
                      <button className="btn-ghost" type="submit">
                        Retirer
                      </button>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state" style={{ padding: 22 }}>
            Aucun administrateur ajouté. Vous êtes seul à gérer la plateforme.
          </p>
        )}
      </section>

      <section className="card card-padded" style={{ marginTop: 16, maxWidth: 560 }}>
        <h2 className="section-title">Ajouter un administrateur</h2>
        <p className="section-sub">
          La personne doit déjà avoir un compte Tiwizi avec une adresse e-mail confirmée.
        </p>
        <ActionForm
          action={addPlatformAdmin}
          confirmText="Donner l’accès complet à l’administration à cette personne ?"
          successText="Administrateur ajouté."
          style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}
        >
          <input
            className="search auth-input"
            type="email"
            name="email"
            required
            placeholder="e-mail du compte"
            style={{ flex: 1, minWidth: 220 }}
            data-testid="admin-add-email"
          />
          <button className="btn-primary" type="submit" data-testid="admin-add-submit">
            Ajouter
          </button>
        </ActionForm>
      </section>
    </>
  )
}
