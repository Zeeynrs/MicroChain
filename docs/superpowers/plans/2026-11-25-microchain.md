---
tags:
  - plan
  - microchain
project: "[[MicroChain Hub]]"
status: approved
---

# MicroChain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun aplikasi web **MicroChain** (Next.js App Router, TypeScript, Tailwind CSS, React Flow, HiGHS WASM MILP solver, Supabase Auth Magic Link + Postgres RLS) untuk simulasi ketahanan rantai pasok UMKM makanan dengan demo **Dapur Sari**.

**Architecture:** Satu kontrak domain kanonik (`WorkspaceSnapshot`, `ScenarioConfig`) dibagikan antara Mode Tamu (`/demo` dengan `sessionStorage` dari `demo_templates`) dan Mode Workspace Persisten (`/workspace` dengan 8 tabel Postgres terproteksi RLS). Seluruh perhitungan optimasi berjalan deterministik di server Next.js via `highs` WASM dengan deteksi otomatis status basi (*stale*) berbasis hash kanonik.

**Tech Stack:** Next.js App Router (`create-next-app@latest`, tanpa `src/`), React, TypeScript, Tailwind CSS, `@xyflow/react`, `highs` (WASM), `zod`, `@supabase/ssr`, `@supabase/supabase-js`, `lucide-react`, `vitest`, `@testing-library/react`.

**Spec:** [[docs/superpowers/specs/2026-11-25-microchain-design]]

Kembali ke [[MicroChain Hub]] | Lihat [[docs/PRD|PRD]] | Lihat [[docs/TASKS|TASKS]]

## Global Constraints
- Gunakan `npx create-next-app@latest` (App Router, TypeScript, Tailwind CSS, ESLint, tanpa `src/` dir).
- Bahasa UI sepenuhnya **Bahasa Indonesia**.
- Seluruh logika backend & optimasi berjalan di Next.js Route Handlers / TypeScript server — **dilarang** memakai FastAPI, Python, atau Docker.
- Solver optimasi di TypeScript server wajib **deterministik**, bertipe ketat, dan memiliki unit test.
- Layar `>= 640px` menampilkan graf interaktif React Flow (`pemasok -> bahan -> produk`) dengan klik node & penanda *single-supplier*; layar `< 640px` menampilkan daftar, bukan graf.
- Hasil simulasi lama wajib berubah menjadi status **basi** (*stale*) segera setelah input berubah, dan tersedia tombol reset ke fixture awal.
- Semua rahasia hanya lewat env var (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) dengan `.env.example`; workspace user memakai `@supabase/ssr` + Postgres RLS tanpa `service_role`.
- Pertahankan `.obsidian/` dan `docs/` di root workspace selama scaffolding.

## Review Focus
1. **Zero-premium alternative offer over-buying:** Penawaran dengan `incremental_premium_idr_per_pack === 0` tidak boleh menghasilkan pembelian pak berlebih yang tidak terpakai oleh produksi akhir (uji di Task 3).
2. **Penawaran/pengiriman melewati `cutoff_date`:** Penawaran dengan `scenario_date + lead_days > cutoff_date` atau pengiriman dengan `arrival_date + delay_days > cutoff_date` harus menghasilkan kapasitas `0` dengan alasan eksplisit (uji di Task 3).
3. **Nol kerugian / pembagian nol pada perbandingan:** Saat `baseline.net === outage.net` atau `baseline.net === 0`, `compareScenarios` tidak boleh menghasilkan `NaN` atau `Infinity` (uji di Task 3).
4. **Sensitivitas `computeInputsSignature` untuk status basi:** Perubahan pada nested field (`bom`, `arrival_date`, `lead_days`, `cutoff_date`, `disruptions`, `disabled_supplier_ids`, `enabled_offer_ids`) wajib mengubah signature secara deterministik, sementara urutan elemen yang berbeda tidak menimbulkan *false positive* bila nilai identik (uji di Task 2).
5. **Paritas CHECK constraint Postgres & referensi relasi:** Validasi Zod wajib menolak pasangan `unit_kind`/`base_unit` tidak sah (mis. `mass` + `ml`), `quantity_per_product < 1`, nilai negatif, dan ID relasi menggantung sebelum menyentuh solver atau DB (uji di Task 2 & Task 6).

---

### Task 1: Scaffolding Next.js App, Dependencies & Konfigurasi

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.example`, `.gitignore`, `app/layout.tsx`, `app/globals.css`

**Interfaces:**
- Produces: Skrip `npm test` (`vitest run`), `npm run lint`, `npm run build`, serta konfigurasi `serverExternalPackages: ['highs']` dan `outputFileTracingIncludes` pada `next.config.ts`.

- [ ] **Step 1: Scaffold Next.js ke folder sementara agar aman bagi `.obsidian/` dan `docs/`**

Jalankan `npx create-next-app@latest .tmp-next --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes` lalu pindahkan seluruh berkas ke root `C:\Projek\lomba-SEVENT-X\Micro-Chain` tanpa menimpa `.obsidian/` dan `docs/`, kemudian hapus `.tmp-next`.

- [ ] **Step 2: Pasang dependensi runtime dan dev**

```bash
npm install @supabase/ssr @supabase/supabase-js highs @xyflow/react zod lucide-react
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Konfigurasi `next.config.ts`, `vitest.config.ts`, `.env.example`, dan skrip `test` di `package.json`**

Pastikan `next.config.ts` berisi `serverExternalPackages: ['highs']` dan `outputFileTracingIncludes: { '/api/**': ['./node_modules/highs/build/*.wasm'] }`. Buat `.env.example` berisi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Buat `.env.local` ter-gitignore untuk uji integrasi lokal.

- [ ] **Step 4: Verifikasi baseline tooling**

Run: `npm run lint && npx tsc --noEmit`
Expected: Exit code `0`.

- [ ] **Step 5: Commit**

```bash
git init && git add . && git commit -m "chore: scaffold Next.js MicroChain workspace with solver and Supabase deps"
```

---

### Task 2: Model Domain Kanonik, Validasi Zod & Signature Status Basi

**Files:**
- Create: `lib/domain/types.ts`
- Create: `lib/domain/validation.ts`
- Create: `lib/domain/signature.ts`
- Create: `lib/domain/fixture.ts`
- Test: `tests/domain/validation-and-signature.test.ts`

**Interfaces:**
- Produces:
  - Types in `lib/domain/types.ts`: `WorkspaceSnapshot`, `ScenarioConfig`, `WorkspaceData`, `ScenarioResult`, `ComparisonSummary`, `DeliveryDisruption`, `ScenarioOverrides`, `GraphNetwork`
  - `validateWorkspaceData(input: unknown): WorkspaceData` & `workspaceDataSchema` in `lib/domain/validation.ts`
  - `computeInputsSignature(snapshot: WorkspaceSnapshot, scenarios: ScenarioConfig[]): string` in `lib/domain/signature.ts`
  - `DAPUR_SARI_FALLBACK_FIXTURE: WorkspaceData` in `lib/domain/fixture.ts` (hanya dipakai untuk unit test offline, bukan pengganti `demo_templates` DB)

- [ ] **Step 1: Write the failing test**

```typescript
// tests/domain/validation-and-signature.test.ts
import { describe, expect, it } from 'vitest';
import { validateWorkspaceData } from '@/lib/domain/validation';
import { computeInputsSignature } from '@/lib/domain/signature';
import { DAPUR_SARI_FALLBACK_FIXTURE } from '@/lib/domain/fixture';

describe('validateWorkspaceData', () => {
  it('accepts valid Dapur Sari canonical fixture', () => {
    const parsed = validateWorkspaceData(DAPUR_SARI_FALLBACK_FIXTURE);
    expect(parsed.snapshot.business.id).toBe('dapur_sari');
    expect(parsed.scenarios).toHaveLength(3);
  });

  it('rejects mismatched unit_kind and base_unit mirroring Postgres materials_check', () => {
    const bad = structuredClone(DAPUR_SARI_FALLBACK_FIXTURE);
    bad.snapshot.materials[0].unit_kind = 'mass';
    bad.snapshot.materials[0].base_unit = 'ml';
    expect(() => validateWorkspaceData(bad)).toThrow();
  });

  it('rejects dangling BOM product_id or material_id references', () => {
    const bad = structuredClone(DAPUR_SARI_FALLBACK_FIXTURE);
    bad.snapshot.bom[0].material_id = 'unknown_material';
    expect(() => validateWorkspaceData(bad)).toThrow();
  });
});

describe('computeInputsSignature', () => {
  it('produces identical signature regardless of array order', () => {
    const a = structuredClone(DAPUR_SARI_FALLBACK_FIXTURE);
    const b = structuredClone(DAPUR_SARI_FALLBACK_FIXTURE);
    b.snapshot.materials.reverse();
    b.snapshot.bom.reverse();
    expect(computeInputsSignature(a.snapshot, a.scenarios)).toBe(
      computeInputsSignature(b.snapshot, b.scenarios)
    );
  });

  it('changes signature when stock, cutoff, delay_days, or BOM changes', () => {
    const baseSig = computeInputsSignature(
      DAPUR_SARI_FALLBACK_FIXTURE.snapshot,
      DAPUR_SARI_FALLBACK_FIXTURE.scenarios
    );
    const modified = structuredClone(DAPUR_SARI_FALLBACK_FIXTURE);
    modified.scenarios[1].disruptions.push({
      type: 'delay_delivery',
      delivery_id: 'supplier_a_flour_delivery',
      delay_days: 2,
    });
    expect(computeInputsSignature(modified.snapshot, modified.scenarios)).not.toBe(baseSig);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/domain/validation-and-signature.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `types.ts`, `validation.ts`, `signature.ts`, and `fixture.ts`**

Implementasikan tipe kanonik persis sesuai §3 Dokumen Desain, skema Zod dengan `.superRefine()` untuk mengecek paritas `materials_check`, keunikan slug, batas integer Postgres, dan kelengkapan referensi relasi, serta `computeInputsSignature` yang menormalkan urutan seluruh array sebelum `JSON.stringify` + FNV-1a/SHA-256 hex digest.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/domain/validation-and-signature.test.ts`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add lib/domain tests/domain && git commit -m "feat: add canonical domain types, Zod validation, and stale signature"
```

---

### Task 3: Solver Optimasi MILP Deterministik (`highs` WASM) & Perbandingan 3 Skenario

**Files:**
- Create: `lib/solver/highs-loader.ts`
- Create: `lib/solver/milp-solver.ts`
- Create: `lib/solver/compare.ts`
- Test: `tests/solver/milp-and-compare.test.ts`

**Interfaces:**
- Consumes: `WorkspaceSnapshot`, `ScenarioConfig`, `ScenarioResult`, `ComparisonSummary` from `lib/domain/types.ts`
- Produces:
  - `getHighsSolver(): Promise<Highs>` in `lib/solver/highs-loader.ts`
  - `solveScenario(snapshot: WorkspaceSnapshot, scenario: ScenarioConfig): Promise<ScenarioResult>` in `lib/solver/milp-solver.ts`
  - `compareScenarios(snapshot: WorkspaceSnapshot, scenarios: ScenarioConfig[]): Promise<{ results: ScenarioResult[]; comparison: ComparisonSummary }>` in `lib/solver/compare.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/solver/milp-and-compare.test.ts
import { describe, expect, it } from 'vitest';
import { solveScenario } from '@/lib/solver/milp-solver';
import { compareScenarios } from '@/lib/solver/compare';
import { DAPUR_SARI_FALLBACK_FIXTURE } from '@/lib/domain/fixture';

describe('solveScenario & compareScenarios (Dapur Sari)', () => {
  it('solves baseline, outage, and mitigation deterministically with exact IDR figures', async () => {
    const { snapshot, scenarios } = DAPUR_SARI_FALLBACK_FIXTURE;
    const { results, comparison } = await compareScenarios(snapshot, scenarios);

    const baseline = results.find((r) => r.scenario_id === 'baseline')!;
    const outage = results.find((r) => r.scenario_id === 'outage')!;
    const mitigation = results.find((r) => r.scenario_id === 'mitigation')!;

    expect(baseline.status).toBe('Optimal');
    expect(baseline.net_contribution_idr).toBe(450_000);
    expect(outage.net_contribution_idr).toBe(210_000);
    expect(mitigation.alternative_premium_idr).toBe(12_000);
    expect(mitigation.net_contribution_idr).toBe(342_000);

    expect(comparison.loss_idr).toBe(240_000);
    expect(comparison.recovered_idr).toBe(132_000);
    expect(comparison.recovered_pct_of_loss).toBeCloseTo(55, 5);
    expect(comparison.recovered_pct_of_baseline).toBeCloseTo(76, 5);
  });

  it('excludes alternative offers whose lead_days exceed cutoff_date', async () => {
    const mod = structuredClone(DAPUR_SARI_FALLBACK_FIXTURE);
    mod.snapshot.alternative_offers[0].lead_days = 3; // 2026-11-23 + 3 = 2026-11-26 > 2026-11-24
    const mitigation = mod.scenarios.find((s) => s.id === 'mitigation')!;
    const res = await solveScenario(mod.snapshot, mitigation);
    expect(res.net_contribution_idr).toBe(210_000);
    expect(res.alternative_purchases[0].eligible).toBe(false);
    expect(res.alternative_purchases[0].packs_bought).toBe(0);
  });

  it('excludes committed deliveries delayed past cutoff_date via delay_delivery disruption', async () => {
    const mod = structuredClone(DAPUR_SARI_FALLBACK_FIXTURE);
    const baseline = structuredClone(mod.scenarios[0]);
    baseline.disruptions = [{ type: 'delay_delivery', delivery_id: 'supplier_a_flour_delivery', delay_days: 5 }];
    const res = await solveScenario(mod.snapshot, baseline);
    expect(res.net_contribution_idr).toBe(210_000);
    expect(res.delivery_statuses[0].counted).toBe(false);
  });

  it('does not over-buy 0-premium alternative packs beyond production needs', async () => {
    const mod = structuredClone(DAPUR_SARI_FALLBACK_FIXTURE);
    mod.snapshot.alternative_offers[0].incremental_premium_idr_per_pack = 0;
    mod.snapshot.alternative_offers[0].max_packs = 50; // max needed is 20 packs (20000g) for 100 bread + 30 cookies = 28000g total
    const mitigation = mod.scenarios.find((s) => s.id === 'mitigation')!;
    const res = await solveScenario(mod.snapshot, mitigation);
    expect(res.net_contribution_idr).toBe(450_000);
    expect(res.alternative_purchases[0].packs_bought).toBe(20);
  });

  it('avoids NaN/Infinity when baseline and outage have 0 loss', async () => {
    const mod = structuredClone(DAPUR_SARI_FALLBACK_FIXTURE);
    mod.snapshot.materials[0].stock_on_hand = 40_000; // enough without deliveries
    const { comparison } = await compareScenarios(mod.snapshot, mod.scenarios);
    expect(Number.isFinite(comparison.recovered_pct_of_loss)).toBe(true);
    expect(comparison.loss_idr).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/solver/milp-and-compare.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `highs-loader.ts`, `milp-solver.ts`, and `compare.ts`**

Gunakan singleton promise pada `highs-loader.ts` dengan `wasmBinary` dibaca dari `path.join(process.cwd(), 'node_modules/highs/build/highs.wasm')` (fallback ke default init bila di bundle browser tidak dipakai—solver hanya di server). Susun string CPLEX LP terurut berdasarkan `id` naik, jalankan `highs.solve(lp)`, terapkan post-solve deterministic zero-premium pack trim, lalu hitung seluruh metrik produksi, pemakaian/sisa bahan, *bottleneck*, dan status pengiriman.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/solver/milp-and-compare.test.ts`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add lib/solver tests/solver && git commit -m "feat: implement deterministic HiGHS MILP solver and 3-scenario comparison"
```

---

### Task 4: Pembangun Graf Jaringan Pasok & Deteksi Single-Supplier

**Files:**
- Create: `lib/domain/graph.ts`
- Test: `tests/domain/graph.test.ts`

**Interfaces:**
- Consumes: `WorkspaceSnapshot`, `ScenarioConfig`, `ScenarioResult` from `lib/domain/types.ts`
- Produces: `buildSupplyNetwork(snapshot: WorkspaceSnapshot, scenario?: ScenarioConfig, result?: ScenarioResult): SupplyNetworkModel` (nodes bertipe `'supplier' | 'material' | 'product'` berposisi 3-kolom, edges berlabel jumlah/BOM, metadata `isSingleSupplier`, `hasBackupSupplier`, dan `supplyClassification`)

- [ ] **Step 1: Write the failing test**

Uji bahwa `buildSupplyNetwork(DAPUR_SARI_FALLBACK_FIXTURE.snapshot)`:
- Menghasilkan node pemasok (`supplier_a`, `supplier_b`), bahan (`flour`, `sugar`, `butter`), dan produk (`bread`, `cookies`).
- Menandai `flour` dengan `isSingleSupplier === true` dan `hasBackupSupplier === true`, sementara `sugar` dan `butter` berstatus `supplyClassification === 'stock_only'` (`isSingleSupplier === false`).
- Saat `outage` disimulasikan, menandai edge dari `supplier_a` sebagai `disrupted` dan node `flour` sebagai `bottleneck`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/domain/graph.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/domain/graph.ts`**

Susun layout deterministik 3 kolom (Pemasok x=0, Bahan x=340, Produk x=680), hitung pemasok komitmen unik vs penawaran alternatif per bahan, serta hubungkan metadata dari `ScenarioResult` bila tersedia.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/domain/graph.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/domain/graph.ts tests/domain/graph.test.ts && git commit -m "feat: add supply chain graph builder and single-supplier detector"
```

---

### Task 5: Integrasi Supabase SSR, Middleware Sesi, Repository RLS & Migrasi SQL

**Files:**
- Create: `supabase/migrations/20261125120000_cleanup_legacy_trigger_and_save_rpc.sql`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `proxy.ts` (atau `middleware.ts` sesuai versi Next 16 hasil scaffold)
- Create: `lib/supabase/workspace-repo.ts`
- Test: `tests/supabase/workspace-repo.test.ts`

**Interfaces:**
- Consumes: `WorkspaceData`, `validateWorkspaceData`
- Produces:
  - `loadDemoTemplate(supabase): Promise<WorkspaceData>`
  - `loadUserWorkspace(supabase): Promise<{ businessId: string; data: WorkspaceData }>`
  - `saveUserWorkspace(supabase, businessId: string, data: WorkspaceData): Promise<WorkspaceData>`
  - `resetUserWorkspace(supabase): Promise<{ businessId: string; data: WorkspaceData }>`

- [ ] **Step 1: Write the failing test**

Uji transformasi baris relasional Postgres (`businesses`, `suppliers`, `materials`, `products`, `bom_items`, `committed_deliveries`, `alternative_offers`, `scenarios`) -> `WorkspaceData` kanonik (memastikan UUID `product_id`/`material_id`/`supplier_id` terpetakan bersih kembali ke `slug`, serta verifikasi bahwa `saveUserWorkspace` menolak menghapus 3 skenario inti `baseline`, `outage`, `mitigation`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/supabase/workspace-repo.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement Supabase clients, proxy/middleware, SQL migration, and `workspace-repo.ts`**

- Implementasikan `lib/supabase/client.ts` (`createBrowserClient`), `lib/supabase/server.ts` (`createServerClient` dengan `cookies()` async Next 16), dan `lib/supabase/middleware.ts` (`updateSession`).
- Tulis migrasi SQL `supabase/migrations/20261125120000_cleanup_legacy_trigger_and_save_rpc.sql` (dan terapkan ke Supabase bila sudah disetujui user!).
- Implementasikan `workspace-repo.ts` tanpa pernah memakai `service_role`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/supabase/workspace-repo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase lib/supabase proxy.ts tests/supabase && git commit -m "feat: add Supabase SSR clients, RLS workspace repo, and SQL migration"
```

---

### Task 6: Next.js Route Handlers & Auth Magic Link Callback

**Files:**
- Create: `app/api/demo/route.ts`
- Create: `app/api/simulate/route.ts`
- Create: `app/api/simulate/compare/route.ts`
- Create: `app/api/workspace/route.ts`
- Create: `app/api/workspace/reset/route.ts`
- Create: `app/auth/callback/route.ts`
- Test: `tests/api/routes.test.ts`

**Interfaces:**
- Consumes: `validateWorkspaceData`, `solveScenario`, `compareScenarios`, `computeInputsSignature`, `workspace-repo`
- Produces: REST JSON endpoints untuk mode tamu, solver server-side, dan workspace persisten.

- [ ] **Step 1: Write the failing test**

Uji `POST /api/simulate`, `POST /api/simulate/compare`, `GET /api/workspace`, dan `PUT /api/workspace` secara langsung dengan memanggil handler Next.js (`NextRequest`):
- Mengembalikan HTTP `400` untuk payload tidak valid (mis. stok negatif atau unit salah).
- Mengembalikan HTTP `200` + `inputs_signature` untuk Dapur Sari.
- Mengembalikan HTTP `401` pada `/api/workspace` saat tidak ada sesi pengguna.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/routes.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement all Route Handlers & `/auth/callback`**

Pastikan semua pesan error tampil dalam Bahasa Indonesia yang jelas dan tidak membocorkan stack trace internal.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api app/auth tests/api && git commit -m "feat: add simulation, demo, workspace, and auth callback route handlers"
```

---

### Task 7: Landing Page (`/`) & Halaman Masuk Magic Link (`/login`)

**Files:**
- Modify: `app/layout.tsx`, `app/globals.css`
- Create: `app/page.tsx`
- Create: `app/login/page.tsx`
- Test: `tests/ui/landing-and-login.test.tsx`

**Interfaces:**
- Produces: Landing page berbahasa Indonesia dengan CTA **"Coba Demo Dapur Sari"** -> `/demo`, ringkasan nilai Dapur Sari (`Rp 450 rb` -> `Rp 210 rb` -> pulih `+Rp 132 rb / 55%`), dan halaman `/login` dengan pengiriman Magic Link Supabase.

- [ ] **Step 1: Write the failing test**

Render `HomePage` dan verifikasi keberadaan teks `"Coba Demo Dapur Sari"` mengarah ke `/demo`, tautan login `/login`, dan tidak ada elemen teks placeholder Inggris.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/landing-and-login.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement typography, theme tokens (`globals.css`), `app/page.tsx`, and `app/login/page.tsx`**

Terapkan palet `#F7F8F5` / `#FFFFFF` / `#132A23` / `#0F766E` / `#B45309`, font `Plus Jakarta Sans` + `JetBrains Mono`, responsif mobile hingga desktop, dan dukungan `prefers-reduced-motion`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/landing-and-login.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/globals.css app/page.tsx app/login tests/ui && git commit -m "feat: build Indonesian landing page and Supabase magic link login"
```

---

### Task 8: Jaringan Pasok (React Flow + Mobile List) & Simulator View

**Files:**
- Create: `components/workspace/SupplyGraphView.tsx`
- Create: `components/workspace/SimulatorView.tsx`
- Test: `tests/ui/supply-and-simulator.test.tsx`

**Interfaces:**
- Consumes: `buildSupplyNetwork`, `WorkspaceSnapshot`, `ScenarioConfig`, `ScenarioResult`
- Produces:
  - `SupplyGraphView`: `@xyflow/react` di `sm:block` (`>= 640px`), daftar terstruktur di `sm:hidden` (`< 640px`), klik node membuka detail panel, badge `"Sumber Tunggal"` pada bahan 1-pemasok.
  - `SimulatorView`: pemilih 3+ skenario, kontrol override tanggal batas, toggle pemasok gagal & penawaran alternatif, input `delay_days` per pengiriman, output lengkap (rencana produksi, bahan terpakai/sisa, paket alternatif, biaya premi, kontribusi, status solver), dan penandaan **basi** saat `isStale === true`.

- [ ] **Step 1: Write the failing test**

Uji komponen `SupplyGraphView` (daftar mobile `<640px` + detail node saat diklik + badge `"Sumber Tunggal"` pada Tepung terigu) dan `SimulatorView` (menampilkan rencana produksi, biaya premi, status solver, serta banner basi ketika `isStale = true`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/supply-and-simulator.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `SupplyGraphView.tsx` and `SimulatorView.tsx`**

Pastikan kontras warna, focus-visible ring, serta format angka `id-ID` (`Rp 342.000`, `25.000 g`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/supply-and-simulator.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/workspace/SupplyGraphView.tsx components/workspace/SimulatorView.tsx tests/ui && git commit -m "feat: add React Flow supply graph with mobile list fallback and simulator UI"
```

---

### Task 9: Perbandingan 3 Skenario, Data Usaha Editor & Unified Workspace (`/demo` & `/workspace`)

**Files:**
- Create: `components/workspace/ComparisonView.tsx`
- Create: `components/workspace/BusinessDataView.tsx`
- Create: `components/workspace/MicroChainWorkspace.tsx`
- Create: `app/demo/page.tsx`
- Create: `app/workspace/page.tsx`
- Test: `tests/ui/workspace-stale-and-compare.test.tsx`

**Interfaces:**
- Consumes: `SupplyGraphView`, `SimulatorView`, `compareScenarios` API, `/api/demo`, `/api/workspace`, `/api/workspace/reset`
- Produces: Pengalaman lengkap P0 (tanpa login, `sessionStorage`) dan P1 (auth Supabase, tombol Simpan & Reset ke DB, logout).

- [ ] **Step 1: Write the failing test**

Uji alur terintegrasi `MicroChainWorkspace` (mock `fetch`):
1. Saat mount memuat data awal dan menjalankan simulasi awal otomatis (`isStale === false`).
2. Mengubah stok bahan di tab `Data Usaha` langsung memicu banner **"hasil simulasi sebelumnya sudah basi"** (`isStale === true`).
3. Menekan **"Jalankan Ulang Simulasi"** memanggil `/api/simulate/compare` dan mengembalikan status ke *fresh*.
4. Menekan **"Reset ke Data Awal"** memulihkan angka fixture Dapur Sari.
5. `ComparisonView` menampilkan kontribusi yang dipulihkan dalam `Rp` dan `%`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/workspace-stale-and-compare.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `ComparisonView.tsx`, `BusinessDataView.tsx`, `MicroChainWorkspace.tsx`, `app/demo/page.tsx`, `app/workspace/page.tsx`**

Pastikan semua input angka tervalidasi aman (tidak crash saat user mengetik atau mengosongkan angka), tombol Simpan hanya aktif di mode `/workspace` saat ada perubahan belum tersimpan, dan konfirmasi ditampilkan sebelum Reset.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/workspace-stale-and-compare.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/workspace app/demo app/workspace tests/ui && git commit -m "feat: add scenario comparison, business data editor, and demo/auth workspaces"
```

---

### Task 10: Verifikasi Menyeluruh, Audit Browser & Pembaruan Hub Obsidian

**Files:**
- Modify: `MicroChain Hub.md`, `docs/TASKS.md`, `docs/TODO.md`

- [ ] **Step 1: Jalankan seluruh suite pengujian, typecheck, lint, dan production build**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: Semua unit/integration tests PASS tanpa skip, `tsc` 0 error, ESLint 0 error, Next.js build sukses (termasuk bundling route `/api/simulate*` dengan `highs`).

- [ ] **Step 2: Verifikasi visual & fungsional di browser nyata (`1440px` & `390px`)**

Jalankan `npm run start`, buka `/`, klik `"Coba Demo Dapur Sari"`, verifikasi:
- Jaringan Pasok di `1440px` (graf React Flow tampil, Tepung terigu bertanda Sumber Tunggal, klik node tampil detail) dan di `390px` (daftar tampil, graf disembunyikan).
- Simulator 3 skenario + Perbandingan menampilkan Rp 450.000, Rp 210.000, Rp 342.000, pemulihan +Rp 132.000 (55%).
- Edit stok -> banner basi muncul -> hitung ulang -> fresh -> reset ke fixture awal.
- Cek console browser 0 error.

- [ ] **Step 3: Perbarui Obsidian Project Hub (`MicroChain Hub.md`), `docs/TASKS.md`, `docs/TODO.md` dan commit akhir**

Catat seluruh hasil verifikasi aktual, keputusan arsitektur, serta catatan untuk pengguna tentang deployment Vercel & migrasi Supabase.
