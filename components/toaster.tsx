"use client";

import { Toaster as Sonner } from "sonner";

/** Wadah notifikasi global. Di layar kecil toast naik di atas navigasi bawah agar tidak tertutup. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      duration={4000}
      offset={20}
      mobileOffset={{ bottom: 92, left: 12, right: 12 }}
      toastOptions={{
        classNames: {
          toast: "mc-toast",
          success: "mc-toast-success",
          error: "mc-toast-error",
          info: "mc-toast-info",
          title: "mc-toast-title",
          closeButton: "mc-toast-close",
        },
      }}
    />
  );
}
