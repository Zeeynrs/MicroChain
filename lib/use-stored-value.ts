"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Nilai kecil yang disimpan di localStorage dan aman dari SSR/hydration (`useSyncExternalStore`).
 * Bila localStorage diblokir (mode privat, kebijakan browser), nilai tetap tersimpan di memori selama sesi
 * sehingga status "sudah dilihat" tetap berlaku dan layar tidak muncul kembali tanpa henti.
 */

const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function read(key: string): string | null {
  const inMemory = memory.get(key);
  if (inMemory !== undefined) return inMemory;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

/** `serverValue` dipakai saat render server; pilih nilai "sudah selesai" agar tidak ada kedipan layar. */
export function useStoredValue(key: string, serverValue: string | null) {
  const value = useSyncExternalStore(subscribe, () => read(key), () => serverValue);
  const set = useCallback(
    (next: string) => {
      memory.set(key, next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        /* diabaikan: nilai tetap di memori */
      }
      listeners.forEach((listener) => listener());
    },
    [key],
  );
  return [value, set] as const;
}

/** Hanya untuk test: kosongkan nilai memori. */
export function resetStoredValues() {
  memory.clear();
  listeners.forEach((listener) => listener());
}
