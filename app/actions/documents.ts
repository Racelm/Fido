'use server'

import { createClient } from '@/lib/supabase/server'

export async function getDocumentDownloadUrl(documentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée.' }

  const { data: profile } = await supabase.from('profiles').select('organization_id,role').eq('id', user.id).single()
  const { data: document } = await supabase.from('documents').select('id,storage_path,organization_id,client_id').eq('id', documentId).single()
  if (!profile || !document) return { error: 'Document introuvable.' }

  const allowed = ['owner','staff'].includes(profile.role)
    ? profile.organization_id === document.organization_id
    : (await supabase.from('clients').select('profile_id').eq('id', document.client_id).single()).data?.profile_id === user.id

  if (!allowed) return { error: 'Accès refusé.' }

  const { data, error } = await supabase.storage.from('documents').createSignedUrl(document.storage_path, 60 * 10)
  if (error) return { error: error.message }
  return { url: data.signedUrl }
}
