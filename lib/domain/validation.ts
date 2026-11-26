import { z } from "zod";
import { CORE_SCENARIO_IDS, MAX_SCENARIOS, type WorkspaceData } from "./types";

/** Batas integer mengikuti CHECK constraint Postgres (lihat desain §5). */
const SLUG = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const slug = z.string().regex(SLUG, "ID hanya boleh huruf, angka, '_' atau '-' (maks. 64 karakter).");
const name = z.string().trim().min(1, "Nama wajib diisi.").max(100, "Nama maksimal 100 karakter.");
const int = (min: number, max: number, label: string) =>
  z
    .number({ error: `${label} harus berupa angka.` })
    .int(`${label} harus bilangan bulat.`)
    .min(min, `${label} minimal ${min.toLocaleString("id-ID")}.`)
    .max(max, `${label} maksimal ${max.toLocaleString("id-ID")}.`);

const isoDate = z
  .string()
  .regex(DATE, "Tanggal harus berformat YYYY-MM-DD.")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Tanggal tidak valid.");

const businessSchema = z.object({
  id: slug,
  name,
  sector: name,
  currency: z.literal("IDR"),
  planning_cutoff_date: isoDate,
  scenario_date: isoDate,
  created_at: z.string().optional(),
});

const supplierSchema = z.object({
  id: slug,
  name,
  active: z.boolean(),
  notes: z.string().max(500, "Catatan maksimal 500 karakter."),
});

const UNIT_PAIRS = { mass: "g", volume: "ml", count: "pcs" } as const;

const materialSchema = z
  .object({
    id: slug,
    name,
    unit_kind: z.enum(["mass", "volume", "count"]),
    base_unit: z.enum(["g", "ml", "pcs"]),
    stock_on_hand: int(0, 1_000_000, "Stok"),
  })
  .superRefine((m, ctx) => {
    if (UNIT_PAIRS[m.unit_kind] !== m.base_unit) {
      ctx.addIssue({
        code: "custom",
        path: ["base_unit"],
        message: `Satuan dasar ${m.base_unit} tidak cocok dengan jenis ${m.unit_kind}.`,
      });
    }
  });

const productSchema = z.object({
  id: slug,
  name,
  demand_units: int(0, 1_000_000, "Permintaan"),
  unit_contribution_idr: int(0, 10_000_000, "Kontribusi per unit"),
});

const bomSchema = z.object({
  product_id: slug,
  material_id: slug,
  quantity_per_product: int(1, 1_000_000, "Kebutuhan bahan per produk"),
});

const deliverySchema = z.object({
  id: slug,
  supplier_id: slug,
  material_id: slug,
  quantity_base_units: int(1, 1_000_000, "Jumlah pengiriman"),
  arrival_date: isoDate,
  enabled_in_baseline: z.boolean(),
});

const offerSchema = z.object({
  id: slug,
  supplier_id: slug,
  material_id: slug,
  pack_size_base_units: int(1, 1_000_000, "Isi per pak"),
  max_packs: int(0, 1_000_000, "Maksimal pak"),
  lead_days: int(0, 365, "Lead time"),
  incremental_premium_idr_per_pack: int(0, 10_000_000, "Premi per pak"),
  enabled_in_scenario: z.boolean(),
});

const disruptionSchema = z.object({
  type: z.literal("delay_delivery"),
  delivery_id: slug,
  delay_days: int(0, 365, "Keterlambatan (hari)"),
});

const overridesSchema = z.object({
  stock_by_material: z.record(slug, int(0, 1_000_000, "Stok override")).optional(),
  demand_by_product: z.record(slug, int(0, 1_000_000, "Permintaan override")).optional(),
});

const scenarioSchema = z.object({
  id: slug,
  name,
  cutoff_date: isoDate,
  disabled_supplier_ids: z.array(slug),
  enabled_offer_ids: z.array(slug),
  disruptions: z.array(disruptionSchema),
  overrides: overridesSchema,
  source: z.enum(["demo", "user"]),
});

const snapshotSchema = z.object({
  business: businessSchema,
  suppliers: z.array(supplierSchema),
  materials: z.array(materialSchema),
  products: z.array(productSchema),
  bom: z.array(bomSchema),
  committed_deliveries: z.array(deliverySchema),
  alternative_offers: z.array(offerSchema),
  scenario_date: isoDate,
  demo_data: z.boolean(),
});

const workspaceShape = z.object({
  snapshot: snapshotSchema,
  scenarios: z.array(scenarioSchema).max(MAX_SCENARIOS, `Maksimal ${MAX_SCENARIOS} skenario.`),
});

const crossCheck =
  (requireCore: boolean) =>
  (data: z.infer<typeof workspaceShape>, ctx: z.RefinementCtx) => {
    const { snapshot: s, scenarios } = data;
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });

    const unique = (key: string, ids: string[]) => {
      const seen = new Set<string>();
      ids.forEach((id, i) => {
        if (seen.has(id)) issue(["snapshot", key, i, "id"], `ID "${id}" duplikat di ${key}.`);
        seen.add(id);
      });
    };
    unique("suppliers", s.suppliers.map((x) => x.id));
    unique("materials", s.materials.map((x) => x.id));
    unique("products", s.products.map((x) => x.id));
    unique("committed_deliveries", s.committed_deliveries.map((x) => x.id));
    unique("alternative_offers", s.alternative_offers.map((x) => x.id));

    const supplierIds = new Set(s.suppliers.map((x) => x.id));
    const materialIds = new Set(s.materials.map((x) => x.id));
    const productIds = new Set(s.products.map((x) => x.id));
    const deliveryIds = new Set(s.committed_deliveries.map((x) => x.id));
    const offerIds = new Set(s.alternative_offers.map((x) => x.id));

    const bomPairs = new Set<string>();
    s.bom.forEach((b, i) => {
      if (!productIds.has(b.product_id)) issue(["snapshot", "bom", i, "product_id"], `Produk "${b.product_id}" tidak ditemukan.`);
      if (!materialIds.has(b.material_id)) issue(["snapshot", "bom", i, "material_id"], `Bahan "${b.material_id}" tidak ditemukan.`);
      const pair = `${b.product_id}|${b.material_id}`;
      if (bomPairs.has(pair)) issue(["snapshot", "bom", i], "Resep duplikat untuk pasangan produk dan bahan yang sama.");
      bomPairs.add(pair);
    });

    s.committed_deliveries.forEach((d, i) => {
      if (!supplierIds.has(d.supplier_id)) issue(["snapshot", "committed_deliveries", i, "supplier_id"], `Pemasok "${d.supplier_id}" tidak ditemukan.`);
      if (!materialIds.has(d.material_id)) issue(["snapshot", "committed_deliveries", i, "material_id"], `Bahan "${d.material_id}" tidak ditemukan.`);
    });
    s.alternative_offers.forEach((o, i) => {
      if (!supplierIds.has(o.supplier_id)) issue(["snapshot", "alternative_offers", i, "supplier_id"], `Pemasok "${o.supplier_id}" tidak ditemukan.`);
      if (!materialIds.has(o.material_id)) issue(["snapshot", "alternative_offers", i, "material_id"], `Bahan "${o.material_id}" tidak ditemukan.`);
    });

    const scenarioIds = scenarios.map((x) => x.id);
    unique("scenarios", scenarioIds);
    if (requireCore) {
      for (const core of CORE_SCENARIO_IDS) {
        if (!scenarioIds.includes(core)) issue(["scenarios"], `Skenario inti "${core}" wajib ada.`);
      }
    }

    scenarios.forEach((sc, i) => {
      sc.disabled_supplier_ids.forEach((id, j) => {
        if (!supplierIds.has(id)) issue(["scenarios", i, "disabled_supplier_ids", j], `Pemasok "${id}" tidak ditemukan.`);
      });
      sc.enabled_offer_ids.forEach((id, j) => {
        if (!offerIds.has(id)) issue(["scenarios", i, "enabled_offer_ids", j], `Penawaran "${id}" tidak ditemukan.`);
      });
      sc.disruptions.forEach((d, j) => {
        if (!deliveryIds.has(d.delivery_id)) issue(["scenarios", i, "disruptions", j, "delivery_id"], `Pengiriman "${d.delivery_id}" tidak ditemukan.`);
      });
      Object.keys(sc.overrides.stock_by_material ?? {}).forEach((id) => {
        if (!materialIds.has(id)) issue(["scenarios", i, "overrides", "stock_by_material", id], `Bahan "${id}" tidak ditemukan.`);
      });
      Object.keys(sc.overrides.demand_by_product ?? {}).forEach((id) => {
        if (!productIds.has(id)) issue(["scenarios", i, "overrides", "demand_by_product", id], `Produk "${id}" tidak ditemukan.`);
      });
    });
  };

/** Skema workspace lengkap: wajib memuat 3 skenario inti. */
export const workspaceDataSchema = workspaceShape.superRefine(crossCheck(true));
/** Skema masukan simulasi: seluruh aturan yang sama, tetapi skenario inti tidak diwajibkan. */
const simulationInputSchema = workspaceShape.superRefine(crossCheck(false));

export class WorkspaceValidationError extends Error {
  readonly issues: { path: string; message: string }[];
  constructor(issues: { path: string; message: string }[]) {
    super(issues.map((i) => (i.path ? `${i.path}: ${i.message}` : i.message)).join("; "));
    this.name = "WorkspaceValidationError";
    this.issues = issues;
  }
}

function parseWith(schema: typeof workspaceDataSchema, input: unknown): WorkspaceData {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new WorkspaceValidationError(
      result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  return result.data as WorkspaceData;
}

/** Validasi + normalisasi `WorkspaceData`; melempar `WorkspaceValidationError` berpesan Indonesia. */
export function validateWorkspaceData(input: unknown): WorkspaceData {
  return parseWith(workspaceDataSchema, input);
}

/** Validasi masukan solver: snapshot + skenario apa pun (tanpa kewajiban 3 skenario inti). */
export function validateSimulationInput(input: unknown): WorkspaceData {
  return parseWith(simulationInputSchema, input);
}
