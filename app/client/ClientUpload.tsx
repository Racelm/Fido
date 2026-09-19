'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = { clientId: string; organizationId: string; requestId?: string }

export default function ClientUpload({ clientId, organizationId, requestId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function upload() {
    const file = inputRef.current?.files?.[0]
    if (!file) return
    if (file.size > 25 * 1024 * 1024) {
      setMessage('Fichier trop volumineux. Limite : 25 Mo.')
      return
    }

    setLoading(true)
    setMessage('')
    const supabase = createClient()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${organizationId}/${clientId}/${crypto.randomUUID()}-${safeName}`

    const { error: uploadError } = await supabase.storage.from('documents').upload(path, file, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })

    if (uploadError) {
      setMessage(uploadError.message)
      setLoading(false)
      return
    }

    const { error: rowError } = await supabase.from('documents').insert({
      organization_id: organizationId,
      client_id: clientId,
      request_id: requestId || null,
      name: file.name,
      storage_path: path,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id,
    })

    if (rowError) {
      await supabase.storage.from('documents').remove([path])
      setMessage(rowError.message)
    } else {
      setMessage('Document envoyé avec succès.')
      if (inputRef.current) inputRef.current.value = ''
    }
    setLoading(false)
  }

  return <div className="upload-box">
    <input ref={inputRef} className="search" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv" />
    <button className="primary" type="button" onClick={upload} disabled={loading}>{loading ? 'Envoi...' : 'Envoyer le document'}</button>
    {message && <p className={message.includes('succès') ? 'auth-notice' : 'auth-error'}>{message}</p>}
    <span className="muted">PDF, images, Word ou Excel · 25 Mo maximum</span>
  </div>
}
