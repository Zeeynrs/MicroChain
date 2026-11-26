/**
 * Kontrak domain kanonik MicroChain (lihat docs/superpowers/specs/2026-11-25-microchain-design.md §3).
 * Seluruh `id` adalah slug (bukan UUID Postgres); repositori Supabase memetakan slug <-> UUID.
 */

export type UnitKind = "mass" | "volume" | "count";
export type BaseUnit = "g" | "ml" | "pcs";

export interface BusinessInfo {
  id: string;
  name: string;
  sector: string;
  currency: "IDR";
  planning_cutoff_date: string;
  scenario_date: string;
  created_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  active: boolean;
  notes: string;
}

export interface Material {
  id: string;
  name: string;
  unit_kind: UnitKind;
  base_unit: BaseUnit;
  stock_on_hand: number;
}

export interface Product {
  id: string;
  name: string;
  demand_units: number;
  unit_contribution_idr: number;
}

export interface BomItem {
  product_id: string;
  material_id: string;
  quantity_per_product: number;
}

export interface CommittedDelivery {
  id: string;
  supplier_id: string;
  material_id: string;
  quantity_base_units: number;
  arrival_date: string;
  enabled_in_baseline: boolean;
}

export interface AlternativeOffer {
  id: string;
  supplier_id: string;
  material_id: string;
  pack_size_base_units: number;
  max_packs: number;
  lead_days: number;
  incremental_premium_idr_per_pack: number;
  enabled_in_scenario: boolean;
}

export interface DeliveryDisruption {
  type: "delay_delivery";
  delivery_id: string;
  delay_days: number;
}

export interface ScenarioOverrides {
  stock_by_material?: Record<string, number>;
  demand_by_product?: Record<string, number>;
}

export type ScenarioSource = "demo" | "user";

export interface ScenarioConfig {
  id: string;
  name: string;
  cutoff_date: string;
  disabled_supplier_ids: string[];
  enabled_offer_ids: string[];
  disruptions: DeliveryDisruption[];
  overrides: ScenarioOverrides;
  source: ScenarioSource;
}

export interface WorkspaceSnapshot {
  business: BusinessInfo;
  suppliers: Supplier[];
  materials: Material[];
  products: Product[];
  bom: BomItem[];
  committed_deliveries: CommittedDelivery[];
  alternative_offers: AlternativeOffer[];
  scenario_date: string;
  demo_data: boolean;
}

export interface WorkspaceData {
  snapshot: WorkspaceSnapshot;
  scenarios: ScenarioConfig[];
}

export const CORE_SCENARIO_IDS = ["baseline", "outage", "mitigation"] as const;
export type CoreScenarioId = (typeof CORE_SCENARIO_IDS)[number];
export const MAX_SCENARIOS = 10;

/* ------------------------------ Hasil solver ------------------------------ */

export type SolverStatus = "Optimal" | "Infeasible" | "Error";

export interface ProductionLine {
  product_id: string;
  units: number;
  demand_units: number;
  contribution_idr: number;
}

export interface MaterialUsage {
  material_id: string;
  available: number;
  used: number;
  remaining: number;
}

export interface AlternativePurchase {
  offer_id: string;
  eligible: boolean;
  reason: string | null;
  arrival_date: string;
  effective_max_packs: number;
  packs_bought: number;
  quantity_base_units: number;
  premium_idr: number;
}

export interface DeliveryStatus {
  delivery_id: string;
  counted: boolean;
  reason: string | null;
  delay_days: number;
  effective_arrival: string;
  quantity_base_units: number;
}

export interface ScenarioResult {
  scenario_id: string;
  status: SolverStatus;
  message: string | null;
  production: ProductionLine[];
  material_usage: MaterialUsage[];
  alternative_purchases: AlternativePurchase[];
  delivery_statuses: DeliveryStatus[];
  gross_contribution_idr: number;
  alternative_premium_idr: number;
  net_contribution_idr: number;
  /** Bahan yang habis terpakai dan membatasi produksi (sisa 0 sementara masih ada permintaan tak terpenuhi). */
  bottleneck_material_ids: string[];
}

export interface ComparisonSummary {
  baseline_net_idr: number;
  outage_net_idr: number;
  mitigation_net_idr: number;
  loss_idr: number;
  loss_pct_of_baseline: number;
  recovered_idr: number;
  recovered_pct_of_loss: number;
  recovered_pct_of_baseline: number;
}
