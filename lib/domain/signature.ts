import { sha256Hex } from "./sha256";
import type { ScenarioConfig, WorkspaceSnapshot } from "./types";

const byKey = <T>(items: T[], key: (item: T) => string): T[] =>
  [...items].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });

const sortedRecord = (rec: Record<string, number> | undefined) =>
  Object.fromEntries(Object.entries(rec ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/** JSON deterministik: kunci objek diurutkan, array dipertahankan (sudah dinormalkan pemanggil). */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Signature seluruh input yang memengaruhi hasil solver. Urutan elemen array tidak berpengaruh;
 * nama, catatan, dan metadata tampilan sengaja tidak ikut agar tidak menimbulkan status basi palsu.
 */
export function computeInputsSignature(
  snapshot: WorkspaceSnapshot,
  scenarios: ScenarioConfig[],
): string {
  const canonical = {
    scenario_date: snapshot.scenario_date,
    planning_cutoff_date: snapshot.business.planning_cutoff_date,
    suppliers: byKey(snapshot.suppliers, (s) => s.id).map((s) => ({ id: s.id, active: s.active })),
    materials: byKey(snapshot.materials, (m) => m.id).map((m) => ({
      id: m.id,
      unit_kind: m.unit_kind,
      base_unit: m.base_unit,
      stock_on_hand: m.stock_on_hand,
    })),
    products: byKey(snapshot.products, (p) => p.id).map((p) => ({
      id: p.id,
      demand_units: p.demand_units,
      unit_contribution_idr: p.unit_contribution_idr,
    })),
    bom: byKey(snapshot.bom, (b) => `${b.product_id}|${b.material_id}`),
    committed_deliveries: byKey(snapshot.committed_deliveries, (d) => d.id),
    alternative_offers: byKey(snapshot.alternative_offers, (o) => o.id),
    scenarios: byKey(scenarios, (s) => s.id).map((s) => ({
      id: s.id,
      cutoff_date: s.cutoff_date,
      disabled_supplier_ids: [...s.disabled_supplier_ids].sort(),
      enabled_offer_ids: [...s.enabled_offer_ids].sort(),
      disruptions: byKey(s.disruptions, (d) => `${d.delivery_id}|${d.type}|${String(d.delay_days).padStart(6, "0")}`),
      overrides: {
        stock_by_material: sortedRecord(s.overrides.stock_by_material),
        demand_by_product: sortedRecord(s.overrides.demand_by_product),
      },
    })),
  };
  return sha256Hex(stableStringify(canonical));
}
