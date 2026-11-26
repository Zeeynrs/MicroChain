import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { DAPUR_SARI_FALLBACK_FIXTURE, EMPTY_WORKSPACE_FIXTURE } from "@/lib/domain/fixture";
import { WorkspaceValidationError } from "@/lib/domain/validation";
import type { WorkspaceData } from "@/lib/domain/types";
import {
  WorkspaceRepoError,
  loadDemoTemplate,
  loadUserWorkspace,
  resetUserWorkspace,
  rowsToWorkspaceData,
  saveUserWorkspace,
  type WorkspaceRows,
} from "@/lib/supabase/workspace-repo";

const fresh = (): WorkspaceData => structuredClone(DAPUR_SARI_FALLBACK_FIXTURE);
const BUSINESS_UUID = "11111111-1111-4111-8111-111111111111";
const uuid = (slug: string) => `uuid-${slug}`;

/** Representasi relasional Postgres dari fixture (UUID dipakai sebagai kunci asing). */
function toRows(data: WorkspaceData): WorkspaceRows {
  const s = data.snapshot;
  return {
    business: {
      id: BUSINESS_UUID,
      slug: s.business.id,
      name: s.business.name,
      sector: s.business.sector,
      currency: "IDR",
      planning_cutoff_date: s.business.planning_cutoff_date,
      scenario_date: s.scenario_date,
      created_at: "2026-11-25T00:00:00Z",
    },
    suppliers: s.suppliers.map((x) => ({ id: uuid(x.id), slug: x.id, name: x.name, active: x.active, notes: x.notes })),
    materials: s.materials.map((x) => ({
      id: uuid(x.id), slug: x.id, name: x.name, unit_kind: x.unit_kind, base_unit: x.base_unit, stock_on_hand: x.stock_on_hand,
    })),
    products: s.products.map((x) => ({
      id: uuid(x.id), slug: x.id, name: x.name, demand_units: x.demand_units, unit_contribution_idr: x.unit_contribution_idr,
    })),
    bom_items: s.bom.map((x) => ({
      product_id: uuid(x.product_id), material_id: uuid(x.material_id), quantity_per_product: x.quantity_per_product,
    })),
    committed_deliveries: s.committed_deliveries.map((x) => ({
      id: uuid(x.id), slug: x.id, supplier_id: uuid(x.supplier_id), material_id: uuid(x.material_id),
      quantity_base_units: x.quantity_base_units, arrival_date: x.arrival_date, enabled_in_baseline: x.enabled_in_baseline,
    })),
    alternative_offers: s.alternative_offers.map((x) => ({
      id: uuid(x.id), slug: x.id, supplier_id: uuid(x.supplier_id), material_id: uuid(x.material_id),
      pack_size_base_units: x.pack_size_base_units, max_packs: x.max_packs, lead_days: x.lead_days,
      incremental_premium_idr_per_pack: x.incremental_premium_idr_per_pack, enabled_in_scenario: x.enabled_in_scenario,
    })),
    scenarios: data.scenarios.map((x) => ({
      id: uuid(x.id), slug: x.id, name: x.name, cutoff_date: x.cutoff_date,
      disabled_supplier_slugs: x.disabled_supplier_ids, enabled_offer_slugs: x.enabled_offer_ids,
      disruptions: x.disruptions, overrides: x.overrides, source: x.source,
    })),
  };
}

const TABLE_KEYS: Record<string, keyof WorkspaceRows> = {
  businesses: "business",
  suppliers: "suppliers",
  materials: "materials",
  products: "products",
  bom_items: "bom_items",
  committed_deliveries: "committed_deliveries",
  alternative_offers: "alternative_offers",
  scenarios: "scenarios",
};

function fakeSupabase(opts: {
  rows?: WorkspaceRows;
  template?: unknown;
  rpc?: (fn: string, args: unknown) => { data: unknown; error: { message: string } | null };
}) {
  const rpc = vi.fn(async (fn: string, args: unknown) => {
    if (opts.rpc) return opts.rpc(fn, args);
    return { data: BUSINESS_UUID, error: null };
  });
  const from = vi.fn((table: string) => {
    let data: unknown[] = [];
    if (table === "demo_templates") data = opts.template === undefined ? [] : [{ payload: opts.template }];
    else if (opts.rows) {
      const v = opts.rows[TABLE_KEYS[table]];
      data = Array.isArray(v) ? v : [v];
    }
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      maybeSingle: async () => ({ data: data[0] ?? null, error: null }),
      single: async () => ({ data: data[0] ?? null, error: null }),
      then: (resolve: (v: { data: unknown[]; error: null }) => unknown) => resolve({ data, error: null }),
    };
    return builder;
  });
  return { client: { from, rpc } as unknown as SupabaseClient, rpc, from };
}

describe("rowsToWorkspaceData", () => {
  it("maps relational UUID references back to canonical slugs", () => {
    const original = fresh();
    const mapped = rowsToWorkspaceData(toRows(original));

    expect(mapped.snapshot.business.id).toBe("dapur_sari");
    expect(mapped.snapshot.committed_deliveries[0].supplier_id).toBe("supplier_a");
    expect(mapped.snapshot.committed_deliveries[0].material_id).toBe("flour");
    expect(mapped.snapshot.alternative_offers[0].supplier_id).toBe("supplier_b");
    expect(mapped.snapshot.bom.every((b) => !b.product_id.startsWith("uuid-") && !b.material_id.startsWith("uuid-"))).toBe(true);
    expect(mapped.scenarios.find((s) => s.id === "outage")!.disabled_supplier_ids).toEqual(["supplier_a"]);
  });

  it("round-trips the fixture (order-insensitive) and passes validation", () => {
    const original = fresh();
    const mapped = rowsToWorkspaceData(toRows(original));
    const sortedById = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id));
    expect(sortedById(mapped.snapshot.materials)).toEqual(sortedById(original.snapshot.materials));
    expect(sortedById(mapped.snapshot.products)).toEqual(sortedById(original.snapshot.products));
    expect(sortedById(mapped.scenarios)).toEqual(sortedById(original.scenarios));
    expect(mapped.snapshot.scenario_date).toBe(original.snapshot.scenario_date);
    expect(mapped.snapshot.demo_data).toBe(false);
  });

  it("throws a friendly error when a relation points to an unknown row", () => {
    const rows = toRows(fresh());
    rows.bom_items[0].material_id = "uuid-ghost";
    expect(() => rowsToWorkspaceData(rows)).toThrow(WorkspaceRepoError);
  });
});

describe("empty workspace for new users", () => {
  it("maps a brand-new empty workspace (no entities, 3 core scenarios) and passes validation", () => {
    const empty = structuredClone(EMPTY_WORKSPACE_FIXTURE);
    const mapped = rowsToWorkspaceData(toRows(empty));
    expect(mapped.snapshot.business.name).toBe("Usaha Saya");
    expect(mapped.snapshot.suppliers).toEqual([]);
    expect(mapped.snapshot.materials).toEqual([]);
    expect(mapped.snapshot.products).toEqual([]);
    expect(mapped.scenarios.map((x) => x.id).sort()).toEqual(["baseline", "mitigation", "outage"]);
    expect(mapped.snapshot.demo_data).toBe(false);
  });

  it("loadUserWorkspace returns the empty workspace without any Dapur Sari data", async () => {
    const { client } = fakeSupabase({ rows: toRows(structuredClone(EMPTY_WORKSPACE_FIXTURE)) });
    const res = await loadUserWorkspace(client);
    expect(res.data.snapshot.business.id).not.toBe("dapur_sari");
    expect(res.data.snapshot.products).toHaveLength(0);
  });
});

describe("loadDemoTemplate", () => {
  it("validates and returns the demo_templates payload", async () => {
    const f = fresh();
    const { client } = fakeSupabase({ template: { demo_data: true, snapshot: f.snapshot, scenarios: f.scenarios } });
    const data = await loadDemoTemplate(client);
    expect(data.snapshot.business.id).toBe("dapur_sari");
    expect(data.snapshot.demo_data).toBe(true);
    expect(data.scenarios).toHaveLength(3);
  });

  it("fails with a friendly error when the template is missing or malformed", async () => {
    await expect(loadDemoTemplate(fakeSupabase({}).client)).rejects.toThrow(WorkspaceRepoError);
    await expect(loadDemoTemplate(fakeSupabase({ template: { snapshot: {} } }).client)).rejects.toThrow(WorkspaceRepoError);
  });
});

describe("user workspace persistence", () => {
  it("loadUserWorkspace ensures the demo copy via RPC then loads rows", async () => {
    const { client, rpc } = fakeSupabase({ rows: toRows(fresh()) });
    const res = await loadUserWorkspace(client);
    expect(rpc).toHaveBeenCalledWith("ensure_workspace", { p_reset: false });
    expect(res.businessId).toBe(BUSINESS_UUID);
    expect(res.data.scenarios).toHaveLength(3);
  });

  it("saveUserWorkspace sends the validated payload to save_workspace_snapshot and reloads", async () => {
    const { client, rpc } = fakeSupabase({ rows: toRows(fresh()) });
    const data = fresh();
    data.snapshot.materials[0].stock_on_hand = 9000;
    const saved = await saveUserWorkspace(client, BUSINESS_UUID, data);
    expect(rpc).toHaveBeenCalledWith("save_workspace_snapshot", { p_business_id: BUSINESS_UUID, p_payload: data });
    expect(saved.snapshot.business.id).toBe("dapur_sari");
  });

  it("saveUserWorkspace rejects removal of a core scenario before touching the database", async () => {
    const { client, rpc } = fakeSupabase({ rows: toRows(fresh()) });
    const data = fresh();
    data.scenarios = data.scenarios.filter((s) => s.id !== "mitigation");
    await expect(saveUserWorkspace(client, BUSINESS_UUID, data)).rejects.toThrow(WorkspaceValidationError);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("surfaces RPC failures as a safe Indonesian error without leaking internals", async () => {
    const { client } = fakeSupabase({
      rows: toRows(fresh()),
      rpc: () => ({ data: null, error: { message: 'duplicate key value violates unique constraint "x" at pg_internal.c:99' } }),
    });
    const err = await saveUserWorkspace(client, BUSINESS_UUID, fresh()).catch((e) => e);
    expect(err).toBeInstanceOf(WorkspaceRepoError);
    expect(err.message).not.toContain("pg_internal");
  });

  it("resetUserWorkspace calls ensure_workspace with p_reset=true", async () => {
    const { client, rpc } = fakeSupabase({ rows: toRows(fresh()) });
    const res = await resetUserWorkspace(client);
    expect(rpc).toHaveBeenCalledWith("ensure_workspace", { p_reset: true });
    expect(res.businessId).toBe(BUSINESS_UUID);
  });
});
