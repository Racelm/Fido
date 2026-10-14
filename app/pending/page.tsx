import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions/auth'

/**
 * Écran affiché aux utilisateurs dont le cabinet n'est pas (encore) actif :
 *  - pending   : demande enregistrée, contrat en cours de validation
 *  - suspended : accès suspendu par l'administrateur de la plateforme
 */
export default async function PendingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: status } = await supabase.rpc('my_access_status')
  if (status === 'active') redirect('/')
  if (!status) redirect('/no-access')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const isClient = profile?.role === 'client'
  const contact = process.env.PLATFORM_CONTACT_EMAIL || ''

  return (
    <main className="auth-page">
      <section className="auth-card" data-testid="pending-card">
        <div className="auth-brand">
          <span className="logo">T</span>Tiwizi
        </div>
        {status === 'suspended' ? (
          <>
            <p className="eyebrow">Accès suspendu</p>
            <h1>Espace temporairement indisponible</h1>
            <p className="auth-copy">
              {isClient
                ? 'L’espace de votre cabinet est momentanément indisponible. Contactez directement votre cabinet.'
                : 'L’accès à votre cabinet a été suspendu. Contactez-nous pour le réactiver.'}
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow">Demande en cours</p>
            <h1>Votre espace est en cours de validation</h1>
            <p className="auth-copy">
              {isClient
                ? 'L’espace de votre cabinet n’est pas encore ouvert. Vous serez informé dès qu’il sera disponible.'
                : 'Merci pour votre inscription ! Notre équipe vous contacte pour finaliser votre contrat. Votre cabinet sera activé dès sa signature et vous recevrez un e-mail de confirmation.'}
            </p>
          </>
        )}
        <p className="auth-copy">
          Connecté en tant que <strong>{user.email}</strong>.
        </p>
        {contact && !isClient && (
          <p className="auth-copy">
            Contact : <a href={`mailto:${contact}`}>{contact}</a>
          </p>
        )}
        <form action={signOut} style={{ marginTop: 12 }}>
          <button className="btn-secondary" style={{ width: '100%' }} data-testid="pending-logout">
            Se déconnecter
          </button>
        </form>
      </section>
    </main>
  )
}
