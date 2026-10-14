'use client'

import { FormEvent, use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { acceptInvitation, getInvitationInfo } from '@/app/actions/invite'

type Mode = 'checking' | 'invalid' | 'other-session' | 'needs-password' | 'authed-set-password' | 'done'

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [mode, setMode] = useState<Mode>('checking')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  // Adresse de l'invitation (source de vérité) et éventuelle autre session ouverte
  const [email, setEmail] = useState('')
  const [otherEmail, setOtherEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      const info = await getInvitationInfo(token)
      if (cancelled) return
      if (!info.email) {
        setError(info.error || 'Lien d’invitation invalide.')
        setMode('invalid')
        return
      }
      setEmail(info.email)

      const supabase = createClient()
      const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
      if (cancelled) return
      const current = data.user
      if (!current) {
        setMode('needs-password')
      } else if ((current.email || '').toLowerCase() === info.email.toLowerCase()) {
        // Flow invitation Supabase native : le bon compte est déjà connecté
        setMode('authed-set-password')
      } else {
        // Une autre personne (p. ex. le cabinet) est connectée dans ce navigateur :
        // ne jamais modifier ce compte-là.
        setOtherEmail(current.email || '')
        setMode('other-session')
      }
    }
    check().catch(() => {
      if (!cancelled) {
        setError('Impossible de vérifier l’invitation. Réessayez.')
        setMode('invalid')
      }
    })
    return () => {
      cancelled = true
    }
  }, [token])

  async function switchAccount() {
    setLoading(true)
    await createClient().auth.signOut()
    setOtherEmail('')
    setError('')
    setMode('needs-password')
    setLoading(false)
  }

  async function submitNewAccount(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        // Après confirmation de l'e-mail, retour sur cette invitation pour la finaliser
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/invite/${token}`)}`,
      },
    })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }
    if (!data.session) {
      setError(
        'Un e-mail de confirmation vient de vous être envoyé. Cliquez sur le lien qu’il contient pour terminer l’activation de votre espace.'
      )
      setLoading(false)
      return
    }

    const result = await acceptInvitation(token, name)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setMode('done')
    setTimeout(() => (window.location.href = '/client'), 900)
    setLoading(false)
  }

  async function submitAuthed(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    // Sécurité : ne jamais changer le mot de passe d'un autre compte que celui invité
    const { data: current } = await supabase.auth.getUser()
    if ((current.user?.email || '').toLowerCase() !== email.toLowerCase()) {
      setError('Session incorrecte. Rechargez la page.')
      setLoading(false)
      return
    }
    // Si l'utilisateur veut (re)définir un mot de passe
    if (password) {
      const { error: pwdErr } = await supabase.auth.updateUser({ password })
      if (pwdErr) {
        setError(pwdErr.message)
        setLoading(false)
        return
      }
    }

    const result = await acceptInvitation(token, name)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    setMode('done')
    setTimeout(() => (window.location.href = '/client'), 900)
    setLoading(false)
  }

  return (
    <main className="auth-page">
      <section className="auth-card" data-testid="invite-card">
        <div className="auth-brand">
          <span className="logo">F</span>Tiwizi
        </div>
        <p className="eyebrow">Invitation client</p>
        <h1>Rejoindre votre espace</h1>

        {mode === 'checking' && (
          <p className="auth-copy">Vérification de votre invitation...</p>
        )}

        {mode === 'invalid' && (
          <>
            <p className="auth-error" data-testid="invite-invalid">
              {error}
            </p>
            <a className="auth-submit" href="/login" style={{ textAlign: 'center' }}>
              Aller à la connexion
            </a>
          </>
        )}

        {mode === 'other-session' && (
          <>
            <p className="auth-copy">
              Cette invitation est destinée à <strong>{email}</strong>, mais vous êtes
              actuellement connecté avec <strong>{otherEmail}</strong> dans ce navigateur.
            </p>
            <button
              type="button"
              className="auth-submit"
              onClick={switchAccount}
              disabled={loading}
              data-testid="invite-switch"
            >
              {loading ? 'Déconnexion...' : `Se déconnecter et continuer avec ${email}`}
            </button>
          </>
        )}

        {mode === 'done' && (
          <p className="auth-notice" data-testid="invite-success">
            Votre compte est prêt. Redirection...
          </p>
        )}

        {mode === 'needs-password' && (
          <>
            <p className="auth-copy">
              Bienvenue ! Créez votre accès sécurisé à l’espace Tiwizi pour{' '}
              <strong>{email}</strong>.
            </p>
            <form onSubmit={submitNewAccount} className="auth-form" data-testid="invite-form">
              <input
                className="auth-input"
                placeholder="Votre nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="invite-name"
              />
              <input
                className="auth-input"
                type="email"
                placeholder="E-mail utilisé pour l’invitation"
                value={email}
                readOnly
                aria-readonly="true"
                style={{ opacity: 0.75 }}
                required
                data-testid="invite-email"
              />
              <input
                className="auth-input"
                type="password"
                minLength={8}
                placeholder="Mot de passe (8 caractères min.)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="invite-password"
              />
              {error && (
                <p className="auth-error" data-testid="invite-error">
                  {error}
                </p>
              )}
              <button
                className="auth-submit"
                disabled={loading}
                data-testid="invite-submit"
              >
                {loading ? 'Création...' : 'Créer mon espace'}
              </button>
            </form>
          </>
        )}

        {mode === 'authed-set-password' && (
          <>
            <p className="auth-copy">
              Bienvenue, <strong>{email}</strong> ! Votre e-mail est vérifié. Choisissez un
              mot de passe pour accéder à votre espace.
            </p>
            <form onSubmit={submitAuthed} className="auth-form" data-testid="invite-form-authed">
              <input
                className="auth-input"
                placeholder="Votre nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="invite-name"
              />
              <input
                className="auth-input"
                type="password"
                minLength={8}
                placeholder="Nouveau mot de passe (facultatif si déjà défini)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="invite-password"
              />
              {error && (
                <p className="auth-error" data-testid="invite-error">
                  {error}
                </p>
              )}
              <button
                className="auth-submit"
                disabled={loading}
                data-testid="invite-submit"
              >
                {loading ? 'Activation...' : 'Activer mon espace'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
