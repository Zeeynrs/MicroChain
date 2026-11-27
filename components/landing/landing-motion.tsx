"use client";

import { type ReactNode, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/* The three stages of the Dapur Sari outage, from the demo's own scenarios (normal, supplier A fails, supplier B active). */
const STAGE_VALUES: Record<string, number> = { "1": 450_000, "2": 210_000, "3": 342_000 };
const formatFigure = (value: number) => Math.round(value).toLocaleString("id-ID");

/*
 * All motion lives here and only runs when the browser allows it: no script, reduced motion or a
 * failed load leaves every element where the markup put it, fully visible.
 */
export function LandingMotion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    if (!registered) {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });
      registered = true;
    }

    const q = (selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector));
    const one = (selector: string) => root.querySelector<HTMLElement>(selector);
    const mm = gsap.matchMedia(root);

    mm.add(
      {
        isDesktop: "(min-width: 64rem)",
        isMobile: "(max-width: 63.99rem)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { isDesktop, reduceMotion } = context.conditions ?? {};

        const travel = isDesktop ? 24 : 16;
        const start = isDesktop ? "top 82%" : "top 92%";
        const once = { start, once: true, fastScrollEnd: true } as const;

        /* Reading progress under the nav. */
        const progress = reduceMotion ? null : one("[data-gsap='scroll-progress']");
        if (progress) {
          gsap.fromTo(progress, { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: root, start: "top top", end: "bottom bottom", scrub: 0.3 } });
        }

        /* 1. Hero: the head, the line and the actions fade up once. */
        if (!reduceMotion) gsap.from("[data-gsap='hero-item']", { y: 16, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", clearProps: "transform,opacity" });

        /* 2. The signature: the stage holds while the three steps pass; the figure recounts and the lattice follows data-stage. */
        const story = one("[data-story]");
        const figureEl = story?.querySelector<HTMLElement>("[data-story-figure]");
        if (story && figureEl) {
          const counter = { value: STAGE_VALUES["1"] };
          const setStage = (stage: string) => {
            if (story.dataset.stage === stage) return;
            story.dataset.stage = stage;
            if (reduceMotion) {
              counter.value = STAGE_VALUES[stage];
              figureEl.textContent = formatFigure(counter.value);
              return;
            }
            gsap.to(counter, {
              value: STAGE_VALUES[stage],
              duration: 1.1,
              ease: "power2.inOut",
              overwrite: true,
              onUpdate: () => {
                figureEl.textContent = formatFigure(counter.value);
              },
            });
          };

          q(".story-step").forEach((step) => {
            const stage = step.dataset.step ?? "1";
            ScrollTrigger.create({
              trigger: step,
              start: isDesktop ? "top 60%" : "top 70%",
              end: isDesktop ? "bottom 40%" : "bottom 30%",
              onToggle: (self) => {
                step.classList.toggle("is-current", self.isActive);
                if (self.isActive) setStage(stage);
              },
            });
          });
        }

        /* 3. Heads, panels and rows fade up once as they arrive. Reduced motion stops here, everything in place. */
        if (reduceMotion) return;
        q("[data-gsap='reveal-up'], [data-gsap='carousel'], [data-gsap='spotlight-row'], [data-gsap='secondary-card']").forEach((el) => {
          gsap.from(el, { y: travel, opacity: 0, duration: 0.8, ease: "power3.out", clearProps: "transform,opacity", scrollTrigger: { trigger: el, ...once } });
        });
        const preview = one(".preview-window");
        if (preview) {
          gsap.from(preview, { y: travel, opacity: 0, duration: 0.8, ease: "power3.out", clearProps: "transform,opacity", scrollTrigger: { trigger: preview, ...once } });
        }
      },
    );

    let refreshTimer: number | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    };
    const rafId = window.requestAnimationFrame(() => ScrollTrigger.refresh());
    window.addEventListener("load", scheduleRefresh);
    document.fonts?.ready?.then(scheduleRefresh).catch(() => {});

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      let lastHeight = root.offsetHeight;
      ro = new ResizeObserver(() => {
        const nextHeight = root.offsetHeight;
        if (Math.abs(nextHeight - lastHeight) > 8) {
          lastHeight = nextHeight;
          scheduleRefresh();
        }
      });
      ro.observe(root);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      window.removeEventListener("load", scheduleRefresh);
      ro?.disconnect();
      mm.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="landing">
      {children}
    </div>
  );
}
