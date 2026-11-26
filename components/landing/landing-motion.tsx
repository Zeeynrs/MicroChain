"use client";

import { type ReactNode, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

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

    const mm = gsap.matchMedia(root);

    mm.add(
      {
        isDesktop: "(min-width: 769px)",
        isMobile: "(max-width: 768px)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { isDesktop, reduceMotion } = context.conditions ?? {};
        if (reduceMotion) return;

        const travel = isDesktop ? 26 : 16;
        const duration = isDesktop ? 0.72 : 0.48;
        const triggerStart = isDesktop ? "top 86%" : "top 96%";

        // Top scroll progress bar under sticky header
        const progressEl = root.querySelector<HTMLElement>("[data-gsap='scroll-progress']");
        if (progressEl) {
          gsap.fromTo(
            progressEl,
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: "none",
              scrollTrigger: {
                trigger: root,
                start: "top top",
                end: "bottom bottom",
                scrub: 0.2,
              },
            },
          );
        }

        // 1. Hero opening timeline
        const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
        heroTl.from("[data-gsap='hero-item']", {
          y: isDesktop ? 20 : 14,
          opacity: 0,
          duration: isDesktop ? 0.65 : 0.48,
          stagger: 0.075,
          clearProps: "transform,opacity",
        });

        heroTl.from(
          "[data-gsap='hero-ticket']",
          {
            y: 22,
            opacity: 0,
            duration: 0.68,
            clearProps: "transform,opacity",
          },
          0.26,
        );

        // Desktop-only subtle parallax scrub on spotlight photographs
        if (isDesktop) {
          root.querySelectorAll<HTMLElement>("[data-gsap='spotlight-media']").forEach((figure) => {
            const img = figure.querySelector<HTMLElement>(".module-image");
            if (!img) return;
            gsap.fromTo(
              img,
              { scale: 1.07, yPercent: -3.5 },
              {
                scale: 1.07,
                yPercent: 3.5,
                ease: "none",
                scrollTrigger: {
                  trigger: figure,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.5,
                  invalidateOnRefresh: true,
                },
              },
            );
          });
        }

        // Carousel reveal
        const carouselEl = root.querySelector<HTMLElement>("[data-gsap='carousel']");
        if (carouselEl) {
          gsap.from(carouselEl, {
            y: travel,
            opacity: 0,
            duration: 0.72,
            ease: "power3.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: carouselEl,
              start: triggerStart,
              once: true,
              fastScrollEnd: true,
            },
          });
        }

        // 2. Generic section headers / intros
        root.querySelectorAll<HTMLElement>("[data-gsap='reveal-up']").forEach((el) => {
          gsap.from(el, {
            y: travel,
            opacity: 0,
            duration,
            ease: "power3.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: el,
              start: triggerStart,
              once: true,
              fastScrollEnd: true,
            },
          });
        });

        // 3. Pain point visual bento cards cascade
        const painRows = root.querySelectorAll<HTMLElement>("[data-gsap='pain-row']");
        if (painRows.length > 0) {
          gsap.from(painRows, {
            y: isDesktop ? 24 : 16,
            opacity: 0,
            duration: 0.62,
            stagger: 0.1,
            ease: "power3.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: ".pain-grid",
              start: triggerStart,
              once: true,
              fastScrollEnd: true,
            },
          });
        }

        // 4. Interactive Dapur Sari App-Frame reveal + flow chips
        const previewWin = root.querySelector<HTMLElement>(".preview-window");
        if (previewWin) {
          gsap.from(previewWin, {
            y: isDesktop ? 34 : 20,
            scale: isDesktop ? 0.985 : 1,
            opacity: 0,
            duration: 0.78,
            ease: "power3.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: previewWin,
              start: isDesktop ? "top 82%" : "top 90%",
              once: true,
              fastScrollEnd: true,
            },
          });
        }

        const flowChips = root.querySelectorAll<HTMLElement>(".preview-flow-bar .flow-chip");
        if (flowChips.length > 0) {
          gsap.from(flowChips, {
            y: 12,
            opacity: 0,
            duration: 0.45,
            stagger: 0.07,
            delay: 0.14,
            ease: "power2.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: ".preview-flow-bar",
              start: triggerStart,
              once: true,
              fastScrollEnd: true,
            },
          });
        }

        // 5. Spotlight modules (directional on desktop, vertical on mobile)
        root.querySelectorAll<HTMLElement>("[data-gsap='spotlight-row']").forEach((row) => {
          const media = row.querySelector<HTMLElement>("[data-gsap='spotlight-media']");
          const copy = row.querySelector<HTMLElement>("[data-gsap='spotlight-copy']");
          const pill = row.querySelector<HTMLElement>(".media-pill");
          const isReversed = row.classList.contains("is-reversed");

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: row,
              start: isDesktop ? "top 80%" : "top 88%",
              once: true,
              fastScrollEnd: true,
            },
          });

          if (media) {
            tl.from(
              media,
              {
                x: isDesktop ? (isReversed ? 26 : -26) : 0,
                y: isDesktop ? 0 : 18,
                opacity: 0,
                duration: 0.72,
                ease: "power3.out",
                clearProps: "transform,opacity",
              },
              0,
            );
          }

          if (copy) {
            tl.from(
              copy,
              {
                x: isDesktop ? (isReversed ? -22 : 22) : 0,
                y: isDesktop ? 0 : 18,
                opacity: 0,
                duration: 0.72,
                ease: "power3.out",
                clearProps: "transform,opacity",
              },
              0.08,
            );
          }

          if (pill) {
            tl.from(
              pill,
              {
                y: 10,
                opacity: 0,
                duration: 0.45,
                ease: "power2.out",
                clearProps: "transform,opacity",
              },
              0.26,
            );
          }
        });

        // 6. Secondary 2-col module cards
        const secondaryCards = root.querySelectorAll<HTMLElement>("[data-gsap='secondary-card']");
        if (secondaryCards.length > 0) {
          gsap.from(secondaryCards, {
            y: travel,
            opacity: 0,
            duration: 0.68,
            stagger: 0.14,
            ease: "power3.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: ".secondary-module-grid",
              start: triggerStart,
              once: true,
              fastScrollEnd: true,
            },
          });
        }

        // 7. Manual vs MicroChain comparison rows
        const versusRows = root.querySelectorAll<HTMLElement>("[data-gsap='versus-row']");
        if (versusRows.length > 0) {
          gsap.from(versusRows, {
            y: 16,
            opacity: 0,
            duration: 0.5,
            stagger: 0.08,
            ease: "power2.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: ".versus-board",
              start: triggerStart,
              once: true,
              fastScrollEnd: true,
            },
          });
        }

        // 8. Dark Cara Kerja step cards + UMKM audience items
        const stepCards = root.querySelectorAll<HTMLElement>("[data-gsap='step-card']");
        if (stepCards.length > 0) {
          gsap.from(stepCards, {
            y: travel,
            opacity: 0,
            duration: 0.62,
            stagger: 0.12,
            ease: "power3.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: ".step-list-dark",
              start: triggerStart,
              once: true,
              fastScrollEnd: true,
            },
          });
        }

        const audienceItems = root.querySelectorAll<HTMLElement>("[data-gsap='audience-item']");
        if (audienceItems.length > 0) {
          gsap.from(audienceItems, {
            y: 16,
            opacity: 0,
            duration: 0.52,
            stagger: 0.075,
            ease: "power2.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: ".audience-grid",
              start: triggerStart,
              once: true,
              fastScrollEnd: true,
            },
          });
        }

        // 9. FAQ accordion cascade
        const faqItems = root.querySelectorAll<HTMLElement>("[data-gsap='faq-item']");
        if (faqItems.length > 0) {
          gsap.from(faqItems, {
            y: 14,
            opacity: 0,
            duration: 0.48,
            stagger: 0.06,
            ease: "power2.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: ".faq-list",
              start: triggerStart,
              once: true,
              fastScrollEnd: true,
            },
          });
        }

        // 10. Closing CTA banner
        const closingBanner = root.querySelector<HTMLElement>("[data-gsap='closing']");
        if (closingBanner) {
          gsap.from(closingBanner, {
            y: isDesktop ? 28 : 18,
            scale: isDesktop ? 0.985 : 1,
            opacity: 0,
            duration: 0.72,
            ease: "power3.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: closingBanner,
              start: "top 98%",
              once: true,
              fastScrollEnd: true,
            },
          });
        }
      },
    );

    let refreshTimer: number | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        ScrollTrigger.refresh();
      }, 120);
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
