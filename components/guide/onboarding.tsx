"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChartNoAxesColumnIncreasing, ChevronLeft, ChevronRight, Database, FlaskConical, Network, Sparkles } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { Mode } from "@/lib/workspace-context";
import { INTRO_SLIDES, type IntroSlide } from "./steps";

const FALLBACK_ICONS: Record<string, ReactNode> = {
  peta: <Network size={56} strokeWidth={1.4} aria-hidden="true" />,
  gangguan: <FlaskConical size={56} strokeWidth={1.4} aria-hidden="true" />,
  bandingkan: <ChartNoAxesColumnIncreasing size={56} strokeWidth={1.4} aria-hidden="true" />,
  mulai: <Database size={56} strokeWidth={1.4} aria-hidden="true" />,
};

const SWIPE_PX = 48;

interface Props {
  mode: Mode;
  /** `startTour` true bila pengguna memilih panduan interaktif di slide terakhir. */
  onFinish: (startTour: boolean) => void;
  onSkip: () => void;
}

function SlideImage({ slide, priority }: { slide: IntroSlide; priority: boolean }) {
  // Bila berkas gambar belum ada atau gagal dimuat, tampilkan panel ikon agar layar tetap utuh.
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="onboard-fallback" role="img" aria-label={slide.imageAlt}>
        {FALLBACK_ICONS[slide.id]}
      </div>
    );
  }
  return (
    <Image
      src={slide.image}
      alt={slide.imageAlt}
      width={1200}
      height={900}
      unoptimized
      priority={priority}
      className="onboard-image"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Layar pengantar: 4 slide dengan ilustrasi WebP, titik kemajuan, geser/tombol navigasi, dan pilihan
 * memulai panduan interaktif di slide terakhir. Dialog modal dengan fokus terkunci dan tombol Escape untuk melewati.
 */
export function Onboarding({ mode, onFinish, onSkip }: Props) {
  const [index, setIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const startX = useRef<number | null>(null);
  const last = INTRO_SLIDES.length - 1;
  const slide = INTRO_SLIDES[index];

  const go = (next: number) => setIndex(Math.max(0, Math.min(last, next)));

  // Fokus ke judul tiap pindah slide; kunci gulir halaman di belakang.
  useEffect(() => {
    titleRef.current?.focus();
  }, [index]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onSkip();
    } else if (event.key === "ArrowRight") go(index + 1);
    else if (event.key === "ArrowLeft") go(index - 1);
    else if (event.key === "Tab") {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), [href], [tabindex]:not([tabindex='-1'])");
      if (!focusable?.length) return;
      const first = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div className="onboard-backdrop">
      <div
        ref={dialogRef}
        className="onboard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboard-title"
        aria-describedby="onboard-text"
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          startX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (startX.current === null) return;
          const delta = event.clientX - startX.current;
          startX.current = null;
          if (Math.abs(delta) >= SWIPE_PX) go(index + (delta < 0 ? 1 : -1));
        }}
      >
        <div className="onboard-media">
          <div className="onboard-track" style={{ transform: `translateX(-${index * 100}%)` }}>
            {INTRO_SLIDES.map((item, i) => (
              <div className="onboard-frame" key={item.id} aria-hidden={i !== index}>
                <SlideImage slide={item} priority={i === 0} />
              </div>
            ))}
          </div>
        </div>

        <div className="onboard-body">
          <p className="onboard-step">Langkah {index + 1} dari {INTRO_SLIDES.length}</p>
          <div key={slide.id} className="onboard-copy">
            <h2 id="onboard-title" ref={titleRef} tabIndex={-1}>{slide.titleByMode?.[mode] ?? slide.title}</h2>
            <p id="onboard-text">{slide.textByMode?.[mode] ?? slide.text}</p>
          </div>

          <div className="onboard-dots" role="group" aria-label="Pilih langkah">
            {INTRO_SLIDES.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className="onboard-dot"
                aria-label={`Langkah ${i + 1}: ${item.title}`}
                aria-current={i === index ? "step" : undefined}
                onClick={() => go(i)}
              />
            ))}
          </div>

          <div className="onboard-actions">
            {index < last ? (
              <>
                <Button type="button" variant="ghost" onClick={onSkip}>Lewati</Button>
                <div className="onboard-nav">
                  <Button type="button" variant="outline" aria-label="Sebelumnya" disabled={index === 0} onClick={() => go(index - 1)}><ChevronLeft size={18} aria-hidden="true" /></Button>
                  <Button type="button" onClick={() => go(index + 1)}>Berikutnya <ChevronRight size={18} aria-hidden="true" /></Button>
                </div>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => onFinish(false)}>Langsung Pakai</Button>
                <Button type="button" onClick={() => onFinish(true)}><Sparkles size={17} aria-hidden="true" /> Mulai Panduan Interaktif</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
