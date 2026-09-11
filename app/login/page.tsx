'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [cabinet, setCabinet] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      if (signUpError) {
        setError(signUpError.message)
      } else if (data.session) {
        const { error: cabinetError } = await supabase.rpc('create_cabinet', {
          cabinet_name: cabinet,
          user_name: name,
        })
        if (cabinetError) setError(cabinetError.message)
        else router.push('/')
      } else {
        setNotice('Vérifiez votre e-mail pour confirmer votre compte, puis connectez-vous.')
        setMode('login')
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) setError(signInError.message)
      else router.push('/')
    }
    setLoading(false)
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand auth-brand">Fido<span>.</span></div>
        <p className="eyebrow">Espace sécurisé pour les fiduciaires</p>
        <h1>{mode === 'login' ? 'Connexion' : 'Créer votre cabinet'}</h1>
        <p className="auth-copy">
          {mode === 'login' ? 'Accédez à votre espace Fido.' : 'Créez le premier espace de votre cabinet.'}
        </p>

        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && <input className="search auth-input" placeholder="Votre nom" value={name} onChange={e => setName(e.target.value)} required />}
          {mode === 'signup' && <input className="search auth-input" placeholder="Nom du cabinet" value={cabinet} onChange={e => setCabinet(e.target.value)} required />}
          <input className="search auth-input" type="email" placeholder="E-mail professionnel" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="search auth-input" type="password" placeholder="Mot de passe" minLength={6} value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="auth-error">{error}</p>}
          {notice && <p className="auth-notice">{notice}</p>}
          <button className="primary auth-submit" disabled={loading}>{loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer le cabinet'}</button>
        </form>

        <button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setNotice('') }}>
          {mode === 'login' ? 'Nouveau cabinet ? Créer un compte' : 'Déjà inscrit ? Se connecter'}
        </button>
      </section>
    </main>
  )
}
