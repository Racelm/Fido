'use client'

import { useActionState } from 'react'

type Result = { ok?: boolean; error?: string }

/**
 * Formulaire d'action d'administration : demande confirmation si besoin,
 * appelle l'action serveur et affiche le résultat.
 */
export default function ActionForm({
  action,
  children,
  confirmText,
  successText,
  className,
  style,
}: {
  action: (formData: FormData) => Promise<Result>
  children: React.ReactNode
  confirmText?: string
  successText?: string
  className?: string
  style?: React.CSSProperties
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: Result, formData: FormData): Promise<Result> => {
      if (confirmText && !window.confirm(confirmText)) return prev
      try {
        return await action(formData)
      } catch {
        return { error: 'Action impossible. Rechargez la page (F5) puis réessayez.' }
      }
    },
    {}
  )

  return (
    <form action={formAction} className={className} style={style} aria-busy={pending}>
      <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, display: 'contents' }}>
        {children}
      </fieldset>
      {state.error && (
        <p className="auth-error" style={{ marginTop: 8 }}>
          {state.error}
        </p>
      )}
      {state.ok && successText && (
        <p className="auth-notice" style={{ marginTop: 8 }}>
          {successText}
        </p>
      )}
    </form>
  )
}
