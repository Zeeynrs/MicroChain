"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Busy, ErrorState } from "@/components/states";
import { ApiError, compareAll, putJson, request } from "@/lib/api";
import { computeInputsSignature } from "@/lib/domain/signature";
import type { ScenarioConfig, WorkspaceData, WorkspaceSnapshot } from "@/lib/domain/types";
import { validateWorkspaceData } from "@/lib/domain/validation";
import { notify } from "@/lib/notify";
import type { ComparisonResult } from "@/lib/types";

/**
 * Satu konteks untuk dua mode:
 *  - `demo`: mode tamu. Data dari `/api/demo`, perubahan hanya di `sessionStorage`.
 *  - `workspace`: pengguna login. Data dari `/api/workspace`, disimpan eksplisit lewat `PUT /api/workspace`.
 */

export type Mode = "demo" | "workspace";

const DEMO_STORAGE_KEY = "microchain:demo:v1";

interface Meta {
  mode: Mode;
  /** Awalan rute: "" untuk demo, "/workspace" untuk workspace login. */
  base: string;
  status: "loading" | "error" | "ready";
  error: string | null;
  retry: () => void;
  businessName: string | null;
  dirty: boolean;
  saving: boolean;
  save: () => Promise<void>;
  /** Pesan terakhir hasil simpan/reset. */
  notice: string | null;
  reset: () => Promise<void>;
  resetting: boolean;
  actionError: string | null;
}

interface Loaded {
  data: WorkspaceData;
  snapshot: WorkspaceSnapshot;
  scenarios: ScenarioConfig[];
  scenario: ScenarioConfig;
  selectScenario: (id: string) => void;
  /** Ganti seluruh data (dipakai editor). Mengubah signature sehingga hasil lama menjadi basi. */
  setData: (next: WorkspaceData) => void;
  signature: string;
  comparison: { view: ComparisonResult; signature: string } | null;
  comparing: boolean;
  comparisonError: string | null;
  runComparison: () => Promise<void>;
}

const MetaContext = createContext<Meta | null>(null);
const LoadedContext = createContext<Loaded | null>(null);

function readStoredDemo(): WorkspaceData | null {
  try {
    const raw = sessionStorage.getItem(DEMO_STORAGE_KEY);
    return raw ? validateWorkspaceData(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function WorkspaceProvider({ mode, children }: { mode: Mode; children: ReactNode }) {
  const router = useRouter();
  // Simpan router di ref agar efek pemuatan tidak berulang bila identitas objek router berubah.
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);
  const [data, setDataState] = useState<WorkspaceData | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [savedJson, setSavedJson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState("baseline");
  const [comparison, setComparison] = useState<Loaded["comparison"]>(null);
  const [comparing, setComparing] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const compareRun = useRef(0);

  const adopt = useCallback((next: WorkspaceData, id: string | null) => {
    compareRun.current += 1; // batalkan hasil perbandingan yang masih berjalan
    setDataState(next);
    setBusinessId(id);
    setSavedJson(JSON.stringify(next));
    setSelectedId("baseline");
    setComparison(null);
    setComparisonError(null);
    setComparing(false);
  }, []);

  const handleUnauthorized = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      routerRef.current.replace("/login");
      return true;
    }
    return false;
  }, []);

  // Muat data awal (dan saat "Coba Lagi").
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        if (mode === "demo") {
          const stored = readStoredDemo();
          if (stored) {
            setDataState(stored);
            setSavedJson(JSON.stringify(stored));
            setError(null);
            return;
          }
          const demo = await request<WorkspaceData>("/api/demo", undefined, controller.signal);
          adopt({ snapshot: demo.snapshot, scenarios: demo.scenarios }, null);
        } else {
          const ws = await request<WorkspaceData & { businessId: string }>("/api/workspace", undefined, controller.signal);
          adopt({ snapshot: ws.snapshot, scenarios: ws.scenarios }, ws.businessId);
        }
        setError(null);
      } catch (err) {
        if (controller.signal.aborted || handleUnauthorized(err)) return;
        setError(err instanceof Error ? err.message : "Data belum dapat dimuat.");
      }
    })();
    return () => controller.abort();
  }, [mode, attempt, adopt, handleUnauthorized]);

  // Mode tamu: simpan perubahan di sessionStorage.
  useEffect(() => {
    if (mode !== "demo" || !data) return;
    try {
      sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* penyimpanan sesi tidak tersedia: abaikan */
    }
  }, [mode, data]);

  const currentJson = useMemo(() => (data ? JSON.stringify(data) : null), [data]);
  const dirty = mode === "workspace" && currentJson !== null && currentJson !== savedJson;

  // Peringatan sebelum meninggalkan halaman dengan perubahan belum tersimpan.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const signature = useMemo(() => (data ? computeInputsSignature(data.snapshot, data.scenarios) : ""), [data]);

  const setData = useCallback((next: WorkspaceData) => {
    setDataState(next);
    setNotice(null);
  }, []);

  const runComparison = useCallback(async () => {
    if (!data) return;
    const run = ++compareRun.current;
    const forSignature = computeInputsSignature(data.snapshot, data.scenarios);
    setComparing(true);
    setComparisonError(null);
    try {
      const view = await compareAll(data);
      if (run === compareRun.current) setComparison({ view, signature: forSignature });
    } catch (err) {
      if (run === compareRun.current) {
        const message = err instanceof Error ? err.message : "Perbandingan gagal dihitung.";
        setComparisonError(message);
        notify.error(message);
      }
    } finally {
      if (run === compareRun.current) setComparing(false);
    }
  }, [data]);

  const save = useCallback(async () => {
    if (!data || !businessId) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await request<WorkspaceData & { ok: boolean }>(
        "/api/workspace",
        putJson({ businessId, snapshot: data.snapshot, scenarios: data.scenarios }),
      );
      const saved = { snapshot: res.snapshot, scenarios: res.scenarios };
      setSavedJson(JSON.stringify(saved));
      setDataState(saved);
      setNotice("Perubahan tersimpan di workspace Anda.");
      notify.success("Perubahan tersimpan di workspace Anda.");
    } catch (err) {
      if (!handleUnauthorized(err)) {
        const message = err instanceof Error ? err.message : "Gagal menyimpan.";
        setActionError(message);
        notify.error(message);
      }
    } finally {
      setSaving(false);
    }
  }, [data, businessId, handleUnauthorized]);

  const reset = useCallback(async () => {
    setResetting(true);
    setActionError(null);
    try {
      if (mode === "demo") {
        const demo = await request<WorkspaceData>("/api/demo");
        try {
          sessionStorage.removeItem(DEMO_STORAGE_KEY);
        } catch {
          /* abaikan */
        }
        adopt({ snapshot: demo.snapshot, scenarios: demo.scenarios }, null);
      } else {
        const ws = await request<WorkspaceData & { businessId: string }>("/api/workspace/reset", { method: "POST" });
        adopt({ snapshot: ws.snapshot, scenarios: ws.scenarios }, ws.businessId);
      }
      const done = mode === "demo" ? "Data dikembalikan ke kondisi awal Dapur Sari." : "Workspace dikosongkan. Mulai isi data usaha Anda di Data Usaha.";
      setNotice(done);
      notify.success(done);
    } catch (err) {
      if (!handleUnauthorized(err)) {
        const message = err instanceof Error ? err.message : "Gagal mereset data.";
        setActionError(message);
        notify.error(message);
      }
    } finally {
      setResetting(false);
    }
  }, [mode, adopt, handleUnauthorized]);

  const meta: Meta = {
    mode,
    base: mode === "workspace" ? "/workspace" : "",
    status: data ? "ready" : error ? "error" : "loading",
    error,
    retry: () => {
      setError(null);
      setAttempt((n) => n + 1);
    },
    businessName: data?.snapshot.business.name ?? null,
    dirty,
    saving,
    save,
    notice,
    reset,
    resetting,
    actionError,
  };

  const loaded: Loaded | null = data
    ? {
        data,
        snapshot: data.snapshot,
        scenarios: data.scenarios,
        scenario: data.scenarios.find((s) => s.id === selectedId) ?? data.scenarios[0],
        selectScenario: setSelectedId,
        setData,
        signature,
        comparison,
        comparing,
        comparisonError,
        runComparison,
      }
    : null;

  return (
    <MetaContext.Provider value={meta}>
      <LoadedContext.Provider value={loaded}>{children}</LoadedContext.Provider>
    </MetaContext.Provider>
  );
}

/** Menampilkan status muat/galat; anak hanya dirender setelah data siap. */
export function WorkspaceGate({ children }: { children: ReactNode }) {
  const meta = useWorkspaceMeta();
  if (meta.status === "error") return <ErrorState message={meta.error ?? "Data belum dapat dimuat."} retry={meta.retry} />;
  if (meta.status === "loading") return <Busy label={meta.mode === "demo" ? "Memuat data Dapur Sari…" : "Memuat workspace Anda…"} />;
  return <>{children}</>;
}

export function useWorkspaceMeta() {
  const context = useContext(MetaContext);
  if (!context) throw new Error("Tampilan ini memerlukan WorkspaceProvider.");
  return context;
}

export function useWorkspace() {
  const meta = useWorkspaceMeta();
  const loaded = useContext(LoadedContext);
  if (!loaded) throw new Error("Data workspace belum siap.");
  return { ...meta, ...loaded, href: (path: string) => `${meta.base}${path}` };
}
