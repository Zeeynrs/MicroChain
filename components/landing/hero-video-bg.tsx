"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";

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

export function HeroVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const paused = userPaused ?? prefersReduced;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) {
      try {
        video.pause?.();
      } catch {
        // jsdom does not implement media playback
      }
    } else if (userPaused === false) {
      try {
        const p = video.play?.();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {
        // jsdom does not implement media playback
      }
    }
  }, [paused, userPaused]);

  return (
    <>
      <div className="hero-video-layer" aria-hidden="true">
        <video
          ref={videoRef}
          className="hero-video-el"
          autoPlay={!prefersReduced}
          muted
          loop
          playsInline
          preload="metadata"
          poster="/landing/hero-kitchen-poster.webp"
        >
          <source src="/landing/hero-kitchen-bg.mp4" type="video/mp4" />
        </video>
      </div>

      <button
        type="button"
        className="hero-video-toggle"
        onClick={() => setUserPaused(!paused)}
        aria-pressed={paused}
        aria-label={paused ? "Putar video latar" : "Jeda video latar"}
      >
        {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        <span>{paused ? "Putar latar" : "Jeda latar"}</span>
      </button>
    </>
  );
}
