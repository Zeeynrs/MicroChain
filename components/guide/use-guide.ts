"use client";

import { useCallback, useState } from "react";
import { useStoredValue } from "@/lib/use-stored-value";
import type { Mode } from "@/lib/workspace-context";
import { TOUR_STEPS, type TourStep } from "./steps";

export const INTRO_KEY = "microchain:onboarding:v1";
export const TOUR_KEY = "microchain:tour:v1";

export type GuideView = "idle" | "intro" | "tour";

/**
 * Mesin status pengantar dan panduan interaktif.
 * Pertama kali berkunjung pengantar tampil otomatis; selesai/lewati disimpan sehingga tidak muncul lagi.
 * Menu Bantuan dapat membuka keduanya kapan saja.
 */
export function useGuide(mode: Mode) {
  const [introSeen, setIntroSeen] = useStoredValue(INTRO_KEY, "done");
  const [, setTourSeen] = useStoredValue(TOUR_KEY, "done");
  const [forced, setForced] = useState<GuideView | null>(null);
  const [step, setStep] = useState(0);

  const steps: TourStep[] = TOUR_STEPS.filter((s) => !s.only || s.only === mode);
  const view: GuideView = forced ?? (introSeen !== "done" ? "intro" : "idle");

  const openIntro = useCallback(() => setForced("intro"), []);
  const startTour = useCallback(() => {
    setStep(0);
    setForced("tour");
  }, []);
  const finishIntro = useCallback(
    (withTour: boolean) => {
      setIntroSeen("done");
      if (withTour) startTour();
      else setForced(null);
    },
    [setIntroSeen, startTour],
  );
  const closeTour = useCallback(() => {
    setTourSeen("done");
    setForced(null);
  }, [setTourSeen]);

  return { view, steps, step, setStep, openIntro, startTour, finishIntro, closeTour };
}
