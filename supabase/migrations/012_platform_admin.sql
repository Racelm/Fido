-- Tiwizi Phase 12 : administration de la plateforme (super-admin)
-- Idempotent — peut être rejoué sans effet secondaire.
--
-- 1. Statut de validation des cabinets : un nouveau cabinet est « pending »
--    tant que l'administrateur ne l'a pas activé (contrat signé).
--    Les cabinets existants restent actifs.
-- 2. Champs de suivi du contrat (formule, dates, notes internes).
-- 3. Verrou au niveau base : les fonctions is_org_member / is_client_user
--    n'accordent l'accès que si le cabinet est actif (défense en profondeur,
--    en plus du blocage applicatif).
-- 4. my_access_status() : statut du cabinet de l'utilisateur connecté.
-- 5. admin_organization_stats() : statistiques par cabinet, réservées au
--    service_role (appelées uniquement côté serveur après vérification admin).

-- 1 + 2. Colonnes ----------------------------------------------------------
-- Ajout avec défaut 'active' : toutes les lignes existantes deviennent actives…
alter table public.organizations
  add column if not exists status text not null default 'active';
-- …puis les nouveaux cabinets sont « en attente » par défaut.
alter table public.organizations alter column status set default 'pending';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'organizations_status_check'
  ) then
    alter table public.organizations
      add constraint organizations_status_check
      check (status in ('pending', 'active', 'suspended'));
  end if;
end $$;

alter table public.organizations
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text,
  add column if not exists contract_plan text,
  add column if not exists contract_start date,
  add column if not exists contract_end date,
  add column if not exists admin_notes text;

create index if not exists organizations_status_idx on public.organizations(status);

-- 3. Verrou base de données -------------------------------------------------
create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.organizations o on o.id = p.organization_id
    where p.id = auth.uid()
      and p.organization_id = target_org
      and p.role in ('owner', 'staff')
      and o.status = 'active'
  );
$$;

create or replace function public.is_client_user(target_client uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.clients c
    join public.profiles p on p.id = c.profile_id
    join public.organizations o on o.id = c.organization_id
    where c.id = target_client
      and p.id = auth.uid()
      and p.role = 'client'
      and o.status = 'active'
  );
$$;

-- 4. Statut d'accès de l'utilisateur connecté --------------------------------
-- Retourne 'active' | 'pending' | 'suspended', ou NULL si aucun profil.
create or replace function public.my_access_status()
returns text language sql stable security definer set search_path = public
as $$
  select o.status
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  where p.id = auth.uid();
$$;

revoke all on function public.my_access_status() from public;
grant execute on function public.my_access_status() to authenticated;

-- 5. Statistiques par cabinet (service_role uniquement) -----------------------
create or replace function public.admin_organization_stats()
returns table (
  organization_id uuid,
  owner_count bigint,
  staff_count bigint,
  client_count bigint,
  portal_client_count bigint,
  document_count bigint,
  storage_bytes bigint,
  open_request_count bigint,
  last_activity_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id,
    (select count(*) from public.profiles p where p.organization_id = o.id and p.role = 'owner'),
    (select count(*) from public.profiles p where p.organization_id = o.id and p.role = 'staff'),
    (select count(*) from public.clients c where c.organization_id = o.id and c.deleted_at is null),
    (select count(*) from public.clients c where c.organization_id = o.id and c.deleted_at is null and c.profile_id is not null),
    (select count(*) from public.documents d where d.organization_id = o.id and d.deleted_at is null),
    (select coalesce(sum(d.size_bytes), 0)::bigint from public.documents d where d.organization_id = o.id and d.deleted_at is null),
    (select count(*) from public.document_requests r where r.organization_id = o.id and r.status = 'pending'),
    (select max(a.created_at) from public.audit_events a where a.organization_id = o.id)
  from public.organizations o;
$$;

revoke all on function public.admin_organization_stats() from public;
revoke all on function public.admin_organization_stats() from anon, authenticated;
grant execute on function public.admin_organization_stats() to service_role;
