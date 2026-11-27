"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Package,
  RotateCcw,
  ShieldCheck,
  Store,
  TrendingUp,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type ScenarioKey = "baseline" | "outage" | "mitigation";

interface ComputedScenario {
  id: ScenarioKey;
  tabLabel: string;
  badge: string;
  tone: "good" | "bad" | "warning";
  summary: string;
  netContribution: number;
  grossContribution: number;
  premiumCost: number;
  deltaLabel: string;
  flourAvailableKg: number;
  flourUsedKg: number;
  flourRemainingLabel: string;
  breadPlanned: number;
  breadDemand: number;
  cookiesPlanned: number;
  cookiesDemand: number;
  altPacksBought: number;
  altNote: string;
}

const DEFAULT_ALT_PACKS = 12;
const BASELINE_NET = 450_000;
const OUTAGE_NET = 210_000;
const OUTAGE_LOSS = BASELINE_NET - OUTAGE_NET;

const formatIdr = (value: number) => `Rp\u00A0${value.toLocaleString("id-ID")}`;

function computeMitigationScenario(maxPacks: number): ComputedScenario {
  const packsBought = Math.max(0, Math.min(15, Math.round(maxPacks)));
  const totalFlourG = 8_000 + packsBought * 1_000;
  const cookiesPlanned = 30;
  const remainingForBreadG = totalFlourG - cookiesPlanned * 100;
  const breadPlanned = Math.min(100, Math.floor(remainingForBreadG / 250));
  const flourUsedG = cookiesPlanned * 100 + breadPlanned * 250;
  const flourRemG = totalFlourG - flourUsedG;
  const grossContribution = cookiesPlanned * 5_000 + breadPlanned * 3_000;
  const premiumCost = packsBought * 1_000;
  const netContribution = grossContribution - premiumCost;
  const recoveredIdr = netContribution - OUTAGE_NET;
  const recoveredPct = Math.round((recoveredIdr / OUTAGE_LOSS) * 100);

  return {
    id: "mitigation",
    tabLabel: "Pemasok Alternatif Aktif",
    badge:
      packsBought === 0
        ? "Tanpa paket cadangan"
        : `Pulih ${recoveredPct}% dengan ${packsBought} pak Pemasok B`,
    tone: packsBought === 0 ? "bad" : "warning",
    summary:
      packsBought === 0
        ? "Kapasitas Pemasok B disetel 0 pak. Produksi kembali bergantung penuh pada 8 kg stok tepung dapur."
        : `Pemasok B mengirim ${packsBought} pak tepung (${packsBought} kg, lead time 1 hari) dengan premi ${formatIdr(premiumCost)}. Produksi Roti naik dari 20 ke ${breadPlanned} buah dan kontribusi pulih ${formatIdr(recoveredIdr)}.`,
    netContribution,
    grossContribution,
    premiumCost,
    deltaLabel:
      recoveredIdr > 0
        ? `Pulih +${formatIdr(recoveredIdr)} (${recoveredPct}% kerugian gangguan)`
        : "Belum ada pemulihan dari kondisi gangguan",
    flourAvailableKg: totalFlourG / 1000,
    flourUsedKg: flourUsedG / 1000,
    flourRemainingLabel: flourRemG === 0 ? "0 g" : `${flourRemG.toLocaleString("id-ID")} g`,
    breadPlanned,
    breadDemand: 100,
    cookiesPlanned,
    cookiesDemand: 30,
    altPacksBought: packsBought,
    altNote:
      packsBought === 0
        ? "Geser batas pak Pemasok B di atas untuk melihat pemulihan produksi dan kontribusi."
        : `Beli ${packsBought} pak × 1 kg dari Pemasok B (premi Rp 1.000/pak = ${formatIdr(premiumCost)}).`,
  };
}

const STATIC_SCENARIOS: Record<"baseline" | "outage", ComputedScenario> = {
  baseline: {
    id: "baseline",
    tabLabel: "Normal",
    badge: "Optimal, semua permintaan terpenuhi",
    tone: "good",
    summary:
      "Kiriman 25 kg tepung dari Pemasok A tiba tepat waktu sebelum batas produksi. Seluruh pesanan Roti dan Kue kering terpenuhi penuh.",
    netContribution: BASELINE_NET,
    grossContribution: BASELINE_NET,
    premiumCost: 0,
    deltaLabel: "Acuan target normal (100%)",
    flourAvailableKg: 33,
    flourUsedKg: 28,
    flourRemainingLabel: "5 kg",
    breadPlanned: 100,
    breadDemand: 100,
    cookiesPlanned: 30,
    cookiesDemand: 30,
    altPacksBought: 0,
    altNote: "Tidak perlu pembelian dari pemasok cadangan karena kiriman utama mencukupi.",
  },
  outage: {
    id: "outage",
    tabLabel: "Pemasok Utama Gagal",
    badge: "Terganggu, hanya memakai stok dapur",
    tone: "bad",
    summary:
      "Pemasok A gagal kirim 25 kg tepung. Dengan sisa 8 kg di rak, solver memprioritaskan 30 Kue kering (margin tertinggi per gram) dan 20 Roti.",
    netContribution: OUTAGE_NET,
    grossContribution: OUTAGE_NET,
    premiumCost: 0,
    deltaLabel: "Turun Rp 240.000 (-53%) dari normal",
    flourAvailableKg: 8,
    flourUsedKg: 8,
    flourRemainingLabel: "0 g",
    breadPlanned: 20,
    breadDemand: 100,
    cookiesPlanned: 30,
    cookiesDemand: 30,
    altPacksBought: 0,
    altNote: "80 buah Roti tidak dapat diproduksi tanpa pasokan cadangan.",
  },
};

export function LandingScenarioPreview() {
  const [activeId, setActiveId] = useState<ScenarioKey>("mitigation");
  const [altPacks, setAltPacks] = useState<number>(DEFAULT_ALT_PACKS);

  const mitigation = computeMitigationScenario(altPacks);
  const scenarios: ComputedScenario[] = [
    STATIC_SCENARIOS.baseline,
    STATIC_SCENARIOS.outage,
    mitigation,
  ];
  const active = scenarios.find((item) => item.id === activeId) ?? mitigation;
  const recoveredIdr = mitigation.netContribution - OUTAGE_NET;
  const recoveredPct = Math.round((recoveredIdr / OUTAGE_LOSS) * 100);

  const supplierADown = active.id !== "baseline";
  const supplierBActive = active.id === "mitigation" && altPacks > 0;

  return (
    <div className="preview-window" aria-label="Pratinjau simulasi Dapur Sari">
      <div className="preview-toolbar">
        <span className="preview-date-chip">Horizon 23 sampai 24 Nov 2026</span>
        <span className="preview-pill">Solver MILP</span>
      </div>

      <div className="preview-body">
        <div className="preview-tabs" role="tablist" aria-label="Pilih skenario simulasi Dapur Sari">
          {scenarios.map((item) => {
            const isSelected = item.id === active.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`preview-tab-${item.id}`}
                aria-selected={isSelected}
                aria-controls={`preview-panel-${item.id}`}
                className={`preview-tab ${isSelected ? "is-active" : ""}`}
                onClick={() => setActiveId(item.id)}
              >
                <span className="preview-tab-copy">
                  <strong>{item.tabLabel}</strong>
                  <small>{formatIdr(item.netContribution)}</small>
                </span>
              </button>
            );
          })}
        </div>

        <div className="preview-flow-bar" aria-label="Status alur pasokan pada skenario aktif">
          <div className={`flow-chip ${supplierADown ? "is-down" : "is-ok"}`}>
            <Truck size={14} aria-hidden="true" />
            <span>
              <strong>Pemasok A</strong>
              <small>{supplierADown ? "Gagal kirim 25 kg" : "Kirim 25 kg tepat waktu"}</small>
            </span>
          </div>

          <ArrowRight size={15} className="flow-arrow" aria-hidden="true" />

          <div className={`flow-chip ${supplierBActive ? "is-backup" : "is-idle"}`}>
            <ShieldCheck size={14} aria-hidden="true" />
            <span>
              <strong>Pemasok B (Cadangan)</strong>
              <small>
                {supplierBActive
                  ? `Aktif +${altPacks} kg (${altPacks} pak)`
                  : active.id === "mitigation"
                    ? "0 pak dipilih"
                    : "Belum diaktifkan"}
              </small>
            </span>
          </div>

          <ArrowRight size={15} className="flow-arrow" aria-hidden="true" />

          <div className={`flow-chip ${active.id === "outage" ? "is-warn" : "is-ok"}`}>
            <Package size={14} aria-hidden="true" />
            <span>
              <strong>Tepung terigu</strong>
              <small>Tersedia {active.flourAvailableKg} kg (stok 8 kg)</small>
            </span>
          </div>

          <ArrowRight size={15} className="flow-arrow" aria-hidden="true" />

          <div className="flow-chip is-output">
            <Store size={14} aria-hidden="true" />
            <span>
              <strong>Produksi optimal</strong>
              <small>{active.breadPlanned} Roti &amp; {active.cookiesPlanned} Kue kering</small>
            </span>
          </div>
        </div>

        <div
          id={`preview-panel-${active.id}`}
          role="tabpanel"
          aria-labelledby={`preview-tab-${active.id}`}
          className="preview-grid"
        >
          <div className="preview-main-card">
            <div className="preview-status-row">
              <span className={`tag tag-${active.tone}`}>
                {active.tone === "good" && <CheckCircle2 size={13} aria-hidden="true" />}
                {active.tone === "bad" && <AlertTriangle size={13} aria-hidden="true" />}
                {active.tone === "warning" && <ShieldCheck size={13} aria-hidden="true" />}
                <span>{active.badge}</span>
              </span>
              <span className="preview-delta">{active.deltaLabel}</span>
            </div>

            {active.id === "mitigation" && (
              <div className="preview-slider-box">
                <div className="preview-slider-head">
                  <label htmlFor="preview-packs-slider">
                    Simulasikan batas pak Pemasok B (1 kg/pak, premi Rp&nbsp;1.000)
                  </label>
                  <div className="preview-slider-meta">
                    <strong>{altPacks} pak</strong>
                    {altPacks !== DEFAULT_ALT_PACKS && (
                      <button
                        type="button"
                        className="preview-reset-btn"
                        onClick={() => setAltPacks(DEFAULT_ALT_PACKS)}
                      >
                        <RotateCcw size={12} aria-hidden="true" /> Reset
                      </button>
                    )}
                  </div>
                </div>
                <input
                  id="preview-packs-slider"
                  type="range"
                  min={0}
                  max={15}
                  step={1}
                  value={altPacks}
                  onChange={(event) => setAltPacks(Number(event.target.value))}
                  className="preview-range"
                />
                <div className="preview-range-scale" aria-hidden="true">
                  <span>0 pak</span>
                  <span>6 pak</span>
                  <span>12 pak (awal)</span>
                  <span>15 pak</span>
                </div>
              </div>
            )}

            <div className="preview-kpi-strip">
              <div>
                <span>Kontribusi bersih</span>
                <strong>{formatIdr(active.netContribution)}</strong>
              </div>
              <div>
                <span>Biaya premi cadangan</span>
                <strong>{formatIdr(active.premiumCost)}</strong>
              </div>
              <div>
                <span>Tepung terpakai / tersedia</span>
                <strong>
                  {active.flourUsedKg} kg / {active.flourAvailableKg} kg
                </strong>
              </div>
            </div>

            <p className="preview-summary">{active.summary}</p>

            <div className="preview-table-wrap">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th scope="col">Produk</th>
                    <th scope="col">Rencana</th>
                    <th scope="col">Permintaan</th>
                    <th scope="col">Pemenuhan</th>
                    <th scope="col">Kontribusi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Roti</th>
                    <td>{active.breadPlanned} buah</td>
                    <td>{active.breadDemand} buah</td>
                    <td>{Math.round((active.breadPlanned / active.breadDemand) * 100)}%</td>
                    <td>{formatIdr(active.breadPlanned * 3000)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Kue kering</th>
                    <td>{active.cookiesPlanned} buah</td>
                    <td>{active.cookiesDemand} buah</td>
                    <td>{Math.round((active.cookiesPlanned / active.cookiesDemand) * 100)}%</td>
                    <td>{formatIdr(active.cookiesPlanned * 5000)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="preview-alt-note">
              <TrendingUp size={15} aria-hidden="true" />
              <span>{active.altNote}</span>
            </p>
          </div>

          <aside className="preview-bars-card" aria-label="Perbandingan kontribusi bersih 3 skenario">
            <h3>Perbandingan 3 skenario</h3>
            <p className="muted">Dampak gangguan &amp; pemulihan bersih setelah biaya tambahan pasokan.</p>

            <div className="preview-bars">
              {scenarios.map((item) => {
                const pct = Math.round((item.netContribution / BASELINE_NET) * 100);
                const isSelected = item.id === active.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={`preview-bar-item ${isSelected ? "is-focused" : ""}`}
                  >
                    <div className="preview-bar-head">
                      <span>{item.tabLabel}</span>
                      <strong>{formatIdr(item.netContribution)}</strong>
                    </div>
                    <div className="preview-bar-track" aria-hidden="true">
                      <span
                        className={`preview-bar-fill tone-${item.tone}`}
                        style={{ transform: `scaleX(${pct / 100})` }}
                      />
                    </div>
                    <small>{pct}% dari target normal</small>
                  </button>
                );
              })}
            </div>

            <div className="preview-recovery-box">
              <span>Kontribusi dipulihkan lewat mitigasi</span>
              <strong>
                {recoveredIdr >= 0 ? `+${formatIdr(recoveredIdr)}` : formatIdr(recoveredIdr)}{" "}
                <em>({recoveredPct}% kerugian pulih)</em>
              </strong>
            </div>

            <Button asChild variant="outline" className="preview-cta">
              <Link href="/dashboard">
                Ubah stok &amp; resep di demo
              </Link>
            </Button>
          </aside>
        </div>
      </div>
    </div>
  );
}
