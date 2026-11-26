import { describe, expect, it } from "vitest";
import { solveScenario } from "@/lib/solver/milp-solver";
import { compareScenarios } from "@/lib/solver/compare";
import { DAPUR_SARI_FALLBACK_FIXTURE } from "@/lib/domain/fixture";

const fresh = () => structuredClone(DAPUR_SARI_FALLBACK_FIXTURE);

describe("solveScenario & compareScenarios (Dapur Sari)", () => {
  it("solves baseline, outage, and mitigation deterministically with exact IDR figures", async () => {
    const { snapshot, scenarios } = fresh();
    const { results, comparison } = await compareScenarios(snapshot, scenarios);

    const baseline = results.find((r) => r.scenario_id === "baseline")!;
    const outage = results.find((r) => r.scenario_id === "outage")!;
    const mitigation = results.find((r) => r.scenario_id === "mitigation")!;

    expect(baseline.status).toBe("Optimal");
    expect(baseline.net_contribution_idr).toBe(450_000);
    expect(outage.net_contribution_idr).toBe(210_000);
    expect(mitigation.alternative_premium_idr).toBe(12_000);
    expect(mitigation.gross_contribution_idr).toBe(354_000);
    expect(mitigation.net_contribution_idr).toBe(342_000);

    const units = (r: typeof baseline, id: string) => r.production.find((p) => p.product_id === id)!.units;
    expect(units(baseline, "bread")).toBe(100);
    expect(units(baseline, "cookies")).toBe(30);
    expect(units(outage, "bread")).toBe(20);
    expect(units(outage, "cookies")).toBe(30);
    expect(units(mitigation, "bread")).toBe(68);
    expect(mitigation.alternative_purchases[0].packs_bought).toBe(12);

    const flourLeft = (r: typeof baseline) => r.material_usage.find((m) => m.material_id === "flour")!.remaining;
    expect(flourLeft(baseline)).toBe(5_000);
    expect(flourLeft(outage)).toBe(0);
    expect(outage.bottleneck_material_ids).toContain("flour");

    expect(comparison.loss_idr).toBe(240_000);
    expect(comparison.loss_pct_of_baseline).toBeCloseTo(53.333333, 5);
    expect(comparison.recovered_idr).toBe(132_000);
    expect(comparison.recovered_pct_of_loss).toBeCloseTo(55, 5);
    expect(comparison.recovered_pct_of_baseline).toBeCloseTo(76, 5);
  });

  it("is deterministic regardless of entity order in the snapshot", async () => {
    const a = fresh();
    const b = fresh();
    b.snapshot.materials.reverse();
    b.snapshot.products.reverse();
    b.snapshot.bom.reverse();
    const ra = await compareScenarios(a.snapshot, a.scenarios);
    const rb = await compareScenarios(b.snapshot, b.scenarios);
    expect(rb.results).toEqual(ra.results);
  });

  it("excludes alternative offers whose lead_days exceed cutoff_date", async () => {
    const mod = fresh();
    mod.snapshot.alternative_offers[0].lead_days = 3; // 2026-11-23 + 3 = 2026-11-26 > 2026-11-24
    const mitigation = mod.scenarios.find((s) => s.id === "mitigation")!;
    const res = await solveScenario(mod.snapshot, mitigation);
    expect(res.net_contribution_idr).toBe(210_000);
    expect(res.alternative_purchases[0].eligible).toBe(false);
    expect(res.alternative_purchases[0].effective_max_packs).toBe(0);
    expect(res.alternative_purchases[0].packs_bought).toBe(0);
    expect(res.alternative_purchases[0].reason).toContain("2026-11-26");
  });

  it("excludes committed deliveries delayed past cutoff_date via delay_delivery disruption", async () => {
    const mod = fresh();
    const baseline = structuredClone(mod.scenarios[0]);
    baseline.disruptions = [
      { type: "delay_delivery", delivery_id: "supplier_a_flour_delivery", delay_days: 5 },
    ];
    const res = await solveScenario(mod.snapshot, baseline);
    expect(res.net_contribution_idr).toBe(210_000);
    expect(res.delivery_statuses[0].counted).toBe(false);
    expect(res.delivery_statuses[0].effective_arrival).toBe("2026-11-28");
    expect(res.delivery_statuses[0].reason).toBeTruthy();
  });

  it("counts a delayed delivery that still arrives on or before cutoff_date", async () => {
    const mod = fresh();
    mod.snapshot.committed_deliveries[0].arrival_date = "2026-11-22";
    const baseline = structuredClone(mod.scenarios[0]);
    baseline.disruptions = [
      { type: "delay_delivery", delivery_id: "supplier_a_flour_delivery", delay_days: 2 },
    ];
    const res = await solveScenario(mod.snapshot, baseline);
    expect(res.delivery_statuses[0].counted).toBe(true);
    expect(res.net_contribution_idr).toBe(450_000);
  });

  it("does not count deliveries of inactive suppliers or disabled in baseline", async () => {
    const inactive = fresh();
    inactive.snapshot.suppliers[0].active = false;
    const r1 = await solveScenario(inactive.snapshot, inactive.scenarios[0]);
    expect(r1.net_contribution_idr).toBe(210_000);
    expect(r1.delivery_statuses[0].reason).toBe("Pemasok dinonaktifkan");

    const disabled = fresh();
    disabled.snapshot.committed_deliveries[0].enabled_in_baseline = false;
    const r2 = await solveScenario(disabled.snapshot, disabled.scenarios[0]);
    expect(r2.net_contribution_idr).toBe(210_000);
    expect(r2.delivery_statuses[0].reason).toBe("Nonaktif di baseline");
  });

  it("does not over-buy 0-premium alternative packs beyond production needs", async () => {
    const mod = fresh();
    mod.snapshot.alternative_offers[0].incremental_premium_idr_per_pack = 0;
    mod.snapshot.alternative_offers[0].max_packs = 50; // kebutuhan maksimum: 28.000 g - 8.000 g stok = 20 pak
    const mitigation = mod.scenarios.find((s) => s.id === "mitigation")!;
    const res = await solveScenario(mod.snapshot, mitigation);
    expect(res.net_contribution_idr).toBe(450_000);
    expect(res.alternative_purchases[0].packs_bought).toBe(20);
    expect(res.alternative_premium_idr).toBe(0);
  });

  it("respects offer gating flags (enabled_in_scenario, enabled_offer_ids, inactive supplier)", async () => {
    const globalOff = fresh();
    globalOff.snapshot.alternative_offers[0].enabled_in_scenario = false;
    const r1 = await solveScenario(globalOff.snapshot, globalOff.scenarios[2]);
    expect(r1.alternative_purchases[0].reason).toBe("Dinonaktifkan di Data Usaha");
    expect(r1.net_contribution_idr).toBe(210_000);

    const notEnabled = fresh();
    notEnabled.scenarios[2].enabled_offer_ids = [];
    const r2 = await solveScenario(notEnabled.snapshot, notEnabled.scenarios[2]);
    expect(r2.alternative_purchases[0].eligible).toBe(false);
    expect(r2.net_contribution_idr).toBe(210_000);

    const supplierOff = fresh();
    supplierOff.scenarios[2].disabled_supplier_ids = ["supplier_a", "supplier_b"];
    const r3 = await solveScenario(supplierOff.snapshot, supplierOff.scenarios[2]);
    expect(r3.alternative_purchases[0].reason).toBe("Pemasok dinonaktifkan");
    expect(r3.net_contribution_idr).toBe(210_000);
  });

  it("applies stock and demand overrides", async () => {
    const mod = fresh();
    const sc = structuredClone(mod.scenarios[0]);
    sc.overrides = { stock_by_material: { flour: 0 }, demand_by_product: { bread: 10 } };
    sc.disabled_supplier_ids = ["supplier_a"];
    const res = await solveScenario(mod.snapshot, sc);
    // tepung 0 -> tidak ada produksi
    expect(res.net_contribution_idr).toBe(0);

    sc.overrides = { demand_by_product: { bread: 10, cookies: 0 } };
    sc.disabled_supplier_ids = [];
    const res2 = await solveScenario(mod.snapshot, sc);
    expect(res2.net_contribution_idr).toBe(30_000);
  });

  it("avoids NaN/Infinity when baseline and outage have 0 loss", async () => {
    const mod = fresh();
    mod.snapshot.materials[0].stock_on_hand = 40_000; // cukup tanpa pengiriman
    const { comparison } = await compareScenarios(mod.snapshot, mod.scenarios);
    expect(Number.isFinite(comparison.recovered_pct_of_loss)).toBe(true);
    expect(comparison.loss_idr).toBe(0);
    for (const v of Object.values(comparison)) expect(Number.isFinite(v)).toBe(true);
  });

  it("avoids NaN/Infinity when baseline contribution is 0", async () => {
    const mod = fresh();
    mod.snapshot.products.forEach((p) => (p.demand_units = 0));
    const { comparison } = await compareScenarios(mod.snapshot, mod.scenarios);
    expect(comparison.baseline_net_idr).toBe(0);
    for (const v of Object.values(comparison)) expect(Number.isFinite(v)).toBe(true);
    expect(comparison.recovered_pct_of_baseline).toBe(0);
  });

  it("handles a snapshot without products or materials", async () => {
    const mod = fresh();
    mod.snapshot.products = [];
    mod.snapshot.bom = [];
    const res = await solveScenario(mod.snapshot, mod.scenarios[0]);
    expect(res.status).toBe("Optimal");
    expect(res.net_contribution_idr).toBe(0);
  });
});
