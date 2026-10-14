-- Tiwizi Phase 11 : fix « infinite recursion detected in policy for relation clients »
--
-- Bug : la policy UPDATE « client can update own record » (008) contenait une
-- sous-requête sur public.clients dans son WITH CHECK. Postgres refuse une
-- policy de clients qui relit clients → le client ne pouvait pas enregistrer
-- « Mes informations ».
--
-- Correctif : l'organisation actuelle de la ligne est lue via une fonction
-- SECURITY DEFINER (hors RLS), comme is_client_user / is_org_member.
-- Idempotent — peut être rejoué sans effet secondaire.

create or replace function public.client_organization_id(target_client uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.clients where id = target_client;
$$;

revoke all on function public.client_organization_id(uuid) from public;
grant execute on function public.client_organization_id(uuid) to authenticated;

drop policy if exists "client can update own record" on public.clients;
create policy "client can update own record" on public.clients for update
using (
  deleted_at is null
  and public.is_client_user(id)
)
with check (
  deleted_at is null
  and public.is_client_user(id)
  -- Un client ne peut PAS modifier son organization_id, ni se « transférer »
  and organization_id = public.client_organization_id(id)
);
