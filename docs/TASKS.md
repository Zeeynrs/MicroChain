---
tags:
  - tasks
  - microchain
project: "[[MicroChain Hub]]"
status: approved
---

# Milestones & Acceptance Criteria (TASKS)

Kembali ke [[MicroChain Hub]] | Lihat [[docs/PRD|PRD]] | Lihat [[docs/superpowers/plans/2026-11-25-microchain|Rencana Implementasi]]

## M1 — Discovery, PRD, Desain & Rencana (Disetujui)
- [x] Inspeksi skema Supabase (`demo_templates`, 8 tabel workspace, RLS, `ensure_demo_workspace`, temuan trigger warisan)
- [x] Tulis [[docs/PRD|PRD]], [[docs/superpowers/specs/2026-11-25-microchain-design|Desain & Arsitektur]], dan selesaikan *builder check*
- [x] Tulis [[docs/superpowers/plans/2026-11-25-microchain|Rencana Implementasi]] + `TASKS.md` + `TODO.md`
- [x] **Approval Gate:** Disetujui pengguna; eksekusi dialihkan ke sesi Claude dengan MCP Supabase aktif

## M2 — Fondasi Next.js, Domain Kanonik & Solver MILP Deterministik (TDD)
- [x] Task 1: Scaffolding `create-next-app@latest` (tanpa `src/`), dependensi, `.env.example`, config `highs` WASM
- [x] Task 2: `types.ts`, `validation.ts` (paritas CHECK Postgres), `signature.ts` (deteksi basi), unit tests
- [x] Task 3: `highs-loader.ts`, `milp-solver.ts`, `compare.ts`, unit tests Dapur Sari + 5 kasus Review Focus
- [x] Task 4: `graph.ts` (pembangun graf 3 kolom + deteksi *single-supplier*), unit tests

## M3 — Backend Next.js & Integrasi Supabase Auth + RLS
- [x] Task 5: Migrasi SQL (`drop on_auth_user_created` + `save_workspace_snapshot` RPC), klien `@supabase/ssr`, `workspace-repo.ts`, unit tests
- [x] Task 6: Route Handlers (`/api/demo`, `/api/simulate`, `/api/simulate/compare`, `/api/workspace`, `/api/workspace/reset`, `/auth/callback`), integration tests

## M4 — UI Berbahasa Indonesia (P0 Demo & P1 Workspace)
- [x] Task 7: Landing `/` + CTA "Coba Demo Dapur Sari" + `/login` Magic Link + UI tests
- [x] Task 8: `SupplyGraphView` (React Flow `>=640px` / daftar `<640px`) + `SimulatorView` + UI tests
- [x] Task 9: `ComparisonView` (Rp & %) + `BusinessDataView` + `MicroChainWorkspace` (`/demo` & `/workspace`) + alur status basi & reset + UI tests

## M5 — Verifikasi Akhir & Hand-off
- [ ] Task 10: `npm test`, `tsc --noEmit`, `npm run lint`, `npm run build`, uji browser `1440px` & `390px`, dan pembaruan [[MicroChain Hub]]

## Decisions Made Autonomously (Pending User Override at Approval Gate)
- Solver MILP server-side memakai `highs` WASM (deterministik via pengurutan entitas kanonik + post-solve 0-premium trim) alih-alih `javascript-lp-solver`.
- `delay_days` disimpan di `scenarios.disruptions` sebagai `{ type: 'delay_delivery', delivery_id, delay_days }`; edit di `SimulatorView` langsung memperbarui skenario di state workspace.
- Tiga skenario inti (`baseline`, `outage`, `mitigation`) dilindungi dari penghapusan dan `slug`-nya mengikat metrik `ComparisonSummary`, sedangkan skenario ke-4+ bersifat opsional.
- Simulasi dijalankan otomatis sekali saat awal membuka `/demo` & `/workspace`, tidak auto-solve di tiap ketikan agar status **basi** (*stale*) terlihat jelas, dan penyimpanan ke DB di `/workspace` memakai tombol eksplisit **"Simpan ke Workspace"**.
- `businesses.slug` workspace pengguna tetap `'dapur_sari'` agar reset via `ensure_demo_workspace(true)` konsisten, sedangkan nama & sektor usaha bebas diubah.

## Catatan Eksekusi (Claude, 2026-11-25)
- **Task 10 sebagian selesai:** `npm test` 116/116, `tsc --noEmit`, `npm run lint`, `npm run build` bersih; uji browser `1440px` dan `390px` selesai terhadap server tiruan PostgREST (tanpa `console` galat, tanpa overflow horizontal). **Belum:** uji end-to-end terhadap database Supabase nyata (lihat BLOCKED).
- **Database (selesai 2026-11-25):** 4 migrasi diterapkan ke proyek Supabase lewat Postgres pooler. Diverifikasi di transaksi yang di-rollback dengan dua pengguna palsu: `ensure_demo_workspace` idempoten, `save_workspace_snapshot` menjaga UUID stabil dan menolak referensi menggantung serta hilangnya skenario inti, reset membuat ulang data, RLS mengisolasi antar-pengguna, `anon` ditolak. `/api/demo` + `/api/simulate/compare` terhadap DB asli: Rp 450.000 / 210.000 / 342.000, pulih Rp 132.000.
- **Masih perlu pengguna:** daftarkan `<origin>/auth/callback` di Auth > URL Configuration, uji Magic Link dengan email asli (tidak bisa diotomatisasi), deploy Vercel.

## Decisions Made Autonomously (Claude)
- Skema lengkap dibuat ulang lewat migrasi karena project target kosong (Hub lama merujuk `zphvhcfjurhgxeilkbkk`). Migrasi dipecah: `..110000_microchain_schema`, `..115000_seed_demo_template` (dibangkitkan dari fixture oleh `scripts/gen-seed-migration.mts`), `..120000_save_workspace_and_ensure_demo_rpc`, `..130000_cleanup_legacy_auth_trigger`.
- `ensure_demo_workspace` memanggil `save_workspace_snapshot` (upsert per slug, UUID stabil) agar satu jalur kode untuk klon dan simpan.
- Signature basi memakai SHA-256 TypeScript sinkron (`lib/domain/sha256.ts`) agar identik di klien dan server; nama, catatan, dan metadata tampilan tidak ikut sehingga tidak ada status basi palsu.
- Mutasi entitas (tambah/hapus dengan cascade) dipisah ke `lib/domain/mutations.ts` dan diuji; `validateSimulationInput` tidak mewajibkan 3 skenario inti, `validateWorkspaceData` mewajibkannya.
- Next.js 16 memakai `proxy.ts` (bukan `middleware.ts`); `vitest@5` + `@types/node@24` dipilih agar sesuai peer `@testing-library/jest-dom@8`.

## Redesain UI (2026-11-25, branch feat/pasok-siaga-ui)
- Tampilan mengikuti Zeeynrs/Pasok-Siaga: CSS, foto hero, landing, sidebar ruang kerja, halaman dashboard/network/simulator/comparison/data. Merek tetap MicroChain.
- Rute demo tamu di `/dashboard` dst; workspace login di `/workspace/*`; `/demo` mengalihkan ke `/dashboard`.
- Fitur MicroChain dipertahankan: login Magic Link, simpan/reset workspace, status hasil basi, skenario kustom, keterlambatan pengiriman, editor struktur usaha.
- `lib/view-models.ts` mengubah hasil solver ke tipe tampilan; `lib/solver/inputs.ts` dipakai solver dan analisis jaringan.
- `cacheComponents`/`partialPrefetching` dihapus dari `next.config.ts` (diagnostik eksperimental, tidak dipakai referensi).
- Lisensi: kode/aset dari repo GPL-3.0, lihat `NOTICE.md`. Sejak 2026-11-26 proyek menjadi fork publik berlisensi GPL-3.0 (`LICENSE`).

## Akun dan login (2026-11-25)
- User Auth dibuat lewat Admin API (secret key); user penanda uji dihapus. Diverifikasi dengan JWT user: ensure_demo_workspace membentuk 8 tabel, RLS menolak anon, GET/PUT/reset /api/workspace lolos, tanpa cookie 401.
- Galat HMR ws://192.168.56.1: diperbaiki dengan allowedDevOrigins di next.config.ts (perlu restart server dev).
- proxy.ts meneruskan ?code= di / ke /auth/callback bila Redirect URL belum didaftarkan di Supabase.
- Buka aplikasi lewat http://localhost:3000 (bukan IP jaringan) saat login: verifier PKCE tersimpan per origin.

- Login kata sandi ditambahkan di /login (default) + Daftar Akun Baru; Magic Link tetap sebagai tab kedua. Diverifikasi di Supabase asli: sandi benar 200, salah invalid_credentials. Catatan: mailer_autoconfirm=false, jadi Daftar Akun Baru dan Magic Link sama-sama mengirim email (batas bawaan kecil); akun tanpa email dibuat lewat Admin API.

## Keputusan akun (2026-11-25)
- Login hanya kata sandi (Masuk, Daftar Akun Baru). Tautan email HANYA untuk Lupa kata sandi: resetPasswordForEmail -> /auth/callback?next=/reset-password -> halaman /reset-password (updateUser). Cookie microchain-reset menjadi cadangan bila Supabase membuang parameter next. Galat pengiriman email dipetakan ke pesan Indonesia.
- Pengguna login TIDAK lagi mendapat salinan Dapur Sari: RPC ensure_workspace membuat workspace kosong (Usaha Saya, 3 skenario inti, slug usaha). ensure_demo_workspace dihapus. Dapur Sari hanya untuk mode tamu (demo_templates).
- Tombol workspace: Reset menjadi Kosongkan Data (dengan konfirmasi). Dashboard menampilkan panel Mulai dari nol bila workspace kosong.
- Salinan Dapur Sari lama di akun uji dihapus; diverifikasi dengan JWT akun: 0 pemasok/bahan/produk, 3 skenario, ensure_workspace idempoten.

## Notifikasi dan UI mobile (2026-11-25)
- Notifikasi toast (sonner 2.0.8, lib/notify.ts, components/toaster.tsx) untuk tiap aksi CRUD: tambah/hapus pemasok, bahan, produk, pengiriman, penawaran, skenario (langsung); ubah isian digabung (debounce 700 ms); terapkan parameter, simpan workspace, reset/kosongkan, galat simulasi/simpan/perbandingan, keluar, ubah kata sandi.
- Mobile: navigasi tab di bawah (fixed, safe-area), bilah atas lengket dengan tombol Simpan/Keluar ringkas, toast naik di atas navigasi, panel Data Usaha berupa akordeon dengan jumlah item (tertutup di ponsel), panel Mulai dari nol berisi 3 langkah, input 16px agar tidak zoom di iOS.

## Onboarding dan coach marks (2026-11-26)
- Layar pengantar 4 slide (carousel, geser/tombol/titik, dialog modal beraksesibilitas) dengan ilustrasi WebP di public/onboarding/; slide terakhir menawarkan Mulai Panduan Interaktif atau Langsung Pakai. Tampil otomatis pada kunjungan pertama (localStorage microchain:onboarding:v1, dengan cadangan memori bila localStorage diblokir).
- Panduan interaktif (coach marks) 12 langkah dengan sorotan beranimasi yang berpindah antar-halaman (demo: langkah Mode demo; workspace: langkah Simpan). Target ditandai atribut data-tour. Di ponsel kartu dipasang di atas atau di bawah target agar tidak menutupi navigasi bawah. Menu Bantuan di bilah atas membuka ulang pengantar atau panduan.
- Aset gambar: agy (Antigravity CLI) dicoba membuatnya lewat subagen image-generator, tetapi model gambar server mengembalikan HTTP 503 No capacity pada semua percobaan (5x per gambar). Ilustrasi saat ini dibuat sebagai vektor (docs/assets/onboarding/*.svg) lalu dikonversi ke WebP 1200x900. Untuk menggantinya dengan buatan agy, jalankan brief docs/assets/onboarding/BRIEF-agy.md dan timpa berkas dengan nama yang sama di public/onboarding/.
