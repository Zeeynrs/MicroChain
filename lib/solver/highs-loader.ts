import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Highs } from "highs";

let solverPromise: Promise<Highs> | null = null;

/**
 * Memuat HiGHS (WASM) satu kali per proses. Hanya untuk server (Route Handler / Vitest).
 * Berkas `.wasm` dibaca dari `node_modules` dan dibawa ke output serverless lewat
 * `outputFileTracingIncludes` di `next.config.ts`.
 */
export function getHighsSolver(): Promise<Highs> {
  if (!solverPromise) {
    solverPromise = (async () => {
      const mod = (await import("highs")) as unknown as {
        default: (opts?: { wasmBinary?: ArrayBuffer | ArrayBufferView }) => Promise<Highs>;
      };
      const load = mod.default;
      let wasmBinary: Uint8Array | undefined;
      try {
        wasmBinary = await readFile(path.join(process.cwd(), "node_modules", "highs", "build", "highs.wasm"));
      } catch {
        wasmBinary = undefined; // biarkan loader mencari berkasnya sendiri
      }
      return load(wasmBinary ? { wasmBinary } : undefined);
    })().catch((err) => {
      solverPromise = null; // izinkan percobaan ulang
      throw err;
    });
  }
  return solverPromise;
}
