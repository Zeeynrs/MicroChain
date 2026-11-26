"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CulinarySlide {
  id: string;
  business: string;
  category: string;
  badge: string;
  badgeTone: "good" | "neutral";
  image: string;
  imageAlt: string;
  photoPosition: string;
  headline: string;
  disruption: string;
  mitigation: string;
  impact: string;
  ctaLabel: string;
  ctaHref: string;
}

const SLIDES: CulinarySlide[] = [
  {
    id: "dapur-sari",
    business: "Dapur Sari",
    category: "Toko roti & kue",
    badge: "Demo interaktif",
    badgeTone: "good",
    image: "/dapur-sari.webp",
    imageAlt: "Pembuat roti menata loyang roti di dapur produksi",
    photoPosition: "50% 42%",
    headline: "Pemasok tepung utama gagal kirim 25 kg menjelang produksi pagi.",
    disruption: "Tepung hanya tersisa 8 kg di rak; produksi terancam turun 53% menjadi Rp 210.000.",
    mitigation: "Aktifkan 12 pak Pemasok B (premi Rp 12.000) dan prioritaskan 30 Kue kering + 68 Roti.",
    impact: "Kontribusi bersih naik ke Rp 342.000 — memulihkan 55% kerugian gangguan.",
    ctaLabel: "Buka simulasi Dapur Sari",
    ctaHref: "/dashboard",
  },
  {
    id: "kedai-kopi",
    business: "Kedai Kopi Susu",
    category: "Minuman & kopi rumahan",
    badge: "Contoh skenario UMKM",
    badgeTone: "neutral",
    image: "/landing/carousel-kopi.webp",
    imageAlt: "Barista kedai kopi Indonesia menuang susu segar ke dalam es kopi susu gula aren di meja kayu",
    photoPosition: "50% 28%",
    headline: "Kiriman susu segar dan sirup gula aren terlambat dua hari.",
    disruption: "Menu kopi susu andalan terhenti sementara stok biji kopi dan gelas masih penuh.",
    mitigation: "Hitung batas pembelian susu UHT cadangan yang tetap menguntungkan setelah selisih harga.",
    impact: "Alokasi stok dialihkan ke menu margin tinggi tanpa over-order bahan cepat basi.",
    ctaLabel: "Buat skenario di workspace",
    ctaHref: "/login",
  },
  {
    id: "dimsum-beku",
    business: "Dapur Dimsum & Beku",
    category: "Camilan & makanan beku",
    badge: "Contoh skenario UMKM",
    badgeTone: "neutral",
    image: "/landing/carousel-dimsum.webp",
    imageAlt: "Kukusan bambu berisi dimsum dan siomay hangat di samping bahan kulit pangsit dan kotak kraft",
    photoPosition: "50% 14%",
    headline: "Pasokan udang kupas dan kulit pangsit menipis sebelum batch produksi.",
    disruption: "Pesanan paket reseller terancam tertunda karena bahan isian utama bergantung satu pemasok.",
    mitigation: "Optimalkan komposisi produksi dimsum ayam dan udang berdasarkan resep (BOM) & stok.",
    impact: "Target pengiriman paket grosir tetap terjaga sebelum tanggal batas (cutoff).",
    ctaLabel: "Buat skenario di workspace",
    ctaHref: "/login",
  },
  {
    id: "martabak-kue",
    business: "Martabak & Kue Tradisional",
    category: "Jajanan & pesanan akhir pekan",
    badge: "Contoh skenario UMKM",
    badgeTone: "neutral",
    image: "/landing/carousel-martabak.webp",
    imageAlt: "Martabak manis hangat bertabur coklat dan keju di papan kayu bersama mentega dan bahan adonan",
    photoPosition: "50% 42%",
    headline: "Permintaan akhir pekan melonjak saat stok mentega utama terbatas.",
    disruption: "Pembelian mentega eceran mendadak bisa menggerus margin bila jumlah paket tidak dihitung.",
    mitigation: "Simulasikan biaya premi mentega cadangan versus kontribusi tiap varian rasa.",
    impact: "Pemilik langsung tahu batas paket yang layak dibeli dan menu prioritas paling untung.",
    ctaLabel: "Buat skenario di workspace",
    ctaHref: "/login",
  },
];

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener?.("change", onChange);
  return () => mq.removeEventListener?.("change", onChange);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(REDUCED_QUERY).matches;
}

export function LandingCarousel() {
  const [index, setIndex] = useState(0);
  const prefersReduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );
  const [userAutoPlay, setUserAutoPlay] = useState<boolean | null>(null);
  const autoPlay = userAutoPlay ?? !prefersReduced;
  const [hovered, setHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!autoPlay || hovered) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [autoPlay, hovered]);

  const goPrev = () => setIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  const goNext = () => setIndex((prev) => (prev + 1) % SLIDES.length);

  return (
    <div
      className="carousel-shell"
      role="region"
      aria-roledescription="carousel"
      aria-label="Contoh penerapan MicroChain pada berbagai UMKM makanan"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          goPrev();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          goNext();
        }
      }}
    >
      <div className="carousel-toolbar">
        <div className="carousel-tabs" role="group" aria-label="Pilih jenis usaha UMKM">
          {SLIDES.map((slide, i) => {
            const active = i === index;
            return (
              <button
                key={slide.id}
                type="button"
                aria-pressed={active}
                aria-controls={`carousel-slide-${slide.id}`}
                className={`carousel-pill-tab ${active ? "is-active" : ""}`}
                onClick={() => setIndex(i)}
              >
                <span>{slide.business}</span>
                <small>{slide.category}</small>
              </button>
            );
          })}
        </div>

        <div className="carousel-controls">
          <span className="carousel-counter" aria-live="polite">
            {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            className="carousel-icon-btn"
            onClick={() => setUserAutoPlay(!autoPlay)}
            aria-pressed={!autoPlay}
            aria-label={autoPlay ? "Jeda putar otomatis carousel" : "Aktifkan putar otomatis carousel"}
          >
            {autoPlay ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="carousel-icon-btn"
            onClick={goPrev}
            aria-label="Slide sebelumnya"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="carousel-icon-btn"
            onClick={goNext}
            aria-label="Slide berikutnya"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        className="carousel-viewport"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          const end = e.changedTouches[0]?.clientX ?? null;
          touchStartX.current = null;
          if (start !== null && end !== null) {
            const delta = end - start;
            if (delta > 42) goPrev();
            else if (delta < -42) goNext();
          }
        }}
      >
        <div
          className="carousel-track"
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {SLIDES.map((slide, i) => (
            <article
              key={slide.id}
              id={`carousel-slide-${slide.id}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${i + 1} dari ${SLIDES.length}: ${slide.business}`}
              aria-hidden={i !== index}
              className="carousel-slide"
            >
              <figure className="carousel-media">
                <Image
                  src={slide.image}
                  alt={slide.imageAlt}
                  width={960}
                  height={720}
                  unoptimized
                  loading="eager"
                  className="carousel-photo"
                  style={{ objectPosition: slide.photoPosition }}
                />
                <figcaption className="carousel-media-tag">
                  <strong>{slide.business}</strong>
                  <span>{slide.category}</span>
                </figcaption>
              </figure>

              <div className="carousel-copy">
                <span className={`tag tag-${slide.badgeTone}`}>{slide.badge}</span>
                <h3>{slide.headline}</h3>

                <dl className="carousel-facts">
                  <div className="carousel-fact-row">
                    <dt>
                      <AlertTriangle size={14} aria-hidden="true" />
                      <span>Dampak gangguan</span>
                    </dt>
                    <dd>{slide.disruption}</dd>
                  </div>
                  <div className="carousel-fact-row">
                    <dt>
                      <ShieldCheck size={14} aria-hidden="true" />
                      <span>Langkah mitigasi</span>
                    </dt>
                    <dd>{slide.mitigation}</dd>
                  </div>
                  <div className="carousel-fact-row is-highlight">
                    <dt>
                      <TrendingUp size={14} aria-hidden="true" />
                      <span>Hasil keputusan</span>
                    </dt>
                    <dd>{slide.impact}</dd>
                  </div>
                </dl>

                <div className="carousel-slide-cta">
                  <Button asChild size="sm" variant={slide.badgeTone === "good" ? "default" : "outline"}>
                    <Link href={slide.ctaHref} tabIndex={i === index ? 0 : -1}>
                      {slide.ctaLabel} <ChevronRight size={15} aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="carousel-dots" aria-hidden="true">
        {SLIDES.map((slide, i) => (
          <span key={slide.id} className={`carousel-dot ${i === index ? "is-active" : ""}`} />
        ))}
      </div>
    </div>
  );
}
