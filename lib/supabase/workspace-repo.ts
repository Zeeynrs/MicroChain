import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AlternativeOffer,
  CommittedDelivery,
  Material,
  Product,
  ScenarioConfig,
  Supplier,
  WorkspaceData,
} from "@/lib/domain/types";
import { validateWorkspaceData } from "@/lib/domain/validation";

/**
 * Repositori workspace. Seluruh akses memakai JWT pengguna dan tunduk pada RLS Postgres;
 * `service_role` tidak pernah dipakai. Pesan galat selalu Bahasa Indonesia dan tidak membocorkan internal DB.
 */

export class WorkspaceRepoError extends Error {
  readonly status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "WorkspaceRepoError";
    this.status = status;
  }
}

/* --------------------------- Baris relasional Postgres -------------------------- */

export interface WorkspaceRows {
  business: {
    id: string;
    slug: string;
    name: string;
    sector: string;
    currency: string;
    planning_cutoff_date: string;
    scenario_date: string;
    created_at?: string;
  };
  suppliers: { id: string; slug: string; name: string; active: boolean; notes: string }[];
  materials: { id: string; slug: string; name: string; unit_kind: Material["unit_kind"]; base_unit: Material["base_unit"]; stock_on_hand: number }[];
  products: { id: string; slug: string; name: string; demand_units: number; unit_contribution_idr: number }[];
  bom_items: { product_id: string; material_id: string; quantity_per_product: number }[];
  committed_deliveries: {
    id: string; slug: string; supplier_id: string; material_id: string;
    quantity_base_units: number; arrival_date: string; enabled_in_baseline: boolean;
  }[];
  alternative_offers: {
    id: string; slug: string; supplier_id: string; material_id: string; pack_size_base_units: number;
    max_packs: number; lead_days: number; incremental_premium_idr_per_pack: number; enabled_in_scenario: boolean;
  }[];
  scenarios: {
    id: string; slug: string; name: string; cutoff_date: string; disabled_supplier_slugs: string[];
    enabled_offer_slugs: string[]; disruptions: ScenarioConfig["disruptions"];
    overrides: ScenarioConfig["overrides"]; source: ScenarioConfig["source"];
  }[];
}

const bySlug = <T extends { slug: string }>(rows: T[]) => [...rows].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

/** Ubah baris relasional (UUID) menjadi `WorkspaceData` kanonik (slug). */
export function rowsToWorkspaceData(rows: WorkspaceRows): WorkspaceData {
  const slugOf = (table: string, rowsOfTable: { id: string; slug: string }[]) => {
    const map = new Map(rowsOfTable.map((r) => [r.id, r.slug]));
    return (uuid: string): string => {
      const slug = map.get(uuid);
      if (!slug) throw new WorkspaceRepoError(`Data workspace tidak konsisten: referensi ${table} tidak ditemukan.`, 500);
      return slug;
    };
  };
  const supplierSlug = slugOf("pemasok", rows.suppliers);
  const materialSlug = slugOf("bahan", rows.materials);
  const productSlug = slugOf("produk", rows.products);

  const suppliers: Supplier[] = bySlug(rows.suppliers).map((r) => ({
    id: r.slug, name: r.name, active: r.active, notes: r.notes ?? "",
  }));
  const materials: Material[] = bySlug(rows.materials).map((r) => ({
    id: r.slug, name: r.name, unit_kind: r.unit_kind, base_unit: r.base_unit, stock_on_hand: r.stock_on_hand,
  }));
  const products: Product[] = bySlug(rows.products).map((r) => ({
    id: r.slug, name: r.name, demand_units: r.demand_units, unit_contribution_idr: r.unit_contribution_idr,
  }));
  const bom = rows.bom_items
    .map((r) => ({
      product_id: productSlug(r.product_id),
      material_id: materialSlug(r.material_id),
      quantity_per_product: r.quantity_per_product,
    }))
    .sort((a, b) => `${a.product_id}|${a.material_id}`.localeCompare(`${b.product_id}|${b.material_id}`));
  const committed_deliveries: CommittedDelivery[] = bySlug(rows.committed_deliveries).map((r) => ({
    id: r.slug,
    supplier_id: supplierSlug(r.supplier_id),
    material_id: materialSlug(r.material_id),
    quantity_base_units: r.quantity_base_units,
    arrival_date: r.arrival_date,
    enabled_in_baseline: r.enabled_in_baseline,
  }));
  const alternative_offers: AlternativeOffer[] = bySlug(rows.alternative_offers).map((r) => ({
    id: r.slug,
    supplier_id: supplierSlug(r.supplier_id),
    material_id: materialSlug(r.material_id),
    pack_size_base_units: r.pack_size_base_units,
    max_packs: r.max_packs,
    lead_days: r.lead_days,
    incremental_premium_idr_per_pack: r.incremental_premium_idr_per_pack,
    enabled_in_scenario: r.enabled_in_scenario,
  }));
  const scenarios: ScenarioConfig[] = bySlug(rows.scenarios).map((r) => ({
    id: r.slug,
    name: r.name,
    cutoff_date: r.cutoff_date,
    disabled_supplier_ids: r.disabled_supplier_slugs ?? [],
    enabled_offer_ids: r.enabled_offer_slugs ?? [],
    disruptions: r.disruptions ?? [],
    overrides: r.overrides ?? {},
    source: r.source,
  }));

  return validateWorkspaceData({
    snapshot: {
      business: {
        id: rows.business.slug,
        name: rows.business.name,
        sector: rows.business.sector,
        currency: "IDR",
        planning_cutoff_date: rows.business.planning_cutoff_date,
        scenario_date: rows.business.scenario_date,
        ...(rows.business.created_at ? { created_at: rows.business.created_at } : {}),
      },
      suppliers,
      materials,
      products,
      bom,
      committed_deliveries,
      alternative_offers,
      scenario_date: rows.business.scenario_date,
      demo_data: false,
    },
    scenarios,
  });
}

/* --------------------------------- Galat aman ---------------------------------- */

function friendlyError(error: { message?: string; code?: string } | null, fallback: string): WorkspaceRepoError {
  switch (error?.code) {
    case "28000":
    case "42501":
    case "PGRST301":
      return new WorkspaceRepoError("Sesi Anda berakhir atau tidak berhak. Silakan masuk kembali.", 401);
    case "P0002":
      return new WorkspaceRepoError("Workspace atau template demo tidak ditemukan.", 404);
    case "22023":
    case "23503":
    case "23514":
    case "22P02":
      return new WorkspaceRepoError("Data workspace tidak valid dan tidak dapat disimpan. Periksa kembali isian Anda.", 400);
    default:
      return new WorkspaceRepoError(fallback, 500);
  }
}

/* --------------------------------- Operasi ------------------------------------- */

const DEMO_ID = "dapur_sari";

export async function loadDemoTemplate(supabase: SupabaseClient): Promise<WorkspaceData> {
  const { data, error } = await supabase.from("demo_templates").select("payload").eq("id", DEMO_ID).maybeSingle();
  if (error) throw friendlyError(error, "Gagal memuat data demo. Coba lagi beberapa saat.");
  const payload = (data as { payload?: { snapshot?: unknown; scenarios?: unknown } } | null)?.payload;
  if (!payload) throw new WorkspaceRepoError("Template demo Dapur Sari belum tersedia.", 404);
  try {
    return validateWorkspaceData({ snapshot: payload.snapshot, scenarios: payload.scenarios });
  } catch {
    throw new WorkspaceRepoError("Template demo tidak valid.", 500);
  }
}

async function loadRows(supabase: SupabaseClient, businessId: string): Promise<WorkspaceRows> {
  const fail = (e: { message?: string; code?: string } | null) =>
    friendlyError(e, "Gagal memuat workspace. Coba lagi beberapa saat.");

  const child = async <T>(table: string, columns: string): Promise<T[]> => {
    const { data, error } = await supabase.from(table).select(columns).eq("business_id", businessId);
    if (error) throw fail(error);
    return (data ?? []) as T[];
  };

  const biz = await supabase
    .from("businesses")
    .select("id, slug, name, sector, currency, planning_cutoff_date, scenario_date, created_at")
    .eq("id", businessId)
    .maybeSingle();
  if (biz.error) throw fail(biz.error);
  if (!biz.data) throw new WorkspaceRepoError("Workspace tidak ditemukan.", 404);

  const [suppliers, materials, products, bom_items, committed_deliveries, alternative_offers, scenarios] =
    await Promise.all([
      child<WorkspaceRows["suppliers"][number]>("suppliers", "id, slug, name, active, notes"),
      child<WorkspaceRows["materials"][number]>("materials", "id, slug, name, unit_kind, base_unit, stock_on_hand"),
      child<WorkspaceRows["products"][number]>("products", "id, slug, name, demand_units, unit_contribution_idr"),
      child<WorkspaceRows["bom_items"][number]>("bom_items", "product_id, material_id, quantity_per_product"),
      child<WorkspaceRows["committed_deliveries"][number]>(
        "committed_deliveries",
        "id, slug, supplier_id, material_id, quantity_base_units, arrival_date, enabled_in_baseline",
      ),
      child<WorkspaceRows["alternative_offers"][number]>(
        "alternative_offers",
        "id, slug, supplier_id, material_id, pack_size_base_units, max_packs, lead_days, incremental_premium_idr_per_pack, enabled_in_scenario",
      ),
      child<WorkspaceRows["scenarios"][number]>(
        "scenarios",
        "id, slug, name, cutoff_date, disabled_supplier_slugs, enabled_offer_slugs, disruptions, overrides, source",
      ),
    ]);

  return {
    business: biz.data as WorkspaceRows["business"],
    suppliers, materials, products, bom_items, committed_deliveries, alternative_offers, scenarios,
  };
}

async function ensureWorkspace(supabase: SupabaseClient, reset: boolean) {
  const { data, error } = await supabase.rpc("ensure_workspace", { p_reset: reset });
  if (error) throw friendlyError(error, "Gagal menyiapkan workspace. Coba lagi beberapa saat.");
  if (typeof data !== "string") throw new WorkspaceRepoError("Gagal menyiapkan workspace.", 500);
  const businessId: string = data;
  return { businessId, data: rowsToWorkspaceData(await loadRows(supabase, businessId)) };
}

export function loadUserWorkspace(supabase: SupabaseClient) {
  return ensureWorkspace(supabase, false);
}

export function resetUserWorkspace(supabase: SupabaseClient) {
  return ensureWorkspace(supabase, true);
}

/** Validasi penuh (termasuk 3 skenario inti), simpan atomik lewat RPC, lalu muat ulang dari database. */
export async function saveUserWorkspace(
  supabase: SupabaseClient,
  businessId: string,
  data: WorkspaceData,
): Promise<WorkspaceData> {
  const valid = validateWorkspaceData(data); // melempar WorkspaceValidationError sebelum menyentuh DB
  const { error } = await supabase.rpc("save_workspace_snapshot", { p_business_id: businessId, p_payload: valid });
  if (error) throw friendlyError(error, "Gagal menyimpan workspace. Coba lagi beberapa saat.");
  return rowsToWorkspaceData(await loadRows(supabase, businessId));
}
