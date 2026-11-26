"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { TourStep } from "./steps";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  steps: TourStep[];
  index: number;
  /** Awalan rute mode: "" untuk demo, "/workspace" untuk workspace. */
  base: string;
  onIndex: (next: number) => void;
  onClose: () => void;
}

const PAD = 6;
const GAP = 14;
const EDGE = 12;
const FIND_TIMEOUT_MS = 4000;
const MOBILE_MAX = 680;

const readRect = (el: Element): Rect | null => {
  const r = el.getBoundingClientRect();
  return r.width === 0 && r.height === 0 ? null : { top: r.top, left: r.left, width: r.width, height: r.height };
};

/**
 * Panduan interaktif (coach marks): menyorot elemen nyata dengan latar redup, memindahkan sorotan secara
 * beranimasi antar langkah, dan berpindah halaman bila langkah berikutnya ada di halaman lain.
 * Bila elemen tidak ditemukan (mis. tersembunyi di layar kecil), kartu tampil di tengah tanpa sorotan.
 */
export function CoachMarks({ steps, index, base, onIndex, onClose }: Props) {
  const router = useRouter();
  const pathname = usePathname().replace(/\/$/, "");
  const step = steps[index];
  const targetPath = `${base}${step.route}`;
  const key = `${index}|${pathname}`;

  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [measured, setMeasured] = useState<{ key: string; rect: Rect | null } | null>(null);
  const [card, setCard] = useState({ width: 340, height: 190 });
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));

  // Pindah halaman bila perlu, lalu cari elemen sasaran (menunggu halaman dan data selesai dimuat).
  useEffect(() => {
    if (pathname !== targetPath) {
      router.push(targetPath);
      return;
    }
    let cancelled = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;
    const started = performance.now();

    const find = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el && readRect(el)) {
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
        const update = () => {
          if (!cancelled) setMeasured({ key, rect: readRect(el) });
        };
        update();
        window.addEventListener("scroll", update, true);
        window.addEventListener("resize", update);
        cleanup = () => {
          window.removeEventListener("scroll", update, true);
          window.removeEventListener("resize", update);
        };
        return;
      }
      if (performance.now() - started > FIND_TIMEOUT_MS) {
        setMeasured({ key, rect: null });
        return;
      }
      frame = requestAnimationFrame(find);
    };
    frame = requestAnimationFrame(find);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, [index, pathname, targetPath, step.target, key, router]);

  // Ukuran kartu dan viewport untuk penempatan.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setCard({ width: el.offsetWidth, height: el.offsetHeight }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Fokus ke judul tiap langkah agar pembaca layar membacakan langkah baru.
  useEffect(() => {
    titleRef.current?.focus();
  }, [index]);

  const last = index === steps.length - 1;
  const next = () => (last ? onClose() : onIndex(index + 1));
  const back = () => onIndex(Math.max(0, index - 1));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") (last ? onClose : () => onIndex(index + 1))();
      else if (event.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, last, onClose, onIndex]);

  const ready = measured?.key === key;
  const rect = ready ? measured.rect : null;
  const mobile = viewport.width <= MOBILE_MAX;

  // Penempatan kartu.
  let cardStyle: React.CSSProperties;
  if (!rect) {
    cardStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else if (mobile) {
    const targetIsLow = rect.top + rect.height / 2 > viewport.height * 0.5;
    cardStyle = targetIsLow ? { top: 68, left: EDGE, right: EDGE } : { bottom: 96, left: EDGE, right: EDGE };
  } else {
    const below = viewport.height - (rect.top + rect.height);
    const above = rect.top;
    const right = viewport.width - (rect.left + rect.width);
    const left = rect.left;
    const fits = {
      right: right >= card.width + GAP + EDGE && rect.width < viewport.width * 0.45,
      bottom: below >= card.height + GAP + EDGE,
      top: above >= card.height + GAP + EDGE,
      left: left >= card.width + GAP + EDGE && rect.width < viewport.width * 0.45,
    };
    const order = [step.placement, "right", "bottom", "top", "left"] as const;
    const placement = order.find((p) => p && fits[p]) ?? "bottom";
    let x: number;
    let y: number;
    if (placement === "right") {
      x = rect.left + rect.width + GAP;
      y = rect.top + rect.height / 2 - card.height / 2;
    } else if (placement === "left") {
      x = rect.left - card.width - GAP;
      y = rect.top + rect.height / 2 - card.height / 2;
    } else {
      x = rect.left + rect.width / 2 - card.width / 2;
      y = placement === "bottom" ? rect.top + rect.height + GAP : rect.top - card.height - GAP;
    }
    cardStyle = {
      left: Math.max(EDGE, Math.min(x, viewport.width - card.width - EDGE)),
      top: Math.max(EDGE, Math.min(y, viewport.height - card.height - EDGE)),
    };
  }

  const percent = ((index + 1) / steps.length) * 100;

  return (
    <div className="tour" data-testid="coach-marks">
      <div className={`tour-shield${rect ? "" : " is-dim"}`} aria-hidden="true" />
      {rect && (
        <div
          className="tour-spot"
          data-testid="coach-spotlight"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
          aria-hidden="true"
        />
      )}
      <div
        ref={cardRef}
        className="tour-card"
        style={cardStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
        aria-busy={!ready}
      >
        <div className="tour-progress" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
        <div key={index} className="tour-card-body">
        <p className="tour-count">Langkah {index + 1} dari {steps.length}</p>
        <h2 id="tour-title" ref={titleRef} tabIndex={-1}>{step.title}</h2>
        <p id="tour-text">{step.text}</p>
        <div className="tour-actions">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Lewati</Button>
          <div className="tour-nav">
            <Button type="button" variant="outline" size="sm" onClick={back} disabled={index === 0}>Kembali</Button>
            <Button type="button" size="sm" onClick={next}>{last ? "Selesai" : "Berikutnya"}</Button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
