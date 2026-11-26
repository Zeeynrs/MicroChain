"use client";

import { useEffect, useRef, useState } from "react";
import { CircleHelp, Compass, Images } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onIntro: () => void;
  onTour: () => void;
}

/** Tombol Bantuan di bilah atas: membuka menu kecil untuk mengulang pengantar atau panduan interaktif. */
export function HelpMenu({ onIntro, onTour }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="help" ref={root}>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        data-tour="help"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Bantuan"
        onClick={() => setOpen((value) => !value)}
      >
        <CircleHelp size={16} aria-hidden="true" /> <span className="label-full">Bantuan</span>
      </Button>
      {open && (
        <div className="help-menu" role="menu" aria-label="Menu bantuan">
          <button type="button" role="menuitem" onClick={() => choose(onTour)}>
            <Compass size={17} aria-hidden="true" />
            <span><strong>Panduan interaktif</strong><small>Sorotan langkah demi langkah di aplikasi</small></span>
          </button>
          <button type="button" role="menuitem" onClick={() => choose(onIntro)}>
            <Images size={17} aria-hidden="true" />
            <span><strong>Lihat pengantar</strong><small>Ringkasan fungsi MicroChain</small></span>
          </button>
        </div>
      )}
    </div>
  );
}
