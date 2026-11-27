"use client";

import { useEffect, useRef, useState } from "react";

/*
 * The Dapur Sari solution space, drawn as points: every integer production plan (Roti 0 to 100,
 * Kue kering 0 to 30) is one point, its height the plan's net contribution. Plans that need more
 * flour than the scenario has fall to the floor; the solver's optimum is the one lime point.
 * Figures come from the demo's own model: 250 g flour and Rp 3.000 per Roti, 100 g and Rp 5.000
 * per Kue kering, demand 100 and 30.
 */

export type LatticeScenario = "normal" | "outage" | "mitigation";

const MAX_ROTI = 100;
const MAX_KUE = 30;
const FLOUR_ROTI_G = 250;
const FLOUR_KUE_G = 100;
const MARGIN_ROTI = 3_000;
const MARGIN_KUE = 5_000;
const BASELINE_NET = 450_000;
/* World shape: the Roti axis 2 wide, the Kue kering axis DEPTH deep, contribution LIFT tall. */
const DEPTH = 1.5;
const LIFT = 0.8;
const DROP = 0.28;

const SCENARIOS: Record<LatticeScenario, { flourG: number; premium: number }> = {
  normal: { flourG: 33_000, premium: 0 },
  outage: { flourG: 8_000, premium: 0 },
  mitigation: { flourG: 20_000, premium: 12_000 },
};

const STAGE_TO_SCENARIO: Record<string, LatticeScenario> = { "1": "normal", "2": "outage", "3": "mitigation" };

function optimumFor(scenario: LatticeScenario) {
  const { flourG, premium } = SCENARIOS[scenario];
  let best = { roti: 0, kue: 0, net: -Infinity };
  for (let k = 0; k <= MAX_KUE; k += 1) {
    for (let r = 0; r <= MAX_ROTI; r += 1) {
      if (r * FLOUR_ROTI_G + k * FLOUR_KUE_G > flourG) continue;
      const net = r * MARGIN_ROTI + k * MARGIN_KUE - premium;
      if (net > best.net) best = { roti: r, kue: k, net };
    }
  }
  return best;
}

const idr = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;
const kg = (grams: number) => `${(grams / 1000).toLocaleString("id-ID")} kg`;

/* Reads the theme's point and signal colours from the tokens and turns them into an RGB ramp. */
function readPalette(el: HTMLElement) {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  const probe = document.createElement("canvas");
  probe.width = 64;
  probe.height = 2;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const grad = ctx.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, v("--point-lo"));
  grad.addColorStop(0.55, v("--point-mid"));
  grad.addColorStop(1, v("--point-hi"));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 1);
  ctx.fillStyle = v("--color-accent");
  ctx.fillRect(0, 1, 64, 1);
  const data = ctx.getImageData(0, 0, 64, 2).data;
  const ramp: [number, number, number][] = [];
  for (let i = 0; i < 64; i += 1) ramp.push([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
  const o = 64 * 4;
  return { ramp, signal: [data[o], data[o + 1], data[o + 2]] as [number, number, number] };
}

interface Props {
  /** A fixed scenario, or */
  scenario?: LatticeScenario;
  /** a selector for an ancestor whose data-stage (1, 2, 3) picks the scenario as the page scrolls. */
  follow?: string;
  className?: string;
}

export function PlanLattice({ scenario: fixed = "mitigation", follow, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bestRef = useRef<HTMLDivElement>(null);
  const flourRef = useRef<HTMLDivElement>(null);
  const [scenario, setScenario] = useState<LatticeScenario>(fixed);
  const scenarioRef = useRef(scenario);

  /* Follow the pinned story's stage. */
  useEffect(() => {
    if (!follow) return;
    const host = wrapRef.current?.closest<HTMLElement>(follow);
    if (!host) return;
    const read = () => setScenario(STAGE_TO_SCENARIO[host.dataset.stage ?? "1"] ?? "normal");
    read();
    const mo = new MutationObserver(read);
    mo.observe(host, { attributes: true, attributeFilter: ["data-stage"] });
    return () => mo.disconnect();
  }, [follow]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    const palette = readPalette(wrap);
    if (!ctx || !palette) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const count = (MAX_ROTI + 1) * (MAX_KUE + 1);
    const heights = new Float32Array(count);
    const targets = new Float32Array(count);
    let current: LatticeScenario | null = null;
    let best = optimumFor(scenarioRef.current);

    const setTargets = (key: LatticeScenario, immediate: boolean) => {
      const { flourG, premium } = SCENARIOS[key];
      let i = 0;
      for (let k = 0; k <= MAX_KUE; k += 1) {
        for (let r = 0; r <= MAX_ROTI; r += 1) {
          const feasible = r * FLOUR_ROTI_G + k * FLOUR_KUE_G <= flourG;
          const net = r * MARGIN_ROTI + k * MARGIN_KUE - premium;
          targets[i] = feasible ? Math.max(0.02, net / BASELINE_NET) : 0;
          if (immediate) heights[i] = targets[i];
          i += 1;
        }
      }
      best = optimumFor(key);
      current = key;
    };
    setTargets(scenarioRef.current, true);

    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();

    let tiltX = 0;
    let tiltY = 0;
    let aimX = 0;
    let aimY = 0;
    const onPointer = (event: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      aimX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      aimY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onLeave = () => {
      aimX = 0;
      aimY = 0;
    };

    const project = (x: number, y: number, z: number, yaw: number, pitch: number) => {
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const xr = x * cy - z * sy;
      const zr = x * sy + z * cy;
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const yr = y * cp - zr * sp;
      const zz = y * sp + zr * cp;
      const dist = 3.6;
      const fit = Math.min(w * 0.4, h * 0.62) * dist;
      const s = fit / (dist + zz);
      return { sx: w / 2 + xr * s, sy: h * 0.54 - yr * s, depth: dist / (dist + zz) };
    };

    const draw = (time: number) => {
      const t = time / 1000;
      const yaw = (reduced ? -0.62 : Math.sin(t * ((2 * Math.PI) / 90)) * 0.38 - 0.62) + tiltX * 0.07;
      const pitch = 0.62 + tiltY * 0.035;
      const period = 7;
      const phase = reduced ? 0.55 : (t % period) / 2.4;
      const sweep = phase <= 1 ? -1.25 + phase * 2.5 : 9;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const { ramp, signal } = palette;
      let i = 0;
      for (let k = 0; k <= MAX_KUE; k += 1) {
        for (let r = 0; r <= MAX_ROTI; r += 1) {
          const height = heights[i];
          const x = (r / MAX_ROTI - 0.5) * 2;
          const z = (k / MAX_KUE - 0.5) * DEPTH;
          const p = project(x, height * LIFT - DROP, z, yaw, pitch);
          const lit = Math.max(0, 1 - Math.abs(x - sweep) / 0.09);
          const onFloor = height < 0.015;
          let level = onFloor ? 0.16 : 0.3 + height * 0.7;
          level = Math.min(1, level + lit * 0.6);
          const [cr, cg, cb] = ramp[Math.min(63, Math.round(level * 63))];
          const alpha = (onFloor ? 0.5 : 0.6 + height * 0.4) * Math.min(1, 0.35 + p.depth * 0.75) + lit * 0.3;
          const size = (onFloor ? 1.3 : 1.8) * p.depth + lit * 0.5;
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.min(1, alpha).toFixed(3)})`;
          ctx.fillRect(p.sx - size / 2, p.sy - size / 2, size, size);
          i += 1;
        }
      }

      /* The found plan, and the flour edge where the floor begins. */
      const bi = best.kue * (MAX_ROTI + 1) + best.roti;
      const bp = project((best.roti / MAX_ROTI - 0.5) * 2, heights[bi] * LIFT - DROP, (best.kue / MAX_KUE - 0.5) * DEPTH, yaw, pitch);
      ctx.fillStyle = `rgb(${signal[0]},${signal[1]},${signal[2]})`;
      for (let dk = -1; dk <= 0; dk += 1) {
        for (let dr = -2; dr <= 0; dr += 1) {
          const rr = best.roti + dr;
          const kk = best.kue + dk;
          if (rr < 0 || kk < 0) continue;
          const j = kk * (MAX_ROTI + 1) + rr;
          const q = project((rr / MAX_ROTI - 0.5) * 2, heights[j] * LIFT - DROP, (kk / MAX_KUE - 0.5) * DEPTH, yaw, pitch);
          ctx.fillRect(q.sx - 1.6, q.sy - 1.6, 3.2, 3.2);
        }
      }
      if (bestRef.current) bestRef.current.style.transform = `translate3d(${bp.sx.toFixed(1)}px, ${bp.sy.toFixed(1)}px, 0)`;

      const edgeR = Math.min(MAX_ROTI, Math.floor(SCENARIOS[current ?? "normal"].flourG / FLOUR_ROTI_G));
      const ep = project((edgeR / MAX_ROTI - 0.5) * 2, heights[edgeR] * LIFT - DROP, -DEPTH / 2, yaw, pitch);
      if (flourRef.current) flourRef.current.style.transform = `translate3d(${ep.sx.toFixed(1)}px, ${ep.sy.toFixed(1)}px, 0)`;
    };

    let raf = 0;
    let last = performance.now();
    let visible = true;
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (current !== scenarioRef.current) setTargets(scenarioRef.current, reduced);
      const ease = Math.min(1, dt * 3.2);
      for (let i = 0; i < count; i += 1) heights[i] += (targets[i] - heights[i]) * ease;
      tiltX += (aimX - tiltX) * Math.min(1, dt * 2);
      tiltY += (aimY - tiltY) * Math.min(1, dt * 2);
      draw(now);
      raf = visible ? requestAnimationFrame(step) : 0;
    };

    const start = () => {
      if (raf || reduced) return;
      last = performance.now();
      raf = requestAnimationFrame(step);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const ro = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    ro.observe(wrap);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (visible) start();
      else stop();
    });
    io.observe(wrap);

    /* Reduced motion: one still frame, the sweep stopped mid-scene; scenario changes redraw it. */
    if (reduced) {
      draw(0);
    } else {
      wrap.addEventListener("pointermove", onPointer);
      wrap.addEventListener("pointerleave", onLeave);
    }

    const redrawStill = () => {
      if (!reduced) return;
      setTargets(scenarioRef.current, true);
      draw(0);
    };
    wrap.addEventListener("lattice:scenario", redrawStill);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      wrap.removeEventListener("pointermove", onPointer);
      wrap.removeEventListener("pointerleave", onLeave);
      wrap.removeEventListener("lattice:scenario", redrawStill);
    };
  }, []);

  /* Under reduced motion the loop is off, so a scenario change asks for one more still frame. */
  useEffect(() => {
    scenarioRef.current = scenario;
    wrapRef.current?.dispatchEvent(new Event("lattice:scenario"));
  }, [scenario]);

  const best = optimumFor(scenario);
  const { flourG } = SCENARIOS[scenario];
  const summary = `Ruang solusi Dapur Sari: ${(MAX_ROTI + 1) * (MAX_KUE + 1)} rencana produksi bulat. Dengan tepung ${kg(flourG)}, rencana optimal ${best.roti} Roti dan ${best.kue} Kue kering, kontribusi bersih ${idr(best.net)}.`;

  return (
    <div ref={wrapRef} className={`lattice ${className ?? ""}`} role="img" aria-label={summary}>
      <canvas ref={canvasRef} className="lattice-canvas" aria-hidden="true" />
      <div ref={bestRef} className="lattice-callout is-found" aria-hidden="true">
        <span className="lattice-leader" />
        <span className="lattice-label">
          <span>Rencana optimal</span>
          <strong className="num">{idr(best.net)}</strong>
          <small>
            {best.roti} Roti, {best.kue} Kue kering
          </small>
        </span>
      </div>
      <div ref={flourRef} className="lattice-callout is-edge" aria-hidden="true">
        <span className="lattice-leader" />
        <span className="lattice-label">
          <span>Batas tepung</span>
          <strong className="num">
            {(flourG / 1000).toLocaleString("id-ID")}
            <span className="unit">kg</span>
          </strong>
        </span>
      </div>
    </div>
  );
}
