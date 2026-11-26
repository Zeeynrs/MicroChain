import { addDays } from "@/lib/domain/dates";
import type {
  AlternativeOffer,
  DeliveryStatus,
  Material,
  Product,
  ScenarioConfig,
  WorkspaceSnapshot,
} from "@/lib/domain/types";

/**
 * Resolusi input satu skenario (murni, tanpa solver): pengiriman mana yang dihitung, penawaran mana
 * yang layak, serta stok dan permintaan efektif. Dipakai solver MILP dan analisis jaringan di UI.
 */

export interface OfferInfo {
  offer: AlternativeOffer;
  arrival: string;
  reason: string | null;
  eligible: boolean;
  maxPacks: number;
}

export interface ResolvedInputs {
  supplierActive: Map<string, boolean>;
  materials: Material[];
  products: Product[];
  deliveryStatuses: DeliveryStatus[];
  offerInfo: OfferInfo[];
  /** Stok efektif + pengiriman yang dihitung, per bahan. */
  available: Map<string, number>;
  demand: Map<string, number>;
  qty: Map<string, number>;
}

const byId = <T extends { id: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

export function resolveScenarioInputs(snapshot: WorkspaceSnapshot, scenario: ScenarioConfig): ResolvedInputs {
  const cutoff = scenario.cutoff_date;
  const supplierActive = new Map(
    snapshot.suppliers.map((s) => [s.id, s.active && !scenario.disabled_supplier_ids.includes(s.id)]),
  );

  const delayByDelivery = new Map<string, number>();
  for (const d of scenario.disruptions) {
    if (d.type === "delay_delivery") {
      delayByDelivery.set(d.delivery_id, (delayByDelivery.get(d.delivery_id) ?? 0) + d.delay_days);
    }
  }

  // 1) Pengiriman terjadwal -> stok tambahan
  const materials = byId(snapshot.materials);
  const products = byId(snapshot.products);
  const arriving = new Map<string, number>();
  const deliveryStatuses: DeliveryStatus[] = byId(snapshot.committed_deliveries).map((d) => {
    const delay = delayByDelivery.get(d.id) ?? 0;
    const effective = addDays(d.arrival_date, delay);
    let reason: string | null = null;
    if (!supplierActive.get(d.supplier_id)) reason = "Pemasok dinonaktifkan";
    else if (!d.enabled_in_baseline) reason = "Nonaktif di baseline";
    else if (effective > cutoff) reason = `Tiba ${effective} melewati batas ${cutoff}`;
    const counted = reason === null;
    if (counted) arriving.set(d.material_id, (arriving.get(d.material_id) ?? 0) + d.quantity_base_units);
    return {
      delivery_id: d.id,
      counted,
      reason,
      delay_days: delay,
      effective_arrival: effective,
      quantity_base_units: d.quantity_base_units,
    };
  });

  // 2) Penawaran alternatif -> kapasitas efektif
  const offerInfo: OfferInfo[] = byId(snapshot.alternative_offers).map((o) => {
    const arrival = addDays(snapshot.scenario_date, o.lead_days);
    let reason: string | null = null;
    if (!supplierActive.get(o.supplier_id)) reason = "Pemasok dinonaktifkan";
    else if (!o.enabled_in_scenario) reason = "Dinonaktifkan di Data Usaha";
    else if (!scenario.enabled_offer_ids.includes(o.id)) reason = "Tidak diaktifkan di skenario ini";
    else if (arrival > cutoff) reason = `Tiba ${arrival} melewati batas ${cutoff}`;
    return { offer: o, arrival, reason, eligible: reason === null, maxPacks: reason === null ? o.max_packs : 0 };
  });

  // 3) Parameter efektif
  const stockOf = (id: string, base: number) => scenario.overrides.stock_by_material?.[id] ?? base;
  const demandOf = (id: string, base: number) => scenario.overrides.demand_by_product?.[id] ?? base;
  const available = new Map(
    materials.map((m) => [m.id, stockOf(m.id, m.stock_on_hand) + (arriving.get(m.id) ?? 0)]),
  );
  const demand = new Map(products.map((p) => [p.id, demandOf(p.id, p.demand_units)]));
  const qty = new Map(snapshot.bom.map((b) => [`${b.product_id}|${b.material_id}`, b.quantity_per_product]));

  return { supplierActive, materials, products, deliveryStatuses, offerInfo, available, demand, qty };
}
