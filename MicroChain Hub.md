---
tags:
  - hub
  - microchain
project: "[[MicroChain Hub]]"
status: approved
---

# MicroChain Hub

Alat simulasi ketahanan rantai pasok untuk UMKM makanan (demo: **Dapur Sari**), dibangun dengan Next.js App Router, TypeScript, Tailwind CSS, React Flow, solver MILP server-side (`highs` WASM), dan Supabase (Auth email + kata sandi, Postgres RLS).

## Last Handoff / Current State
- **Status (2026-11-26):** dipublikasikan ke `main` pada fork GitHub `ICR-1/Micro-Chain` dari [Zeeynrs/Pasok-Siaga](https://github.com/Zeeynrs/Pasok-Siaga), berlisensi GPL-3.0. Riwayat kedua proyek digabung tanpa force-push.
- **Sudah ada:** tampilan mengikuti Pasok-Siaga, login kata sandi dan Lupa kata sandi, workspace kosong untuk pengguna baru, notifikasi CRUD, navigasi bawah di ponsel, onboarding dan coach marks.
- **Database:** migrasi di `supabase/` sudah diterapkan dan diverifikasi (RPC, RLS, reset, isolasi pengguna).
- **Keputusan kunci:** solver `highs` WASM terverifikasi di `next start`; signature basi SHA-256 sinkron (klien = server); `proxy.ts` (Next 16); angka referensi Dapur Sari cocok PRD (Rp 450.000 / 210.000 / 342.000, pulih 55% dan 76%). Detail: [[docs/TASKS]].
- **Langkah berikutnya:** daftarkan `<origin>/auth/callback` di Auth > URL Configuration, uji email Lupa kata sandi, lalu deploy Vercel (set `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## Dokumen Perencanaan
- [[docs/PRD|Product Requirements Document (PRD)]] — Masalah, pengguna UMKM, ruang lingkup P0/P1, angka referensi Dapur Sari, dan risiko.
- [[docs/superpowers/specs/2026-11-25-microchain-design|Arsitektur & Desain Sistem]] — Model domain kanonik, keputusan desain hasil *builder check*, formulasi matematis MILP, skema Postgres + RLS, kontrak API, serta arah UI `frontend-design`.
- [[docs/superpowers/plans/2026-11-25-microchain|Rencana Implementasi (TDD)]] — 10 tugas implementasi terverifikasi lengkap dengan *Review Focus*, kontrak antarmuka, dan skenario test.
- [[docs/TASKS|Daftar Milestone (TASKS)]] — Milestone, kriteria penerimaan, dan daftar keputusan desain otonom.
- [[docs/TODO|Checklist Aktif (TODO)]] — Status langkah harian selama implementasi.
