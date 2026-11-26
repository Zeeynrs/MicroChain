-- MicroChain: skema workspace (8 tabel) + demo_templates, RLS per pemilik, dan RPC ensure_demo_workspace.
-- Idempoten: aman dijalankan ulang. Rollback: lihat bagian paling bawah.

-- ---------------------------------------------------------------------------
-- Template demo (publik baca-saja)
-- ---------------------------------------------------------------------------
create table if not exists public.demo_templates (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tabel workspace milik pengguna
-- ---------------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  slug text not null check (slug ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  sector text not null check (char_length(btrim(sector)) between 1 and 100),
  currency text not null default 'IDR' check (currency = 'IDR'),
  planning_cutoff_date date not null,
  scenario_date date not null,
  is_demo_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug),
  unique (id, owner_id)
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  owner_id uuid not null,
  slug text not null check (slug ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  active boolean not null default true,
  notes text not null default '' check (char_length(notes) <= 500),
  unique (business_id, slug),
  unique (id, owner_id),
  foreign key (business_id, owner_id) references public.businesses (id, owner_id) on delete cascade
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  owner_id uuid not null,
  slug text not null check (slug ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  unit_kind text not null check (unit_kind in ('mass', 'volume', 'count')),
  base_unit text not null,
  stock_on_hand integer not null check (stock_on_hand between 0 and 1000000),
  constraint materials_check check (
    (unit_kind = 'mass' and base_unit = 'g')
    or (unit_kind = 'volume' and base_unit = 'ml')
    or (unit_kind = 'count' and base_unit = 'pcs')
  ),
  unique (business_id, slug),
  unique (id, owner_id),
  foreign key (business_id, owner_id) references public.businesses (id, owner_id) on delete cascade
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  owner_id uuid not null,
  slug text not null check (slug ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  demand_units integer not null check (demand_units between 0 and 1000000),
  unit_contribution_idr integer not null check (unit_contribution_idr between 0 and 10000000),
  unique (business_id, slug),
  unique (id, owner_id),
  foreign key (business_id, owner_id) references public.businesses (id, owner_id) on delete cascade
);

create table if not exists public.bom_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  owner_id uuid not null,
  product_id uuid not null,
  material_id uuid not null,
  quantity_per_product integer not null check (quantity_per_product between 1 and 1000000),
  unique (product_id, material_id),
  foreign key (business_id, owner_id) references public.businesses (id, owner_id) on delete cascade,
  foreign key (product_id, owner_id) references public.products (id, owner_id) on delete cascade,
  foreign key (material_id, owner_id) references public.materials (id, owner_id) on delete cascade
);

create table if not exists public.committed_deliveries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  owner_id uuid not null,
  slug text not null check (slug ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  supplier_id uuid not null,
  material_id uuid not null,
  quantity_base_units integer not null check (quantity_base_units between 1 and 1000000),
  arrival_date date not null,
  enabled_in_baseline boolean not null default true,
  unique (business_id, slug),
  foreign key (business_id, owner_id) references public.businesses (id, owner_id) on delete cascade,
  foreign key (supplier_id, owner_id) references public.suppliers (id, owner_id) on delete cascade,
  foreign key (material_id, owner_id) references public.materials (id, owner_id) on delete cascade
);

create table if not exists public.alternative_offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  owner_id uuid not null,
  slug text not null check (slug ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  supplier_id uuid not null,
  material_id uuid not null,
  pack_size_base_units integer not null check (pack_size_base_units between 1 and 1000000),
  max_packs integer not null check (max_packs between 0 and 1000000),
  lead_days integer not null check (lead_days between 0 and 365),
  incremental_premium_idr_per_pack integer not null check (incremental_premium_idr_per_pack between 0 and 10000000),
  enabled_in_scenario boolean not null default true,
  unique (business_id, slug),
  foreign key (business_id, owner_id) references public.businesses (id, owner_id) on delete cascade,
  foreign key (supplier_id, owner_id) references public.suppliers (id, owner_id) on delete cascade,
  foreign key (material_id, owner_id) references public.materials (id, owner_id) on delete cascade
);

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  owner_id uuid not null,
  slug text not null check (slug ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  cutoff_date date not null,
  disabled_supplier_slugs text[] not null default '{}',
  enabled_offer_slugs text[] not null default '{}',
  disruptions jsonb not null default '[]'::jsonb,
  overrides jsonb not null default '{}'::jsonb,
  source text not null default 'demo' check (source in ('demo', 'user')),
  unique (business_id, slug),
  foreign key (business_id, owner_id) references public.businesses (id, owner_id) on delete cascade
);

create index if not exists suppliers_business_idx on public.suppliers (business_id);
create index if not exists materials_business_idx on public.materials (business_id);
create index if not exists products_business_idx on public.products (business_id);
create index if not exists bom_items_business_idx on public.bom_items (business_id);
create index if not exists bom_items_material_idx on public.bom_items (material_id);
create index if not exists committed_deliveries_business_idx on public.committed_deliveries (business_id);
create index if not exists committed_deliveries_supplier_idx on public.committed_deliveries (supplier_id);
create index if not exists committed_deliveries_material_idx on public.committed_deliveries (material_id);
create index if not exists alternative_offers_business_idx on public.alternative_offers (business_id);
create index if not exists alternative_offers_supplier_idx on public.alternative_offers (supplier_id);
create index if not exists alternative_offers_material_idx on public.alternative_offers (material_id);
create index if not exists scenarios_business_idx on public.scenarios (business_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.demo_templates enable row level security;
drop policy if exists demo_templates_public_read on public.demo_templates;
create policy demo_templates_public_read on public.demo_templates
  for select to anon, authenticated using (true);

do $$
declare
  t text;
begin
  foreach t in array array[
    'businesses', 'suppliers', 'materials', 'products', 'bom_items',
    'committed_deliveries', 'alternative_offers', 'scenarios'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated '
      'using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)',
      t || '_owner_all', t
    );
  end loop;
end
$$;

-- Hak akses eksplisit (tidak bergantung pada default grant proyek). anon tidak boleh menyentuh data pengguna.
grant select on public.demo_templates to anon, authenticated;
grant select, insert, update, delete on
  public.businesses, public.suppliers, public.materials, public.products, public.bom_items,
  public.committed_deliveries, public.alternative_offers, public.scenarios
  to authenticated;

-- ---------------------------------------------------------------------------
-- Rollback (manual):
--   drop table if exists public.scenarios, public.alternative_offers, public.committed_deliveries,
--     public.bom_items, public.products, public.materials, public.suppliers, public.businesses,
--     public.demo_templates cascade;
-- ---------------------------------------------------------------------------
