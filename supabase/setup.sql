-- MicroChain: setup lengkap database. Tempel seluruh isi berkas ini di Supabase Dashboard > SQL Editor lalu Run.
-- Idempoten: aman dijalankan ulang.

-- ===== 20261125110000_microchain_schema.sql =====
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

-- ===== 20261125115000_seed_demo_template.sql =====
-- Seed template demo Dapur Sari (dibangkitkan dari lib/domain/fixture.ts oleh scripts/gen-seed-migration.mts).
insert into public.demo_templates (id, payload, updated_at)
values ('dapur_sari', $json${
  "demo_data": true,
  "snapshot": {
    "business": {
      "id": "dapur_sari",
      "name": "Dapur Sari",
      "sector": "Toko roti dan kue",
      "currency": "IDR",
      "planning_cutoff_date": "2026-11-24",
      "scenario_date": "2026-11-23"
    },
    "suppliers": [
      {
        "id": "supplier_a",
        "name": "Pemasok A",
        "active": true,
        "notes": "Pemasok utama tepung terigu."
      },
      {
        "id": "supplier_b",
        "name": "Pemasok B",
        "active": true,
        "notes": "Pemasok cadangan tepung terigu."
      }
    ],
    "materials": [
      {
        "id": "flour",
        "name": "Tepung terigu",
        "unit_kind": "mass",
        "base_unit": "g",
        "stock_on_hand": 8000
      },
      {
        "id": "sugar",
        "name": "Gula pasir",
        "unit_kind": "mass",
        "base_unit": "g",
        "stock_on_hand": 10000
      },
      {
        "id": "butter",
        "name": "Mentega",
        "unit_kind": "mass",
        "base_unit": "g",
        "stock_on_hand": 6000
      }
    ],
    "products": [
      {
        "id": "bread",
        "name": "Roti",
        "demand_units": 100,
        "unit_contribution_idr": 3000
      },
      {
        "id": "cookies",
        "name": "Kue kering",
        "demand_units": 30,
        "unit_contribution_idr": 5000
      }
    ],
    "bom": [
      {
        "product_id": "bread",
        "material_id": "flour",
        "quantity_per_product": 250
      },
      {
        "product_id": "bread",
        "material_id": "sugar",
        "quantity_per_product": 20
      },
      {
        "product_id": "bread",
        "material_id": "butter",
        "quantity_per_product": 10
      },
      {
        "product_id": "cookies",
        "material_id": "flour",
        "quantity_per_product": 100
      },
      {
        "product_id": "cookies",
        "material_id": "sugar",
        "quantity_per_product": 50
      },
      {
        "product_id": "cookies",
        "material_id": "butter",
        "quantity_per_product": 40
      }
    ],
    "committed_deliveries": [
      {
        "id": "supplier_a_flour_delivery",
        "supplier_id": "supplier_a",
        "material_id": "flour",
        "quantity_base_units": 25000,
        "arrival_date": "2026-11-23",
        "enabled_in_baseline": true
      }
    ],
    "alternative_offers": [
      {
        "id": "supplier_b_flour_offer",
        "supplier_id": "supplier_b",
        "material_id": "flour",
        "pack_size_base_units": 1000,
        "max_packs": 12,
        "lead_days": 1,
        "incremental_premium_idr_per_pack": 1000,
        "enabled_in_scenario": true
      }
    ],
    "scenario_date": "2026-11-23",
    "demo_data": true
  },
  "scenarios": [
    {
      "id": "baseline",
      "name": "Normal",
      "cutoff_date": "2026-11-24",
      "disabled_supplier_ids": [],
      "enabled_offer_ids": [],
      "disruptions": [],
      "overrides": {},
      "source": "demo"
    },
    {
      "id": "outage",
      "name": "Pemasok Utama Gagal",
      "cutoff_date": "2026-11-24",
      "disabled_supplier_ids": [
        "supplier_a"
      ],
      "enabled_offer_ids": [],
      "disruptions": [],
      "overrides": {},
      "source": "demo"
    },
    {
      "id": "mitigation",
      "name": "Mitigasi: Pemasok Alternatif Aktif",
      "cutoff_date": "2026-11-24",
      "disabled_supplier_ids": [
        "supplier_a"
      ],
      "enabled_offer_ids": [
        "supplier_b_flour_offer"
      ],
      "disruptions": [],
      "overrides": {},
      "source": "demo"
    }
  ]
}$json$::jsonb, now())
on conflict (id) do update set payload = excluded.payload, updated_at = now();

-- ===== 20261125120000_save_workspace_and_ensure_demo_rpc.sql =====
-- MicroChain: RPC atomik untuk menyimpan workspace dan menginisialisasi/reset salinan Dapur Sari.
-- Keduanya SECURITY INVOKER: seluruh akses tetap tunduk pada RLS pengguna (tanpa service_role).
-- Rollback:
--   drop function if exists public.ensure_demo_workspace(boolean);
--   drop function if exists public.save_workspace_snapshot(uuid, jsonb);

create or replace function public.save_workspace_snapshot(p_business_id uuid, p_payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_snap jsonb := p_payload -> 'snapshot';
  v_biz jsonb := p_payload -> 'snapshot' -> 'business';
  v_scen jsonb := p_payload -> 'scenarios';
  v_count integer;
  v_expected integer;
begin
  if v_uid is null then
    raise exception 'Sesi tidak valid. Silakan masuk kembali.' using errcode = '28000';
  end if;

  perform 1 from public.businesses where id = p_business_id and owner_id = v_uid for update;
  if not found then
    raise exception 'Workspace tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_snap is null or v_biz is null or v_scen is null or jsonb_typeof(v_scen) <> 'array' then
    raise exception 'Payload workspace tidak lengkap.' using errcode = '22023';
  end if;

  if (
    select count(distinct e ->> 'id')
    from jsonb_array_elements(v_scen) e
    where e ->> 'id' in ('baseline', 'outage', 'mitigation')
  ) <> 3 then
    raise exception 'Skenario inti baseline, outage, dan mitigation wajib ada.' using errcode = '22023';
  end if;

  update public.businesses
     set name = v_biz ->> 'name',
         sector = v_biz ->> 'sector',
         planning_cutoff_date = (v_biz ->> 'planning_cutoff_date')::date,
         scenario_date = (v_snap ->> 'scenario_date')::date,
         updated_at = now()
   where id = p_business_id and owner_id = v_uid;

  -- 1) Hapus baris yang tidak ada lagi di payload (anak dulu; FK ON DELETE CASCADE menangani sisanya).
  delete from public.bom_items where business_id = p_business_id and owner_id = v_uid;

  delete from public.scenarios
   where business_id = p_business_id and owner_id = v_uid
     and slug <> all (coalesce((select array_agg(e ->> 'id') from jsonb_array_elements(v_scen) e), '{}'));
  delete from public.committed_deliveries
   where business_id = p_business_id and owner_id = v_uid
     and slug <> all (coalesce((select array_agg(e ->> 'id') from jsonb_array_elements(coalesce(v_snap -> 'committed_deliveries', '[]')) e), '{}'));
  delete from public.alternative_offers
   where business_id = p_business_id and owner_id = v_uid
     and slug <> all (coalesce((select array_agg(e ->> 'id') from jsonb_array_elements(coalesce(v_snap -> 'alternative_offers', '[]')) e), '{}'));
  delete from public.products
   where business_id = p_business_id and owner_id = v_uid
     and slug <> all (coalesce((select array_agg(e ->> 'id') from jsonb_array_elements(coalesce(v_snap -> 'products', '[]')) e), '{}'));
  delete from public.materials
   where business_id = p_business_id and owner_id = v_uid
     and slug <> all (coalesce((select array_agg(e ->> 'id') from jsonb_array_elements(coalesce(v_snap -> 'materials', '[]')) e), '{}'));
  delete from public.suppliers
   where business_id = p_business_id and owner_id = v_uid
     and slug <> all (coalesce((select array_agg(e ->> 'id') from jsonb_array_elements(coalesce(v_snap -> 'suppliers', '[]')) e), '{}'));

  -- 2) Upsert entitas induk.
  insert into public.suppliers (business_id, owner_id, slug, name, active, notes)
  select p_business_id, v_uid, e ->> 'id', e ->> 'name',
         coalesce((e ->> 'active')::boolean, true), coalesce(e ->> 'notes', '')
    from jsonb_array_elements(coalesce(v_snap -> 'suppliers', '[]')) e
  on conflict (business_id, slug) do update
    set name = excluded.name, active = excluded.active, notes = excluded.notes;

  insert into public.materials (business_id, owner_id, slug, name, unit_kind, base_unit, stock_on_hand)
  select p_business_id, v_uid, e ->> 'id', e ->> 'name', e ->> 'unit_kind', e ->> 'base_unit',
         (e ->> 'stock_on_hand')::integer
    from jsonb_array_elements(coalesce(v_snap -> 'materials', '[]')) e
  on conflict (business_id, slug) do update
    set name = excluded.name, unit_kind = excluded.unit_kind, base_unit = excluded.base_unit,
        stock_on_hand = excluded.stock_on_hand;

  insert into public.products (business_id, owner_id, slug, name, demand_units, unit_contribution_idr)
  select p_business_id, v_uid, e ->> 'id', e ->> 'name', (e ->> 'demand_units')::integer,
         (e ->> 'unit_contribution_idr')::integer
    from jsonb_array_elements(coalesce(v_snap -> 'products', '[]')) e
  on conflict (business_id, slug) do update
    set name = excluded.name, demand_units = excluded.demand_units,
        unit_contribution_idr = excluded.unit_contribution_idr;

  -- 3) Entitas anak (referensi slug dipetakan ke UUID; referensi menggantung ditolak).
  insert into public.bom_items (business_id, owner_id, product_id, material_id, quantity_per_product)
  select p_business_id, v_uid, p.id, m.id, (e ->> 'quantity_per_product')::integer
    from jsonb_array_elements(coalesce(v_snap -> 'bom', '[]')) e
    join public.products p on p.business_id = p_business_id and p.slug = e ->> 'product_id'
    join public.materials m on m.business_id = p_business_id and m.slug = e ->> 'material_id';
  get diagnostics v_count = row_count;
  v_expected := jsonb_array_length(coalesce(v_snap -> 'bom', '[]'));
  if v_count <> v_expected then
    raise exception 'Resep (BOM) merujuk produk atau bahan yang tidak ada.' using errcode = '23503';
  end if;

  insert into public.committed_deliveries
    (business_id, owner_id, slug, supplier_id, material_id, quantity_base_units, arrival_date, enabled_in_baseline)
  select p_business_id, v_uid, e ->> 'id', s.id, m.id, (e ->> 'quantity_base_units')::integer,
         (e ->> 'arrival_date')::date, coalesce((e ->> 'enabled_in_baseline')::boolean, true)
    from jsonb_array_elements(coalesce(v_snap -> 'committed_deliveries', '[]')) e
    join public.suppliers s on s.business_id = p_business_id and s.slug = e ->> 'supplier_id'
    join public.materials m on m.business_id = p_business_id and m.slug = e ->> 'material_id'
  on conflict (business_id, slug) do update
    set supplier_id = excluded.supplier_id, material_id = excluded.material_id,
        quantity_base_units = excluded.quantity_base_units, arrival_date = excluded.arrival_date,
        enabled_in_baseline = excluded.enabled_in_baseline;
  get diagnostics v_count = row_count;
  v_expected := jsonb_array_length(coalesce(v_snap -> 'committed_deliveries', '[]'));
  if v_count <> v_expected then
    raise exception 'Pengiriman terjadwal merujuk pemasok atau bahan yang tidak ada.' using errcode = '23503';
  end if;

  insert into public.alternative_offers
    (business_id, owner_id, slug, supplier_id, material_id, pack_size_base_units, max_packs, lead_days,
     incremental_premium_idr_per_pack, enabled_in_scenario)
  select p_business_id, v_uid, e ->> 'id', s.id, m.id, (e ->> 'pack_size_base_units')::integer,
         (e ->> 'max_packs')::integer, (e ->> 'lead_days')::integer,
         (e ->> 'incremental_premium_idr_per_pack')::integer,
         coalesce((e ->> 'enabled_in_scenario')::boolean, true)
    from jsonb_array_elements(coalesce(v_snap -> 'alternative_offers', '[]')) e
    join public.suppliers s on s.business_id = p_business_id and s.slug = e ->> 'supplier_id'
    join public.materials m on m.business_id = p_business_id and m.slug = e ->> 'material_id'
  on conflict (business_id, slug) do update
    set supplier_id = excluded.supplier_id, material_id = excluded.material_id,
        pack_size_base_units = excluded.pack_size_base_units, max_packs = excluded.max_packs,
        lead_days = excluded.lead_days,
        incremental_premium_idr_per_pack = excluded.incremental_premium_idr_per_pack,
        enabled_in_scenario = excluded.enabled_in_scenario;
  get diagnostics v_count = row_count;
  v_expected := jsonb_array_length(coalesce(v_snap -> 'alternative_offers', '[]'));
  if v_count <> v_expected then
    raise exception 'Penawaran alternatif merujuk pemasok atau bahan yang tidak ada.' using errcode = '23503';
  end if;

  insert into public.scenarios
    (business_id, owner_id, slug, name, cutoff_date, disabled_supplier_slugs, enabled_offer_slugs,
     disruptions, overrides, source)
  select p_business_id, v_uid, e ->> 'id', e ->> 'name', (e ->> 'cutoff_date')::date,
         coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(e -> 'disabled_supplier_ids', '[]')) x), '{}'),
         coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(e -> 'enabled_offer_ids', '[]')) x), '{}'),
         coalesce(e -> 'disruptions', '[]'::jsonb), coalesce(e -> 'overrides', '{}'::jsonb),
         coalesce(e ->> 'source', 'user')
    from jsonb_array_elements(v_scen) e
  on conflict (business_id, slug) do update
    set name = excluded.name, cutoff_date = excluded.cutoff_date,
        disabled_supplier_slugs = excluded.disabled_supplier_slugs,
        enabled_offer_slugs = excluded.enabled_offer_slugs,
        disruptions = excluded.disruptions, overrides = excluded.overrides, source = excluded.source;
end;
$$;

create or replace function public.ensure_demo_workspace(p_reset boolean default false)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_payload jsonb;
  v_biz jsonb;
begin
  if v_uid is null then
    raise exception 'Sesi tidak valid. Silakan masuk kembali.' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  select id into v_id from public.businesses where owner_id = v_uid and slug = 'dapur_sari';
  if v_id is not null and not coalesce(p_reset, false) then
    return v_id;
  end if;

  select payload into v_payload from public.demo_templates where id = 'dapur_sari';
  if v_payload is null then
    raise exception 'Template demo Dapur Sari tidak ditemukan.' using errcode = 'P0002';
  end if;
  v_biz := v_payload -> 'snapshot' -> 'business';

  if v_id is not null then
    delete from public.businesses where id = v_id and owner_id = v_uid; -- cascade ke seluruh tabel anak
  end if;

  insert into public.businesses
    (owner_id, slug, name, sector, currency, planning_cutoff_date, scenario_date, is_demo_template)
  values
    (v_uid, 'dapur_sari', v_biz ->> 'name', v_biz ->> 'sector', 'IDR',
     (v_biz ->> 'planning_cutoff_date')::date, (v_biz ->> 'scenario_date')::date, false)
  returning id into v_id;

  perform public.save_workspace_snapshot(
    v_id,
    jsonb_build_object('snapshot', v_payload -> 'snapshot', 'scenarios', v_payload -> 'scenarios')
  );
  return v_id;
end;
$$;

revoke execute on function public.save_workspace_snapshot(uuid, jsonb) from public, anon;
revoke execute on function public.ensure_demo_workspace(boolean) from public, anon;
grant execute on function public.save_workspace_snapshot(uuid, jsonb) to authenticated;
grant execute on function public.ensure_demo_workspace(boolean) to authenticated;

-- ===== 20261125130000_cleanup_legacy_auth_trigger.sql =====
-- Magic Link: hapus trigger/fungsi warisan non-MicroChain yang menyisipkan ke public.business_profiles
-- (tabel itu tidak ada, sehingga pendaftaran pengguna baru bisa gagal). No-op bila tidak ada.
-- Tidak dianjurkan dikembalikan, jadi tidak ada langkah rollback.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- ===== 20261125140000_empty_workspace_for_new_users.sql =====
-- Pengguna login memulai dari workspace KOSONG milik sendiri (bukan salinan Dapur Sari).
-- Data Dapur Sari tetap hanya untuk mode tamu lewat tabel demo_templates.
--
-- Workspace kosong tetap berisi 3 skenario inti (baseline, outage, mitigation) karena aplikasi mewajibkannya.
-- Rollback (manual):
--   drop function if exists public.ensure_workspace(boolean);

create or replace function public.ensure_workspace(p_reset boolean default false)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_today date := current_date;
  v_cutoff date := current_date + 1;
  v_payload jsonb;
begin
  if v_uid is null then
    raise exception 'Sesi tidak valid. Silakan masuk kembali.' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  select id into v_id from public.businesses where owner_id = v_uid and slug = 'usaha';
  if v_id is not null and not coalesce(p_reset, false) then
    return v_id;
  end if;

  if v_id is not null then
    delete from public.businesses where id = v_id and owner_id = v_uid; -- cascade ke seluruh tabel anak
  end if;

  insert into public.businesses
    (owner_id, slug, name, sector, currency, planning_cutoff_date, scenario_date, is_demo_template)
  values
    (v_uid, 'usaha', 'Usaha Saya', 'Isi sektor usaha Anda', 'IDR', v_cutoff, v_today, false)
  returning id into v_id;

  v_payload := jsonb_build_object(
    'snapshot', jsonb_build_object(
      'business', jsonb_build_object(
        'name', 'Usaha Saya',
        'sector', 'Isi sektor usaha Anda',
        'planning_cutoff_date', v_cutoff,
        'scenario_date', v_today
      ),
      'scenario_date', v_today,
      'suppliers', '[]'::jsonb,
      'materials', '[]'::jsonb,
      'products', '[]'::jsonb,
      'bom', '[]'::jsonb,
      'committed_deliveries', '[]'::jsonb,
      'alternative_offers', '[]'::jsonb
    ),
    'scenarios', jsonb_build_array(
      jsonb_build_object('id', 'baseline', 'name', 'Normal', 'cutoff_date', v_cutoff, 'source', 'user',
        'disabled_supplier_ids', '[]'::jsonb, 'enabled_offer_ids', '[]'::jsonb, 'disruptions', '[]'::jsonb, 'overrides', '{}'::jsonb),
      jsonb_build_object('id', 'outage', 'name', 'Pemasok Utama Gagal', 'cutoff_date', v_cutoff, 'source', 'user',
        'disabled_supplier_ids', '[]'::jsonb, 'enabled_offer_ids', '[]'::jsonb, 'disruptions', '[]'::jsonb, 'overrides', '{}'::jsonb),
      jsonb_build_object('id', 'mitigation', 'name', 'Mitigasi: Pemasok Alternatif Aktif', 'cutoff_date', v_cutoff, 'source', 'user',
        'disabled_supplier_ids', '[]'::jsonb, 'enabled_offer_ids', '[]'::jsonb, 'disruptions', '[]'::jsonb, 'overrides', '{}'::jsonb)
    )
  );

  perform public.save_workspace_snapshot(v_id, v_payload);
  return v_id;
end;
$$;

revoke execute on function public.ensure_workspace(boolean) from public, anon;
grant execute on function public.ensure_workspace(boolean) to authenticated;

-- Fungsi lama yang mengkloning Dapur Sari ke akun pengguna tidak dipakai lagi.
drop function if exists public.ensure_demo_workspace(boolean);
