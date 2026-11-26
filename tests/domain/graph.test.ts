import { describe, expect, it } from "vitest";
import { buildSupplyNetwork } from "@/lib/domain/graph";
import { DAPUR_SARI_FALLBACK_FIXTURE } from "@/lib/domain/fixture";
import { solveScenario } from "@/lib/solver/milp-solver";

const fresh = () => structuredClone(DAPUR_SARI_FALLBACK_FIXTURE);
const node = (net: ReturnType<typeof buildSupplyNetwork>, id: string) => net.nodes.find((n) => n.id === id)!;

describe("buildSupplyNetwork", () => {
  it("builds supplier, material and product nodes in three deterministic columns", () => {
    const { snapshot } = fresh();
    const net = buildSupplyNetwork(snapshot);

    const ids = net.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(
      ["m:butter", "m:flour", "m:sugar", "p:bread", "p:cookies", "s:supplier_a", "s:supplier_b"].sort(),
    );
    for (const n of net.nodes) {
      const expectedX = n.kind === "supplier" ? 0 : n.kind === "material" ? 340 : 680;
      expect(n.position.x).toBe(expectedX);
    }
    // urutan vertikal mengikuti id naik
    expect(node(net, "m:butter").position.y).toBeLessThan(node(net, "m:flour").position.y);
    expect(buildSupplyNetwork(snapshot)).toEqual(net);
  });

  it("flags flour as single-supplier with a backup, and sugar/butter as stock_only", () => {
    const net = buildSupplyNetwork(fresh().snapshot);
    const flour = node(net, "m:flour");
    expect(flour.meta).toMatchObject({
      isSingleSupplier: true,
      hasBackupSupplier: true,
      supplyClassification: "single_supplier",
    });
    for (const id of ["m:sugar", "m:butter"]) {
      expect(node(net, id).meta).toMatchObject({ isSingleSupplier: false, supplyClassification: "stock_only" });
    }
  });

  it("links suppliers to materials (committed + alternative) and materials to products (BOM)", () => {
    const net = buildSupplyNetwork(fresh().snapshot);
    const committed = net.edges.find((e) => e.id === "e:delivery:supplier_a_flour_delivery")!;
    expect(committed).toMatchObject({ source: "s:supplier_a", target: "m:flour", kind: "committed" });
    const offer = net.edges.find((e) => e.id === "e:offer:supplier_b_flour_offer")!;
    expect(offer).toMatchObject({ source: "s:supplier_b", target: "m:flour", kind: "alternative" });
    const bom = net.edges.find((e) => e.id === "e:bom:bread:flour")!;
    expect(bom).toMatchObject({ source: "m:flour", target: "p:bread", kind: "bom" });
    expect(bom.label).toContain("250");
    expect(net.edges).toHaveLength(1 + 1 + 6);
  });

  it("marks products that depend on a single-supplier material", () => {
    const net = buildSupplyNetwork(fresh().snapshot);
    expect(node(net, "p:bread").meta).toMatchObject({ dependsOnSingleSupplier: true });
    expect(node(net, "p:cookies").meta).toMatchObject({ dependsOnSingleSupplier: true });
  });

  it("marks supplier_a edges disrupted and flour as bottleneck in the outage scenario", async () => {
    const { snapshot, scenarios } = fresh();
    const outage = scenarios.find((s) => s.id === "outage")!;
    const result = await solveScenario(snapshot, outage);
    const net = buildSupplyNetwork(snapshot, outage, result);

    expect(net.edges.find((e) => e.id === "e:delivery:supplier_a_flour_delivery")!.disrupted).toBe(true);
    expect(node(net, "s:supplier_a").meta).toMatchObject({ disrupted: true });
    expect(node(net, "m:flour").meta).toMatchObject({ isBottleneck: true });
    expect(node(net, "m:sugar").meta).toMatchObject({ isBottleneck: false });
  });

  it("does not mark anything disrupted in the baseline scenario", async () => {
    const { snapshot, scenarios } = fresh();
    const baseline = scenarios[0];
    const result = await solveScenario(snapshot, baseline);
    const net = buildSupplyNetwork(snapshot, baseline, result);
    expect(net.edges.some((e) => e.disrupted)).toBe(false);
    expect(net.nodes.some((n) => (n.meta as { isBottleneck?: boolean }).isBottleneck)).toBe(false);
  });

  it("treats a material with two committed suppliers as multi_supplier", () => {
    const mod = fresh();
    mod.snapshot.committed_deliveries.push({
      id: "supplier_b_flour_delivery",
      supplier_id: "supplier_b",
      material_id: "flour",
      quantity_base_units: 1000,
      arrival_date: "2026-11-23",
      enabled_in_baseline: true,
    });
    const flour = node(buildSupplyNetwork(mod.snapshot), "m:flour");
    expect(flour.meta).toMatchObject({ isSingleSupplier: false, supplyClassification: "multi_supplier" });
  });
});
