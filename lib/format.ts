import type { BaseUnit } from "./types";

const indonesia = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 });
const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const percentage = new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 2 });
const dateLabel = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const formatNumber = (amount: number) => indonesia.format(amount);
export const formatMoney = (amount: number | null) => amount === null ? "—" : rupiah.format(amount);
export const formatPercent = (amount: number | null) => amount === null ? "Tidak berlaku" : percentage.format(amount / 100);
export const formatDate = (isoDate: string) => dateLabel.format(new Date(isoDate));

export function formatQuantity(amount: number, unit: BaseUnit) {
  if (amount >= 1000 && (unit === "g" || unit === "ml")) {
    return `${formatNumber(amount / 1000)} ${unit === "g" ? "kg" : "l"}`;
  }
  return `${formatNumber(amount)} ${unit === "pcs" ? "buah" : unit}`;
}
