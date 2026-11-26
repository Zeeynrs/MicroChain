import { z } from "zod";
import type { WorkspaceSnapshot as Snapshot } from "@/lib/domain/types";

export const PARAMETER_MAX = 1_000_000;
const quantity = z.number({ error: "Masukkan jumlah." })
  .int("Gunakan bilangan bulat.")
  .min(0, "Jumlah minimum 0.")
  .max(PARAMETER_MAX, "Jumlah maksimum 1.000.000.");

export const parametersSchema = z.object({
  materials: z.array(quantity),
  products: z.array(quantity),
  offers: z.array(quantity),
});

export type Parameters = z.infer<typeof parametersSchema>;

export function currentParameters(snapshot: Snapshot): Parameters {
  return {
    materials: snapshot.materials.map(({ stock_on_hand }) => stock_on_hand),
    products: snapshot.products.map(({ demand_units }) => demand_units),
    offers: snapshot.alternative_offers.map(({ max_packs }) => max_packs),
  };
}

export function applyParameters(snapshot: Snapshot, values: Parameters): Snapshot {
  const materials = snapshot.materials.map((row, index) => row.stock_on_hand === values.materials[index]
    ? row : { ...row, stock_on_hand: values.materials[index] });
  const products = snapshot.products.map((row, index) => row.demand_units === values.products[index]
    ? row : { ...row, demand_units: values.products[index] });
  const alternative_offers = snapshot.alternative_offers.map((row, index) => row.max_packs === values.offers[index]
    ? row : { ...row, max_packs: values.offers[index] });
  const edited = materials.some((row, index) => row !== snapshot.materials[index])
    || products.some((row, index) => row !== snapshot.products[index])
    || alternative_offers.some((row, index) => row !== snapshot.alternative_offers[index]);
  return edited ? { ...snapshot, materials, products, alternative_offers } : snapshot;
}
