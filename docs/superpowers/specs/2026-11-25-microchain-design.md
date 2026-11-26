---
tags:
  - spec
  - architecture
  - microchain
project: "[[MicroChain Hub]]"
status: approved
---

# Dokumen Desain & Arsitektur: MicroChain

Kembali ke [[MicroChain Hub]] | Lihat [[docs/PRD|PRD]] | Lihat [[docs/superpowers/plans/2026-11-25-microchain|Rencana Implementasi]]

## 1. Ringkasan Intent, Tujuan & Batasan
- **Intent:** Aplikasi web berbahasa Indonesia untuk memetakan ketergantungan pemasok UMKM makanan dan menghitung rencana produksi + pembelian alternatif optimal secara deterministik saat pemasok utama gagal/terlambat.
- **Batasan Wajib Stack:**
  - Next.js App Router (`npx create-next-app@latest`, TypeScript, Tailwind CSS, ESLint, **tanpa folder `src/`**).
  - Supabase Auth (Email Magic Link), Postgres + RLS, `@supabase/ssr` & `@supabase/supabase-js`.
  - Seluruh logika backend dan optimasi berjalan di server Next.js (Route Handlers). **Dilarang** memakai FastAPI, Python, atau Docker.
  - Deploy target Vercel + Supabase Cloud; semua kunci rahasia/konfigurasi lewat env var dengan `.env.example`.

## 2. Pilihan Pendekatan & Keputusan Teknis (Rekomendasi)

### A. Mesin Optimasi MILP Server-Side
- **Opsi 1 — `highs` (HiGHS WASM, direkomendasikan):** Solver MILP berstandar riset operasi (C++ dikompilasi ke WebAssembly) dengan format CPLEX LP eksplisit, tipe TypeScript bawaan, determinisme penuh saat entitas diurutkan kanonik, serta status solver akurat (`Optimal`, `Infeasible`, `Unbounded`). *Trade-off:* Membutuhkan `serverExternalPackages: ['highs']` dan `outputFileTracingIncludes` di `next.config.ts` agar `.wasm` terbawa di Vercel Serverless.
- **Opsi 2 — `javascript-lp-solver` / `yalps` (pure JS):** Tanpa berkas `.wasm`, sangat ringan. *Trade-off:* `javascript-lp-solver` tidak memiliki tipe TS resmi dan rentan kendala numerik/presisi pada varian MILP tertentu dibanding HiGHS.
- **Keputusan Desain:** Gunakan **`highs` WASM** dengan modul adaptor terisolasi (`lib/solver/milp-solver.ts`) yang mengurutkan seluruh entitas berdasarkan `id` (`slug`) naik dan mengonfigurasi loader `.wasm` aman untuk Node.js, Vitest, dan Vercel.

### B. Strategi Mode Tamu (P0) vs Workspace Persisten (P1)
- **Opsi 1 — Satu Kontrak Domain Kanonik + Dua Adaptor Persistensi (direkomendasikan):** Satu komponen workspace (`components/workspace/MicroChainWorkspace.tsx`) bekerja di atas tipe kanonik `WorkspaceData` (`snapshot` + `scenarios`). Rute `/demo` memakai adaptor `sessionStorage` yang disinkronkan dari `GET /api/demo` (membaca `demo_templates`). Rute `/workspace` memakai adaptor HTTP (`GET/PUT /api/workspace` & `POST /api/workspace/reset`) yang membaca/menulis 8 tabel Postgres milik pengguna di bawah RLS.
- **Keputusan Desain:** Gunakan **Satu Kontrak Kanonik + Dua Adaptor**.

### C. Arah Desain UI (`frontend-design`)
MicroChain adalah aplikasi kerja operasional/analitik UMKM (`frontend-design` + aturan aksesibilitas & fokus visual, bukan situs pemasaran):
- **Palet Warna (5 hex utama, kontras tinggi):**
  - `#F7F8F5` (*Kanvas Dapur Hangat* — latar utama)
  - `#FFFFFF` (*Kartu Kertas* — permukaan panel & node graf)
  - `#132A23` (*Tinta Pinus Gelap* — tipografi utama & bilah navigasi)
  - `#0F766E` (*Hijau Teal Operasional* — aksi primer, status aman/pulih)
  - `#B45309` (*Amber Peringatan* — tanda *Single-Supplier* & status *stale*) + `#BE123C` (*Crimson Kritis* — gangguan pemasok gagal)
- **Tipografi:** `Plus Jakarta Sans` (UI & heading Indonesia) + `JetBrains Mono` (`tabular-nums`) khusus nominal Rupiah, unit bahan, dan tanggal.
- **Tata Letak:**
  - Landing (`/`): Hero editorial ringkas + cuplikan kasus Dapur Sari + CTA `"Coba Demo Dapur Sari"` dan `"Masuk dengan Email"`.
  - Workspace (`/demo`, `/workspace`): Bilah atas status mode, penanda simulasi basi global, tombol Simpan (khusus `/workspace`) & Reset, serta 4 tab (`Jaringan Pasok`, `Simulator`, `Perbandingan`, `Data Usaha`).

## 3. Model Domain Kanonik & Keputusan Semantik

### Kontrak Tipe Kanonik (`lib/domain/types.ts`)
- `BusinessInfo`: `{ id: string; name: string; sector: string; currency: 'IDR'; planning_cutoff_date: string; scenario_date: string; created_at?: string }`
- `Supplier`: `{ id: string; name: string; active: boolean; notes: string }`
- `Material`: `{ id: string; name: string; unit_kind: 'mass' | 'volume' | 'count'; base_unit: 'g' | 'ml' | 'pcs'; stock_on_hand: number }`
- `Product`: `{ id: string; name: string; demand_units: number; unit_contribution_idr: number }`
- `BomItem`: `{ product_id: string; material_id: string; quantity_per_product: number }`
- `CommittedDelivery`: `{ id: string; supplier_id: string; material_id: string; quantity_base_units: number; arrival_date: string; enabled_in_baseline: boolean }`
- `AlternativeOffer`: `{ id: string; supplier_id: string; material_id: string; pack_size_base_units: number; max_packs: number; lead_days: number; incremental_premium_idr_per_pack: number; enabled_in_scenario: boolean }`
- `DeliveryDisruption`: `{ type: 'delay_delivery'; delivery_id: string; delay_days: number }` (disimpan di `scenarios.disruptions` jsonb)
- `ScenarioOverrides`: `{ stock_by_material?: Record<string, number>; demand_by_product?: Record<string, number> }` (disimpan di `scenarios.overrides` jsonb)
- `ScenarioConfig`: `{ id: string; name: string; cutoff_date: string; disabled_supplier_ids: string[]; enabled_offer_ids: string[]; disruptions: DeliveryDisruption[]; overrides: ScenarioOverrides; source: 'demo' | 'user' }`
- `WorkspaceSnapshot`: `{ business: BusinessInfo; suppliers: Supplier[]; materials: Material[]; products: Product[]; bom: BomItem[]; committed_deliveries: CommittedDelivery[]; alternative_offers: AlternativeOffer[]; scenario_date: string; demo_data: boolean }`

### Keputusan Desain atas Hal Detail (`[Keputusan Desain]`)
1. **Granularitas `delay_days` & `SimulatorView` overrides:**
   - `delay_days` (`0..365`, bilangan bulat) disimpan per pengiriman di `scenario.disruptions` sebagai `{ type: 'delay_delivery', delivery_id, delay_days }`.
   - Perubahan parameter di `SimulatorView` (`cutoff_date`, toggle `disabled_supplier_ids`, toggle `enabled_offer_ids`, `delay_days` per pengiriman) langsung memperbarui objek `ScenarioConfig` yang sedang dipilih di state workspace sehingga `ComparisonView`, `computeInputsSignature`, dan `PUT /api/workspace` selalu konsisten.
2. **Interaksi Flag Global vs List Skenario:**
   - Entitas baru yang dibuat pengguna (`Supplier`, `CommittedDelivery`, `AlternativeOffer`) otomatis berstatus aktif (`active = true`, `enabled_in_baseline = true`, `enabled_in_scenario = true`).
   - Flag global adalah gerbang utama: jika `supplier.active === false`, pemasok nonaktif di semua skenario; jika `offer.enabled_in_scenario === false`, toggle penawaran tersebut di `SimulatorView` ditampilkan nonaktif beserta label `"Dinonaktifkan di Data Usaha"` agar tidak pernah menghasilkan kapasitas 0 secara diam-diam.
3. **Skenario Inti vs Kustom:**
   - Tiga skenario inti (`id`: `'baseline'`, `'outage'`, `'mitigation'`) selalu ada, tidak dapat dihapus, dan `id`/`slug`-nya terkunci sebagai penanda peran pada `ComparisonSummary` (namanya boleh diubah).
   - Pengguna dapat menambah skenario kustom ke-4 dst. (maks total `10` skenario, `source: 'user'`), yang dapat dijalankan di `SimulatorView` dan ditampilkan sebagai baris tambahan di `ComparisonView`, sementara KPI utama (`loss_idr`, `recovered_idr`, `recovered_pct`) selalu membandingkan `baseline` vs `outage` vs `mitigation`.
4. **Simulasi Awal, Status Basi (*Stale*), & Simpan Eksplisit:**
   - Saat `/demo` atau `/workspace` dimuat pertama kali, klien langsung memanggil `POST /api/simulate/compare` sehingga hasil awal Dapur Sari langsung tampil (status *fresh*).
   - Setiap perubahan input pada `snapshot` atau `scenarios` mengubah `computeInputsSignature(snapshot, scenarios)` dan langsung menandai hasil lama sebagai **basi** (*stale*) sampai pengguna menekan **"Jalankan Ulang Simulasi"** (tidak auto-solve di tiap ketikan agar pengguna melihat penanda basi secara nyata).
   - Di `/workspace` (P1), perubahan data persisten menggunakan tombol eksplisit **"Simpan ke Workspace"** (`PUT /api/workspace`) + indikator perubahan belum tersimpan (`dirty`) dan peringatan `beforeunload`. Hasil simulasi bersifat transien di sesi browser (dihitung ulang di server on-demand, tidak disimpan di tabel `scenarios`).
5. **Identitas Usaha (`slug = 'dapur_sari'`):**
   - Setiap pengguna terautentikasi memiliki satu workspace utama dengan `businesses.slug` terkunci ke `'dapur_sari'`. Pengguna bebas mengubah `name` (mis. `"Toko Kue Maju"`), `sector`, `planning_cutoff_date`, dan `scenario_date`, sementara `slug` tetap `'dapur_sari'` agar `ensure_demo_workspace(true)` untuk reset selalu konsisten.

## 4. Formulasi Matematis Solver & Aturan Tanggal

Untuk setiap `(snapshot, scenario)`:
1. **Pemasok aktif:** `supplier.active === true` dan `!scenario.disabled_supplier_ids.includes(supplier.id)`.
2. **Pengiriman terjadwal (`committed_deliveries`):**
   - `delay_days` = total keterlambatan dari `scenario.disruptions` untuk `delivery.id` (default `0`).
   - `effective_arrival = addDays(delivery.arrival_date, delay_days)`.
   - Masuk ke stok tersedia jika `delivery.enabled_in_baseline === true`, pemasoknya aktif, dan `effective_arrival <= scenario.cutoff_date`. Jika tidak, `counted = false` disertai alasan eksplisit (`"Pemasok dinonaktifkan"`, `"Nonaktif di baseline"`, atau `"Tiba <tgl> melewati batas <cutoff>"`).
3. **Penawaran alternatif (`alternative_offers`):**
   - `arrival_date = addDays(snapshot.scenario_date, offer.lead_days)`.
   - Layak dibeli jika `offer.enabled_in_scenario === true`, `scenario.enabled_offer_ids.includes(offer.id)`, pemasoknya aktif, dan `arrival_date <= scenario.cutoff_date`. Jika tidak, `eligible = false`, `effective_max_packs = 0`, disertai alasan eksplisit.
4. **Variabel Integer (`General`):**
   - `x_p ∈ ℤ ∩ [0, effective_demand(p)]` untuk setiap produk `p` (menggunakan `scenario.overrides.demand_by_product[p.id]` bila ada, else `p.demand_units`).
   - `y_o ∈ ℤ ∩ [0, effective_max_packs(o)]` untuk setiap penawaran alternatif `o`.
5. **Kendala Bahan Baku (untuk tiap bahan `m`):**
   $$\sum_{p} \text{qty}(p, m) \cdot x_p - \sum_{o \in O_m} \text{pack\_size}(o) \cdot y_o \le \text{effective\_stock}(m) + \text{committed\_arriving}(m)$$
6. **Objektif:**
   $$\max \sum_{p} \text{unit\_contribution\_idr}(p) \cdot x_p - \sum_{o} \text{incremental\_premium\_idr\_per\_pack}(o) \cdot y_o$$
7. **Determinisme & Post-Solve Zero-Premium Trim:**
   - Seluruh entitas diurutkan berdasarkan `id` naik sebelum menyusun string LP.
   - Jika terdapat `y_o > 0` dengan `incremental_premium_idr_per_pack === 0` dan bahan `m` memiliki sisa berlebih (`remaining(m) >= pack_size(o)`), pangkas `y_o` sebesar `min(y_o, floor(remaining(m) / pack_size(o)))` (urut `offer.id` menurun) agar tidak membeli pak gratis yang tidak dipakai.
8. **Metrik `ComparisonSummary`:**
   - `loss_idr = Math.max(0, baseline.net_contribution_idr - outage.net_contribution_idr)`
   - `loss_pct_of_baseline = baseline.net_contribution_idr > 0 ? (loss_idr / baseline.net_contribution_idr) * 100 : 0`
   - `recovered_idr = mitigation.net_contribution_idr - outage.net_contribution_idr`
   - `recovered_pct_of_loss = loss_idr > 0 ? (recovered_idr / loss_idr) * 100 : (recovered_idr >= 0 ? 100 : 0)`
   - `recovered_pct_of_baseline = baseline.net_contribution_idr > 0 ? (mitigation.net_contribution_idr / baseline.net_contribution_idr) * 100 : 0`

## 5. Spesifikasi Skema Database Supabase & RLS (Terverifikasi dari Live DB)

Instance target: `zphvhcfjurhgxeilkbkk.supabase.co`.

### Tabel & Batasan CHECK / UNIQUE
1. `public.demo_templates`: `id text PK`, `payload jsonb NOT NULL`, `updated_at timestamptz NOT NULL DEFAULT now()`. RLS: `SELECT` publik (`anon, authenticated`). Baris `'dapur_sari'` berisi `{ demo_data: true, snapshot: { business, suppliers, materials, products, bom, committed_deliveries, alternative_offers, scenario_date, demo_data }, scenarios: [{ id, name, source, overrides, cutoff_date, disruptions, enabled_offer_ids, disabled_supplier_ids }] }`.
2. `public.businesses`: `id uuid PK`, `owner_id uuid NOT NULL REFERENCES auth.users`, `slug text CHECK (~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$')`, `name text CHECK (btrim 1..100)`, `sector text CHECK (btrim 1..100)`, `currency text DEFAULT 'IDR' CHECK (= 'IDR')`, `planning_cutoff_date date NOT NULL`, `scenario_date date NOT NULL`, `is_demo_template bool DEFAULT false`, `created_at timestamptz`, `updated_at timestamptz`. Unique `(owner_id, slug)` & `(id, owner_id)`.
3. `public.suppliers`: `id uuid PK`, `business_id uuid`, `owner_id uuid`, `slug text`, `name text (1..100)`, `active bool DEFAULT true`, `notes text DEFAULT '' (len <= 500)`. Unique `(business_id, slug)` & `(id, owner_id)`. FK komposit `(business_id, owner_id)` -> `businesses(id, owner_id)`.
4. `public.materials`: `id uuid PK`, `business_id uuid`, `owner_id uuid`, `slug text`, `name text (1..100)`, `unit_kind text CHECK ('mass'|'volume'|'count')`, `base_unit text`, CHECK `materials_check`: `(mass->g | volume->ml | count->pcs)`, `stock_on_hand int4 CHECK (0..1000000)`. Unique `(business_id, slug)` & `(id, owner_id)`.
5. `public.products`: `id uuid PK`, `business_id uuid`, `owner_id uuid`, `slug text`, `name text (1..100)`, `demand_units int4 CHECK (0..1000000)`, `unit_contribution_idr int4 CHECK (0..10000000)`. Unique `(business_id, slug)` & `(id, owner_id)`.
6. `public.bom_items`: `id uuid PK`, `business_id uuid`, `owner_id uuid`, `product_id uuid`, `material_id uuid`, `quantity_per_product int4 CHECK (1..1000000)`. Unique `(product_id, material_id)`. FK komposit ke `businesses`, `products`, `materials` dengan `owner_id`.
7. `public.committed_deliveries`: `id uuid PK`, `business_id uuid`, `owner_id uuid`, `slug text`, `supplier_id uuid`, `material_id uuid`, `quantity_base_units int4 CHECK (1..1000000)`, `arrival_date date`, `enabled_in_baseline bool DEFAULT true`. Unique `(business_id, slug)`.
8. `public.alternative_offers`: `id uuid PK`, `business_id uuid`, `owner_id uuid`, `slug text`, `supplier_id uuid`, `material_id uuid`, `pack_size_base_units int4 CHECK (1..1000000)`, `max_packs int4 CHECK (0..1000000)`, `lead_days int4 CHECK (0..365)`, `incremental_premium_idr_per_pack int4 CHECK (0..10000000)`, `enabled_in_scenario bool DEFAULT true`. Unique `(business_id, slug)`.
9. `public.scenarios`: `id uuid PK`, `business_id uuid`, `owner_id uuid`, `slug text`, `name text (1..100)`, `cutoff_date date`, `disabled_supplier_slugs text[] DEFAULT '{}'`, `enabled_offer_slugs text[] DEFAULT '{}'`, `disruptions jsonb DEFAULT '[]'`, `overrides jsonb DEFAULT '{}'`, `source text DEFAULT 'demo' CHECK ('demo'|'user')`. Unique `(business_id, slug)`.
- **Seluruh 8 tabel user** mengaktifkan RLS untuk role `authenticated` pada `SELECT/INSERT/UPDATE/DELETE` dengan predikat `((SELECT auth.uid()) = owner_id)`.
- **RPC Eksisting:** `public.ensure_demo_workspace(p_reset boolean DEFAULT false) RETURNS uuid` (INVOKER, lock per `auth.uid()`, mengembalikan `v_business_id` yang ada atau menghapus & mengkloning ulang dari `demo_templates` `dapur_sari` bila `p_reset = true`).

### Migrasi yang Diperlukan (Menunggu Persetujuan Pengguna)
File: `supabase/migrations/20261125120000_cleanup_legacy_trigger_and_save_rpc.sql`
1. **Wajib untuk Auth Magic Link:** Hapus trigger warisan `on_auth_user_created` pada `auth.users` dan fungsi `public.handle_new_user()` (karena mencoba `INSERT INTO public.business_profiles` yang tidak ada).
2. *(Opsional sesuai persetujuan)* Hapus fungsi warisan non-MicroChain `public.apply_price_changes(jsonb)` dan `public.replace_with_sample_data(jsonb)`.
3. **Atomicity Simpan Workspace:** Tambahkan RPC `public.save_workspace_snapshot(p_business_id uuid, p_payload jsonb) RETURNS void` (INVOKER, `SET search_path TO ''`, memverifikasi `auth.uid()` pemilik `businesses.id`, melakukan update/upsert/delete dalam 1 transaksi SQL). *(Catatan: apabila migrasi RPC belum diterapkan di remote saat pengujian lokal, `workspace-repo.ts` tetap mendukung fallback sinkronisasi berurutan child->parent delete & parent->child upsert di bawah RLS, namun migrasi trigger auth wajib diterapkan sebelum uji sign-up baru).*
- **Rollback migrasi:** `DROP FUNCTION IF EXISTS public.save_workspace_snapshot(uuid, jsonb);`. Trigger `on_auth_user_created` tidak dianjurkan dikembalikan karena tabel `business_profiles` memang tidak ada.

## 6. Kontrak API & Keamanan
- `GET /api/demo` -> `200 { snapshot, scenarios }` dari `demo_templates`.
- `POST /api/simulate` -> Body `{ snapshot, scenario }` (divalidasi Zod) -> `200 { result: ScenarioResult, inputs_signature: string }` | `400`.
- `POST /api/simulate/compare` -> Body `{ snapshot, scenarios }` -> `200 { results: ScenarioResult[], comparison: ComparisonSummary, inputs_signature: string }` | `400`.
- `GET /api/workspace` -> Cek `supabase.auth.getUser()` -> panggil `ensure_demo_workspace(false)` jika belum ada -> `200 { businessId, snapshot, scenarios }` | `401`.
- `PUT /api/workspace` -> Cek user -> validasi Zod (plus larangan menghapus 3 skenario inti `baseline`, `outage`, `mitigation`) -> simpan via RLS -> `200 { ok: true, snapshot, scenarios }` | `400` | `401`.
- `POST /api/workspace/reset` -> Cek user -> panggil `ensure_demo_workspace(true)` -> muat ulang -> `200 { businessId, snapshot, scenarios }` | `401`.
- `GET /auth/callback` -> `exchangeCodeForSession(code)` -> `ensure_demo_workspace(false)` -> redirect `/workspace`.
- **Middleware / Proxy Session:** Segarkan token sesi Supabase pada request halaman/API via `@supabase/ssr` tanpa memblokir akses publik ke `/`, `/demo`, `/login`, `/api/demo`, `/api/simulate*`.
- **Env Vars (`.env.example`):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
