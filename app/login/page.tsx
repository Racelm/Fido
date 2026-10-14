import { redirect } from 'next/navigation'
import Link from 'next/link'
import LoginForm from './LoginForm'
import { createClient } from '@/lib/supabase/server'

const LOGIN_MESSAGES: Record<string, string> = {
  'email-confirmed':
    'Votre e-mail est confirmé. Connectez-vous avec le mot de passe choisi pour terminer l’activation.',
  'missing-code': 'Le lien utilisé est incomplet. Réessayez depuis l’e-mail reçu.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string; signup?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile) redirect('/no-access')
    redirect(profile.role === 'client' ? '/client' : '/')
  }

  return (
    <main className="auth-page">
      <section className="auth-card" data-testid="login-card">
        <div className="auth-brand">
          <span className="logo">F</span>Tiwizi
        </div>
        <p className="eyebrow">Espace fiduciaire</p>
        <h1>Connexion cabinet</h1>
        <p className="auth-copy">
          Accédez à votre espace sécurisé pour collaborer avec vos clients.
        </p>
        {params.error && (
          <p
            className={params.error === 'email-confirmed' ? 'auth-notice' : 'auth-error'}
            data-testid="login-url-error"
          >
            {LOGIN_MESSAGES[params.error] || 'Le lien utilisé est invalide ou a expiré.'}
          </p>
        )}
        <LoginForm redirect={params.redirect || ''} />
        <p className="auth-copy" style={{ marginTop: 18 }}>
          Vous n’avez pas encore de cabinet ?{' '}
          <Link href="/signup" data-testid="link-signup">Créer un compte cabinet</Link>
        </p>
      </section>
    </main>
  )
}
