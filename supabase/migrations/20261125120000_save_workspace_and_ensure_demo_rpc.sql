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
