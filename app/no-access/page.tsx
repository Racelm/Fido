import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import {
  claimPendingInvitation,
  findPendingInvitationForCurrentUser,
} from '@/app/actions/invite'

/**
 * Page d'accueil des comptes connectés qui ne sont rattachés à aucun espace
 * (ni cabinet, ni client). Évite la boucle de redirection / ↔ /login et
 * permet de finaliser une invitation en attente.
 */
export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile) redirect(profile.role === 'client' ? '/client' : '/')

  const pending = await findPendingInvitationForCurrentUser()

  return (
    <main className="auth-page">
      <section className="auth-card" data-testid="no-access-card">
        <div className="auth-brand">
          <span className="logo">T</span>Tiwizi
        </div>
        <p className="eyebrow">Votre compte</p>
        <h1>{pending ? 'Finaliser votre accès' : 'Aucun espace associé'}</h1>
        <p className="auth-copy">
          Connecté en tant que <strong>{user.email}</strong>.
        </p>

        {params.error && params.error !== 'none' && (
          <p className="auth-error" data-testid="no-access-error">
            {params.error}
          </p>
        )}

        {pending ? (
          <form action={claimPendingInvitation} className="auth-form" data-testid="no-access-claim">
            <p className="auth-copy">
              <strong>{pending.cabinetName}</strong> vous a invité à rejoindre son espace
              {pending.clientCompany ? (
                <>
                  {' '}pour <strong>{pending.clientCompany}</strong>
                </>
              ) : null}
              .
            </p>
            <input className="auth-input" name="name" placeholder="Votre nom (facultatif)" />
            <input
              className="auth-input"
              name="password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              placeholder="Choisissez un mot de passe (8 caractères min.)"
              data-testid="no-access-password"
            />
            <input
              className="auth-input"
              name="password_confirm"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              placeholder="Confirmez le mot de passe"
              data-testid="no-access-password-confirm"
            />
            <button className="auth-submit" data-testid="no-access-claim-submit">
              Activer mon espace
            </button>
          </form>
        ) : (
          <p className="auth-copy">
            Ce compte n’est rattaché à aucun cabinet. Si vous avez reçu une invitation,
            ouvrez le lien de l’e-mail d’invitation. Sinon, contactez votre cabinet.
          </p>
        )}

        <form action={signOut} style={{ marginTop: 12 }}>
          <button className="btn-secondary" style={{ width: '100%' }} data-testid="no-access-logout">
            Se déconnecter
          </button>
        </form>
      </section>
    </main>
  )
}
