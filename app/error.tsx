'use client'

import { useEffect } from 'react'

/**
 * Écran d'erreur générique (remplace « Application error: a client-side
 * exception… »). Cas le plus fréquent : la page était ouverte pendant une
 * nouvelle mise en ligne → un simple rechargement suffit.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[app] erreur affichée à l’utilisateur :', error)
  }, [error])

  return (
    <main className="auth-page">
      <section className="auth-card" data-testid="app-error">
        <div className="auth-brand">
          <span className="logo">F</span>Tiwizi
        </div>
        <h1>Un problème est survenu</h1>
        <p className="auth-copy">
          La page n’a pas pu s’afficher correctement. Si l’application vient d’être mise à
          jour, un simple rechargement suffit.
        </p>
        {error.digest && (
          <p className="muted" style={{ fontSize: 12 }}>
            Référence : {error.digest}
          </p>
        )}
        <button
          type="button"
          className="auth-submit"
          onClick={() => window.location.reload()}
          data-testid="app-error-reload"
        >
          Recharger la page
        </button>
        <button
          type="button"
          className="btn-secondary"
          style={{ width: '100%', marginTop: 8 }}
          onClick={() => reset()}
        >
          Réessayer
        </button>
      </section>
    </main>
  )
}
