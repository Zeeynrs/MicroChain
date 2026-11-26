import type { ScenarioConfig, ScenarioResult, WorkspaceSnapshot } from "./types";

export type SupplyClassification = "single_supplier" | "multi_supplier" | "backup_only" | "stock_only";

export interface SupplierMeta {
  active: boolean;
  disrupted: boolean;
}
export interface MaterialMeta {
  stock_on_hand: number;
  base_unit: string;
  committedSupplierIds: string[];
  backupSupplierIds: string[];
  isSingleSupplier: boolean;
  hasBackupSupplier: boolean;
  supplyClassification: SupplyClassification;
  isBottleneck: boolean;
  /** Produk yang memakai bahan ini. */
  productIds: string[];
}
export interface ProductMeta {
  demand_units: number;
  unit_contribution_idr: number;
  dependsOnSingleSupplier: boolean;
  materialIds: string[];
}

interface BaseNode<K extends string, M> {
  /** Berprefiks `s:` / `m:` / `p:` agar tidak bentrok antar jenis. */
  id: string;
  /** ID entitas asli (slug). */
  entityId: string;
  kind: K;
  label: string;
  position: { x: number; y: number };
  meta: M;
}
export type SupplyNode =
  | BaseNode<"supplier", SupplierMeta>
  | BaseNode<"material", MaterialMeta>
  | BaseNode<"product", ProductMeta>;

export interface SupplyEdge {
  id: string;
  source: string;
  target: string;
  kind: "committed" | "alternative" | "bom";
  label: string;
  disrupted: boolean;
}

export interface SupplyNetworkModel {
  nodes: SupplyNode[];
  edges: SupplyEdge[];
}

export const COLUMN_X = { supplier: 0, material: 340, product: 680 } as const;
export const ROW_HEIGHT = 110;

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const sortById = <T extends { id: string }>(items: T[]): T[] => [...items].sort((a, b) => cmp(a.id, b.id));
const unique = (ids: string[]) => [...new Set(ids)].sort(cmp);
const fmt = (n: number) => n.toLocaleString("id-ID");

/**
 * Membangun graf `Pemasok -> Bahan -> Produk` dengan tata letak 3 kolom deterministik.
 * Bila `scenario` (dan opsional `result`) diberikan, graf menandai pemasok/pengiriman yang
 * terganggu serta bahan yang menjadi penghambat produksi.
 */
export function buildSupplyNetwork(
  snapshot: WorkspaceSnapshot,
  scenario?: ScenarioConfig,
  result?: ScenarioResult,
): SupplyNetworkModel {
  const suppliers = sortById(snapshot.suppliers);
  const materials = sortById(snapshot.materials);
  const products = sortById(snapshot.products);

  const supplierDisrupted = (id: string) => {
    const s = snapshot.suppliers.find((x) => x.id === id);
    if (!s) return false;
    return scenario ? !s.active || scenario.disabled_supplier_ids.includes(id) : false;
  };
  const uncountedDeliveries = new Set(
    (result?.delivery_statuses ?? []).filter((d) => !d.counted).map((d) => d.delivery_id),
  );
  const bottlenecks = new Set(result?.bottleneck_material_ids ?? []);

  const committedByMaterial = new Map<string, string[]>();
  for (const d of snapshot.committed_deliveries) {
    committedByMaterial.set(d.material_id, [...(committedByMaterial.get(d.material_id) ?? []), d.supplier_id]);
  }
  const offerSuppliersByMaterial = new Map<string, string[]>();
  for (const o of snapshot.alternative_offers) {
    offerSuppliersByMaterial.set(o.material_id, [...(offerSuppliersByMaterial.get(o.material_id) ?? []), o.supplier_id]);
  }

  const materialMeta = new Map<string, MaterialMeta>();
  for (const m of materials) {
    const committed = unique(committedByMaterial.get(m.id) ?? []);
    const backup = unique((offerSuppliersByMaterial.get(m.id) ?? []).filter((s) => !committed.includes(s)));
    const classification: SupplyClassification =
      committed.length === 0
        ? backup.length > 0
          ? "backup_only"
          : "stock_only"
        : committed.length === 1
          ? "single_supplier"
          : "multi_supplier";
    materialMeta.set(m.id, {
      stock_on_hand: m.stock_on_hand,
      base_unit: m.base_unit,
      committedSupplierIds: committed,
      backupSupplierIds: backup,
      isSingleSupplier: committed.length === 1,
      hasBackupSupplier: backup.length > 0,
      supplyClassification: classification,
      isBottleneck: bottlenecks.has(m.id),
      productIds: unique(snapshot.bom.filter((b) => b.material_id === m.id).map((b) => b.product_id)),
    });
  }

  const nodes: SupplyNode[] = [
    ...suppliers.map<SupplyNode>((s, i) => ({
      id: `s:${s.id}`,
      entityId: s.id,
      kind: "supplier",
      label: s.name,
      position: { x: COLUMN_X.supplier, y: i * ROW_HEIGHT },
      meta: { active: s.active, disrupted: supplierDisrupted(s.id) },
    })),
    ...materials.map<SupplyNode>((m, i) => ({
      id: `m:${m.id}`,
      entityId: m.id,
      kind: "material",
      label: m.name,
      position: { x: COLUMN_X.material, y: i * ROW_HEIGHT },
      meta: materialMeta.get(m.id)!,
    })),
    ...products.map<SupplyNode>((p, i) => {
      const materialIds = unique(snapshot.bom.filter((b) => b.product_id === p.id).map((b) => b.material_id));
      return {
        id: `p:${p.id}`,
        entityId: p.id,
        kind: "product",
        label: p.name,
        position: { x: COLUMN_X.product, y: i * ROW_HEIGHT },
        meta: {
          demand_units: p.demand_units,
          unit_contribution_idr: p.unit_contribution_idr,
          dependsOnSingleSupplier: materialIds.some((id) => materialMeta.get(id)?.isSingleSupplier),
          materialIds,
        },
      };
    }),
  ];

  const unitOf = (materialId: string) => snapshot.materials.find((m) => m.id === materialId)?.base_unit ?? "";
  const edges: SupplyEdge[] = [
    ...sortById(snapshot.committed_deliveries).map<SupplyEdge>((d) => ({
      id: `e:delivery:${d.id}`,
      source: `s:${d.supplier_id}`,
      target: `m:${d.material_id}`,
      kind: "committed",
      label: `${fmt(d.quantity_base_units)} ${unitOf(d.material_id)} · ${d.arrival_date}`,
      disrupted: supplierDisrupted(d.supplier_id) || uncountedDeliveries.has(d.id),
    })),
    ...sortById(snapshot.alternative_offers).map<SupplyEdge>((o) => ({
      id: `e:offer:${o.id}`,
      source: `s:${o.supplier_id}`,
      target: `m:${o.material_id}`,
      kind: "alternative",
      label: `Maks. ${fmt(o.max_packs)} pak × ${fmt(o.pack_size_base_units)} ${unitOf(o.material_id)}`,
      disrupted: supplierDisrupted(o.supplier_id),
    })),
    ...[...snapshot.bom]
      .sort((a, b) => cmp(`${a.product_id}|${a.material_id}`, `${b.product_id}|${b.material_id}`))
      .map<SupplyEdge>((b) => ({
        id: `e:bom:${b.product_id}:${b.material_id}`,
        source: `m:${b.material_id}`,
        target: `p:${b.product_id}`,
        kind: "bom",
        label: `${fmt(b.quantity_per_product)} ${unitOf(b.material_id)} / unit`,
        disrupted: false,
      })),
  ];

  return { nodes, edges };
}
