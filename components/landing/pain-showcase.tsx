"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

type PainVisualKey =
  | "single-source"
  | "priority-mix"
  | "premium-tradeoff"
  | "cutoff-timeline";

interface PainItem {
  id: PainVisualKey;
  tone: "bad" | "warning" | "good";
  risk: string;
  stageLabel: string;
  question: string;
  answer: string;
  takeaway: string;
}

const PAIN_ITEMS: PainItem[] = [
  {
    id: "single-source",
    tone: "bad",
    risk: "Risiko sumber tunggal",
    stageLabel: "Peta ketergantungan bahan",
    question: "Bahan mana yang cuma bergantung pada satu pemasok?",
    answer:
      "Banyak dapur UMKM baru sadar saat truk terlambat bahwa satu bahan utama menghentikan hampir semua menu unggulan.",
    takeaway:
      "MicroChain menandai bahan sumber tunggal otomatis sebelum kiriman terganggu.",
  },
  {
    id: "priority-mix",
    tone: "warning",
    risk: "Prioritas produksi meleset",
    stageLabel: "Alokasi sisa stok 8 kg",
    question: "Dengan sisa stok di rak, produk mana yang paling untung dibuat dulu?",
    answer:
      "Saat tepung terbatas, membagi bahan secara kira-kira membuat margin harian anjlok. Prioritas produksi perlu dihitung dari kontribusi per gram.",
    takeaway:
      "Solver memprioritaskan Kue kering (Rp 50 rb/kg) dulu agar kontribusi naik +Rp 114 rb.",
  },
  {
    id: "premium-tradeoff",
    tone: "good",
    risk: "Premi menggerus margin",
    stageLabel: "Hitung batas paket cadangan",
    question: "Apakah beli dari pemasok cadangan yang lebih mahal tetap untung?",
    answer:
      "Pemasok alternatif sering punya harga lebih tinggi dan batas paket. MicroChain menghitung berapa paket yang layak dibeli setelah biaya premi.",
    takeaway:
      "Aktivasi 12 pak Pemasok B memulihkan +Rp 132.000 kontribusi bersih setelah premi.",
  },
  {
    id: "cutoff-timeline",
    tone: "warning",
    risk: "Kiriman lewat batas waktu",
    stageLabel: "Saring jadwal vs tanggal batas",
    question: "Apakah kiriman cadangan sempat datang sebelum batas produksi?",
    answer:
      "Lead time 1 hari vs 3 hari mengubah kelayakan pasokan. Sistem otomatis menyaring kiriman yang melewati tanggal batas perencanaan.",
    takeaway:
      "Hanya kiriman tiba sebelum cutoff H+2 yang masuk ke rencana produksi.",
  },
];

function SingleSourceVisual() {
  return (
    <div className="pv-scene pv-graph" aria-hidden="true">
      <div className="pv-graph-col">
        <div className="pv-node is-danger">
          <span className="pv-node-dot" />
          <div>
            <strong>Pemasok A</strong>
            <small>Gagal kirim 25 kg</small>
          </div>
        </div>
      </div>

      <div className="pv-link is-broken">
        <span className="pv-link-line" />
        <span className="pv-link-badge">
          <X size={11} strokeWidth={2.6} />
        </span>
      </div>

      <div className="pv-graph-col">
        <div className="pv-node is-warning">
          <span className="pv-node-dot" />
          <div>
            <strong>Tepung terigu</strong>
            <small>1 pemasok, sisa 8 kg</small>
          </div>
        </div>
      </div>

      <div className="pv-link is-branch">
        <svg viewBox="0 0 28 72" fill="none" className="pv-branch-svg" aria-hidden="true">
          <path d="M0 36 C14 36, 12 16, 28 16" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
          <path d="M0 36 C14 36, 12 56, 28 56" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
        </svg>
      </div>

      <div className="pv-graph-col pv-graph-outputs">
        <div className="pv-node is-affected">
          <strong>Roti</strong>
          <small>Terdampak</small>
        </div>
        <div className="pv-node is-affected">
          <strong>Kue kering</strong>
          <small>Terdampak</small>
        </div>
      </div>
    </div>
  );
}

function PriorityMixVisual() {
  return (
    <div className="pv-scene pv-card-ui" aria-hidden="true">
      <div className="pv-ui-head">
        <span>Sisa stok rak: <strong>8 kg tepung</strong></span>
        <span className="pv-pill is-good">Prioritas margin/kg</span>
      </div>

      <div className="pv-bars">
        <div className="pv-bar-row">
          <div className="pv-bar-meta">
            <span><strong>Kue kering</strong>, Rp 50 rb/kg</span>
            <strong>30 unit (#1)</strong>
          </div>
          <div className="pv-bar-track">
            <span className="pv-bar-fill is-primary" style={{ width: "92%" }} />
          </div>
        </div>

        <div className="pv-bar-row">
          <div className="pv-bar-meta">
            <span><strong>Roti</strong>, Rp 12 rb/kg</span>
            <span>20 unit (sisa)</span>
          </div>
          <div className="pv-bar-track">
            <span className="pv-bar-fill is-secondary" style={{ width: "36%" }} />
          </div>
        </div>
      </div>

      <div className="pv-compare-strip">
        <span className="pv-compare-muted">Fokus Roti dulu: Rp 96 rb</span>
        <span className="pv-compare-good">Optimal: Rp 210 rb (+Rp 114 rb)</span>
      </div>
    </div>
  );
}

function PremiumTradeoffVisual() {
  return (
    <div className="pv-scene pv-card-ui" aria-hidden="true">
      <div className="pv-ui-head">
        <span>Aktivasi <strong>Pemasok B</strong></span>
        <span className="pv-pill is-neutral">12 pak × 1 kg</span>
      </div>

      <div className="pv-ledger">
        <div className="pv-ledger-row">
          <span>Tambahan kontribusi menu</span>
          <div className="pv-mini-track">
            <span className="pv-mini-fill is-good" style={{ width: "100%" }} />
          </div>
          <strong className="pv-val-good">+Rp 144 rb</strong>
        </div>

        <div className="pv-ledger-row">
          <span>Biaya premi cadangan</span>
          <div className="pv-mini-track">
            <span className="pv-mini-fill is-danger" style={{ width: "16%" }} />
          </div>
          <strong className="pv-val-bad">-Rp 12 rb</strong>
        </div>
      </div>

      <div className="pv-net-box">
        <span className="pv-net-label">
          <Check size={13} strokeWidth={2.5} />
          Layak dibeli, pulih bersih
        </span>
        <strong>+Rp 132.000</strong>
      </div>
    </div>
  );
}

function CutoffTimelineVisual() {
  return (
    <div className="pv-scene pv-timeline-ui" aria-hidden="true">
      <div className="pv-tl-cards">
        <div className="pv-tl-chip is-good">
          <span className="pv-tl-badge"><Check size={11} strokeWidth={2.6} /></span>
          <div>
            <strong>Pemasok B</strong>
            <small>Tiba H+1, dipakai</small>
          </div>
        </div>

        <div className="pv-tl-chip is-bad">
          <span className="pv-tl-badge"><X size={11} strokeWidth={2.6} /></span>
          <div>
            <strong>Pemasok C</strong>
            <small>Tiba H+3, disaring</small>
          </div>
        </div>
      </div>

      <div className="pv-tl-axis">
        <span className="pv-tl-line-ok" />
        <span className="pv-tl-line-late" />
        <span className="pv-tl-cutoff">
          <span>Batas H+2</span>
        </span>
        <div className="pv-tl-stops">
          <span><i className="is-now" />H+0</span>
          <span><i className="is-ok" />H+1</span>
          <span className="is-cut-label"><i className="is-cut" />Cutoff</span>
          <span><i className="is-late" />H+3</span>
        </div>
      </div>
    </div>
  );
}

function renderVisual(kind: PainVisualKey) {
  switch (kind) {
    case "single-source":
      return <SingleSourceVisual />;
    case "priority-mix":
      return <PriorityMixVisual />;
    case "premium-tradeoff":
      return <PremiumTradeoffVisual />;
    case "cutoff-timeline":
      return <CutoffTimelineVisual />;
  }
}

export function LandingPainShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const current = PAIN_ITEMS[activeIndex] ?? PAIN_ITEMS[0];

  return (
    <div className="pain-layout">
      <div className="pain-sticky" data-gsap="reveal-up">
        <h2 id="masalah-title">Keputusan dapur saat pasokan macet jangan lagi pakai kira-kira.</h2>
        <p className="lead">
          Bisa membuat makanan enak saja tidak cukup ketika satu bahan utama terlambat datang. Pilih poin di samping untuk melihat gambaran perhitungannya.
        </p>

        <div className="pain-stage-frame" aria-live="polite">
          <div className="pain-stage-bar">
            <span className={`tag tag-${current.tone}`}>{current.stageLabel}</span>
            <span className="pain-stage-counter">
              Gambaran {activeIndex + 1} dari {PAIN_ITEMS.length}
            </span>
          </div>
          <div className="pain-stage-canvas" key={current.id}>
            {renderVisual(current.id)}
          </div>
          <p className="pain-stage-note">{current.takeaway}</p>
        </div>
      </div>

      <div className="pain-list" role="group" aria-label="Daftar tantangan pasokan UMKM makanan">
        {PAIN_ITEMS.map((item, idx) => {
          const isActive = idx === activeIndex;
          return (
            <article
              key={item.id}
              className={`pain-list-item ${isActive ? "is-active" : ""}`}
              data-gsap="pain-row"
            >
              <button
                type="button"
                className="pain-list-trigger"
                aria-pressed={isActive}
                onClick={() => setActiveIndex(idx)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
                <span className={`tag tag-${item.tone}`}>{item.risk}</span>
              </button>

              {isActive ? (
                <div className="pain-inline-stage">
                  <div className="pain-stage-canvas">
                    {renderVisual(item.id)}
                  </div>
                  <p className="pain-stage-note">{item.takeaway}</p>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
