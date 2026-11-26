# MicroChain

Simulasi ketahanan rantai pasok UMKM makanan (demo: Dapur Sari). Next.js 16 (App Router), TypeScript, Tailwind CSS 4, React Flow, solver MILP `highs` (WASM) di server, Supabase (Auth email + kata sandi, Postgres RLS).

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Perintah: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

## Database

Terapkan `supabase/setup.sql` (gabungan semua migrasi, idempoten) lewat Supabase Dashboard > SQL Editor, atau `node scripts/apply-migrations.mjs` dengan `SUPABASE_PROJECT_REF` dan `SUPABASE_ACCESS_TOKEN` (personal access token `sbp_...` dari Account > Access Tokens; password database tidak bisa dipakai di sini). Di Authentication > URL Configuration, daftarkan `<origin>/auth/callback` sebagai Redirect URL.

Login memakai email dan kata sandi (tautan email hanya untuk Lupa kata sandi). Pengguna baru mendapat workspace kosong; data Dapur Sari hanya untuk mode tamu.

Rute: `/` landing, `/dashboard` `/network` `/simulator` `/comparison` `/data` ruang demo tamu (tanpa login), `/login`, `/workspace/*` ruang kerja tersimpan (perlu login). Dokumen desain ada di `docs/`.

## Atribusi dan lisensi

Dilisensikan di bawah [GNU GPL v3.0](LICENSE). Tampilannya berasal dari versi awal repositori ini; rinciannya di [NOTICE.md](NOTICE.md).
