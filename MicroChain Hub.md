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
- **Status (2026-11-26):** MicroChain sudah di-merge ke `main` repo bersama [Zeeynrs/MicroChain](https://github.com/Zeeynrs/MicroChain) (PR #3; dulu bernama Pasok-Siaga), berlisensi GPL-3.0. Remote lokal: `origin` repo bersama, `fork` milik `ICR-1`.
- **Sudah ada:** halaman masuk *split-screen* editorial (`app/login/page.tsx`, `app/login/LoginForm.tsx`, `public/login-kitchen.webp`) dengan kata sandi + toggle tampilkan sandi dan Lupa kata sandi, workspace kosong untuk pengguna baru, notifikasi CRUD, navigasi bawah di ponsel, onboarding dan coach marks, serta landing page editorial lengkap (`app/page.tsx`, `components/landing/hero-video-bg.tsx`, `components/landing/landing-carousel.tsx`, `components/landing/landing-interactive.tsx`, `components/landing/landing-motion.tsx`) dengan **hero latar video animasi 60fps *seamless loop*** (`public/landing/hero-kitchen-bg.mp4` + `public/landing/hero-kitchen-poster.webp` & tombol Jeda/Putar), **carousel interaktif 4 skenario UMKM kuliner** (`public/dapur-sari.webp` + `public/landing/carousel-{kopi,dimsum,martabak}.webp`), **grid foto editorial WebP 2×2 tantangan pasokan** (`public/landing/pain-1-sumber-tunggal.webp`, `pain-2-prioritas.webp`, `pain-3-premi.webp`, `pain-4-batas-waktu.webp`), pratinjau interaktif 3 skenario + *slider* Pemasok B, 4 foto modul *real-life* WebP (`public/landing/modul-*.webp`), papan perbandingan manual vs MicroChain, FAQ, dan animasi *scroll* responsif GSAP (`ScrollTrigger` + `gsap.matchMedia()`).
- **Database:** migrasi di `supabase/` sudah diterapkan dan diverifikasi (RPC, RLS, reset, isolasi pengguna).
- **Keputusan kunci:** solver `highs` WASM terverifikasi di `next start`; signature basi SHA-256 sinkron (klien = server); `proxy.ts` (Next 16); angka referensi Dapur Sari cocok PRD (Rp 450.000 / 210.000 / 342.000, pulih 55% dan 76%). Detail: [[docs/TASKS]].
- **Langkah berikutnya:** daftarkan `<origin>/auth/callback` di Auth > URL Configuration, uji email Lupa kata sandi, lalu deploy Vercel (set `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## Dokumen Perencanaan
- [[docs/PRD|Product Requirements Document (PRD)]] — Masalah, pengguna UMKM, ruang lingkup P0/P1, angka referensi Dapur Sari, dan risiko.
- [[docs/superpowers/specs/2026-11-25-microchain-design|Arsitektur & Desain Sistem]] — Model domain kanonik, keputusan desain hasil *builder check*, formulasi matematis MILP, skema Postgres + RLS, kontrak API, serta arah UI `frontend-design`.
- [[docs/superpowers/plans/2026-11-25-microchain|Rencana Implementasi (TDD)]] — 10 tugas implementasi terverifikasi lengkap dengan *Review Focus*, kontrak antarmuka, dan skenario test.
- [[docs/TASKS|Daftar Milestone (TASKS)]] — Milestone, kriteria penerimaan, dan daftar keputusan desain otonom.
- [[docs/TODO|Checklist Aktif (TODO)]] — Status langkah harian selama implementasi.
