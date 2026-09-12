'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function InvitePage({ params }: { params: { token: string } }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    if (!data.session) { setError('Vérifiez votre e-mail puis revenez sur ce lien pour terminer la création du compte.'); setLoading(false); return }
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(params.token))
    const hash = Array.from(new Uint8Array(tokenHash)).map(b => b.toString(16).padStart(2, '0')).join('')
    const { error: claimError } = await supabase.rpc('claim_client_invitation', { invitation_token_hash: hash, user_name: name })
    if (claimError) setError(claimError.message)
    else { setDone(true); setTimeout(() => window.location.href = '/', 900) }
    setLoading(false)
  }

  return <main className="auth-page"><section className="auth-card"><div className="brand auth-brand">Fido<span>.</span></div><p className="eyebrow">Invitation client</p><h1>Rejoindre votre espace</h1>{done ? <p className="auth-notice">Votre compte est prêt. Redirection...</p> : <><p className="auth-copy">Créez votre accès sécurisé à l’espace de collaboration Fido.</p><form onSubmit={submit} className="auth-form"><input className="search auth-input" placeholder="Votre nom" value={name} onChange={e => setName(e.target.value)} required /><input className="search auth-input" type="email" placeholder="E-mail utilisé pour l’invitation" value={email} onChange={e => setEmail(e.target.value)} required /><input className="search auth-input" type="password" minLength={6} placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required />{error && <p className="auth-error">{error}</p>}<button className="primary auth-submit" disabled={loading}>{loading ? 'Création...' : 'Créer mon espace'}</button></form></>}</section></main>
}
