-- Tiwizi Phase 13 : administrateurs de la plateforme ajoutés par le propriétaire
-- Idempotent — peut être rejoué sans effet secondaire.
--
-- Deux niveaux :
--   * Propriétaire(s) de la plateforme : définis UNIQUEMENT par la variable
--     serveur PLATFORM_ADMIN_EMAILS (jamais modifiable depuis l'application).
--   * Administrateurs ajoutés : lignes de cette table, créées/supprimées
--     exclusivement par un propriétaire via /admin/admins (service_role).
--
-- Aucun utilisateur ne peut lire ni écrire cette table (RLS sans policy) ;
-- seule la fonction is_platform_admin() renseigne l'utilisateur connecté sur
-- son PROPRE statut.

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  added_by text not null,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;
