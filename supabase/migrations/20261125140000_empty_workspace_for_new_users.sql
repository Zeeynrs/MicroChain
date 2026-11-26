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
