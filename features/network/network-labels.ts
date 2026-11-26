import type { NetworkEdge, NetworkKind, NetworkNode } from "@/lib/types";

export const kindLabel: Record<NetworkKind, string> = { supplier: "Pemasok", material: "Bahan", product: "Produk" };
export const statusLabel: Record<NetworkNode["status"], { label: string; tone: string }> = {
  active: { label: "Aktif", tone: "good" },
  inactive: { label: "Tidak aktif", tone: "neutral" },
  single_source: { label: "Satu pemasok", tone: "warning" },
  stock_only: { label: "Stok awal", tone: "neutral" },
  ready: { label: "Terpetakan", tone: "good" },
};
export const edgeLabel: Record<NetworkEdge["kind"], string> = {
  committed: "Pengiriman terjadwal",
  alternative: "Penawaran alternatif",
  bom: "Kebutuhan produksi",
};
