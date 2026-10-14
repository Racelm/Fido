import Link from 'next/link'
import { redirect } from 'next/navigation'
import SignupForm from './SignupForm'
import { createClient } from '@/lib/supabase/server'

export default async function SignupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/')

  return (
    <main className="auth-page">
      <section className="auth-card" data-testid="signup-card">
        <div className="auth-brand">
          <span className="logo">T</span>Tiwizi
        </div>
        <p className="eyebrow">Nouveau cabinet</p>
        <h1>Créer votre cabinet</h1>
        <p className="auth-copy">
          Demandez l’ouverture de votre espace fiduciaire. Après validation de votre contrat
          par notre équipe, votre cabinet sera activé et vous pourrez inviter vos clients.
        </p>
        <SignupForm />
        <p className="auth-copy" style={{ marginTop: 18 }}>
          Déjà un compte ? <Link href="/login" data-testid="link-login">Se connecter</Link>
        </p>
      </section>
    </main>
  )
}
