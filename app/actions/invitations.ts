'use server'

import { createHash, randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createClientInvitation(clientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée. Veuillez vous reconnecter.' }

  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single()
  if (!profile?.organization_id || !['owner', 'staff'].includes(profile.role)) return { error: 'Accès refusé.' }

  const { data: client } = await supabase.from('clients').select('id, organization_id, email').eq('id', clientId).eq('organization_id', profile.organization_id).single()
  if (!client) return { error: 'Client introuvable.' }
  if (!client.email) return { error: 'Ajoutez une adresse e-mail au client avant de créer une invitation.' }

  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')

  const { error } = await supabase.from('client_invitations').insert({ client_id: client.id, email: client.email, token_hash: tokenHash })
  if (error) return { error: error.message }

  revalidatePath(`/clients/${client.id}`)
  return { success: true, token: rawToken }
}
