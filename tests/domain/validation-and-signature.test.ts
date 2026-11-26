import { describe, expect, it } from "vitest";
import { validateWorkspaceData } from "@/lib/domain/validation";
import { computeInputsSignature } from "@/lib/domain/signature";
import { DAPUR_SARI_FALLBACK_FIXTURE } from "@/lib/domain/fixture";

const fresh = () => structuredClone(DAPUR_SARI_FALLBACK_FIXTURE);
const sig = (d: ReturnType<typeof fresh>) =>
  computeInputsSignature(d.snapshot, d.scenarios);

describe("validateWorkspaceData", () => {
  it("accepts valid Dapur Sari canonical fixture", () => {
    const parsed = validateWorkspaceData(DAPUR_SARI_FALLBACK_FIXTURE);
    expect(parsed.snapshot.business.id).toBe("dapur_sari");
    expect(parsed.scenarios).toHaveLength(3);
  });

  it("rejects mismatched unit_kind and base_unit mirroring Postgres materials_check", () => {
    const bad = fresh();
    bad.snapshot.materials[0].unit_kind = "mass";
    bad.snapshot.materials[0].base_unit = "ml";
    expect(() => validateWorkspaceData(bad)).toThrow();
  });

  it("rejects dangling BOM product_id or material_id references", () => {
    const bad = fresh();
    bad.snapshot.bom[0].material_id = "unknown_material";
    expect(() => validateWorkspaceData(bad)).toThrow();
  });

  it("rejects quantity_per_product < 1, negative numbers and non-integers", () => {
    const zeroQty = fresh();
    zeroQty.snapshot.bom[0].quantity_per_product = 0;
    expect(() => validateWorkspaceData(zeroQty)).toThrow();

    const negStock = fresh();
    negStock.snapshot.materials[0].stock_on_hand = -1;
    expect(() => validateWorkspaceData(negStock)).toThrow();

    const fraction = fresh();
    fraction.snapshot.products[0].demand_units = 10.5;
    expect(() => validateWorkspaceData(fraction)).toThrow();
  });

  it("rejects values above Postgres integer CHECK limits and delay_days outside 0..365", () => {
    const tooBig = fresh();
    tooBig.snapshot.materials[0].stock_on_hand = 1_000_001;
    expect(() => validateWorkspaceData(tooBig)).toThrow();

    const badDelay = fresh();
    badDelay.scenarios[1].disruptions.push({
      type: "delay_delivery",
      delivery_id: "supplier_a_flour_delivery",
      delay_days: 366,
    });
    expect(() => validateWorkspaceData(badDelay)).toThrow();
  });

  it("rejects dangling references in deliveries, offers and scenarios", () => {
    const delivery = fresh();
    delivery.snapshot.committed_deliveries[0].supplier_id = "ghost";
    expect(() => validateWorkspaceData(delivery)).toThrow();

    const offer = fresh();
    offer.snapshot.alternative_offers[0].material_id = "ghost";
    expect(() => validateWorkspaceData(offer)).toThrow();

    const scenario = fresh();
    scenario.scenarios[1].disabled_supplier_ids = ["ghost"];
    expect(() => validateWorkspaceData(scenario)).toThrow();

    const disruption = fresh();
    disruption.scenarios[1].disruptions.push({
      type: "delay_delivery",
      delivery_id: "ghost",
      delay_days: 1,
    });
    expect(() => validateWorkspaceData(disruption)).toThrow();
  });

  it("rejects duplicate ids and missing core scenarios", () => {
    const dup = fresh();
    dup.snapshot.materials[1].id = dup.snapshot.materials[0].id;
    expect(() => validateWorkspaceData(dup)).toThrow();

    const missing = fresh();
    missing.scenarios = missing.scenarios.filter((s) => s.id !== "outage");
    expect(() => validateWorkspaceData(missing)).toThrow();
  });

  it("rejects malformed dates and invalid slugs", () => {
    const badDate = fresh();
    badDate.snapshot.business.planning_cutoff_date = "24-11-2026";
    expect(() => validateWorkspaceData(badDate)).toThrow();

    const badSlug = fresh();
    badSlug.snapshot.suppliers[0].id = "bad slug!";
    expect(() => validateWorkspaceData(badSlug)).toThrow();
  });
});

describe("computeInputsSignature", () => {
  it("produces identical signature regardless of array order", () => {
    const a = fresh();
    const b = fresh();
    b.snapshot.materials.reverse();
    b.snapshot.bom.reverse();
    b.snapshot.suppliers.reverse();
    b.scenarios.reverse();
    b.scenarios[0].disabled_supplier_ids.reverse();
    expect(sig(a)).toBe(sig(b));
  });

  it("changes signature when a delay_days disruption is added", () => {
    const base = sig(fresh());
    const modified = fresh();
    modified.scenarios[1].disruptions.push({
      type: "delay_delivery",
      delivery_id: "supplier_a_flour_delivery",
      delay_days: 2,
    });
    expect(sig(modified)).not.toBe(base);
  });

  it.each([
    ["stock", (d: ReturnType<typeof fresh>) => void (d.snapshot.materials[0].stock_on_hand += 1)],
    ["bom", (d: ReturnType<typeof fresh>) => void (d.snapshot.bom[0].quantity_per_product += 1)],
    ["arrival_date", (d: ReturnType<typeof fresh>) => void (d.snapshot.committed_deliveries[0].arrival_date = "2026-11-22")],
    ["lead_days", (d: ReturnType<typeof fresh>) => void (d.snapshot.alternative_offers[0].lead_days += 1)],
    ["cutoff_date", (d: ReturnType<typeof fresh>) => void (d.scenarios[2].cutoff_date = "2026-11-30")],
    ["disabled_supplier_ids", (d: ReturnType<typeof fresh>) => void (d.scenarios[2].disabled_supplier_ids = [])],
    ["enabled_offer_ids", (d: ReturnType<typeof fresh>) => void (d.scenarios[2].enabled_offer_ids = [])],
    ["overrides", (d: ReturnType<typeof fresh>) => void (d.scenarios[0].overrides = { demand_by_product: { bread: 50 } })],
  ])("changes signature when nested field %s changes", (_name, mutate) => {
    const base = sig(fresh());
    const d = fresh();
    mutate(d);
    expect(sig(d)).not.toBe(base);
  });

  it("is a deterministic hex string", () => {
    expect(sig(fresh())).toMatch(/^[0-9a-f]{64}$/);
    expect(sig(fresh())).toBe(sig(fresh()));
  });
});
