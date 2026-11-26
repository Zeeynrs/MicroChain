---
tags:
  - prd
  - microchain
project: "[[MicroChain Hub]]"
status: approved
---

# Product Requirements Document (PRD): MicroChain

Kembali ke [[MicroChain Hub]] | Lihat [[docs/superpowers/specs/2026-11-25-microchain-design|Dokumen Desain]]

## 1. Masalah & Latar Belakang
Pemilik UMKM makanan (seperti toko roti, kue rumahan, dan katering skala mikro) sering bergantung pada pemasok tunggal untuk bahan baku utama tanpa memetakan dampaknya terhadap menu. Ketika pemasok utama terlambat atau gagal kirim:
- Pemilik tidak mengetahui produk mana yang masih paling menguntungkan untuk tetap diproduksi dengan sisa stok di dapur.
- Keputusan membeli bahan dari pemasok cadangan (yang harganya lebih mahal atau butuh *lead time*) dilakukan secara kira-kira tanpa menghitung margin bersih.

**MicroChain** membantu pemilik UMKM melihat ketergantungan pemasok secara visual, mensimulasikan gangguan pengiriman secara deterministik, membandingkan dampak finansial sebelum dan sesudah mitigasi, serta mengelola skenario usaha mereka secara persisten.

## 2. Target Pengguna
1. **Pengunjung / Juri / Calon Pengguna (Mode Tamu - P0):** Menguji langsung studi kasus **Dapur Sari** tanpa login, memodifikasi stok/permintaan/kapasitas di sesi browser, dan melihat rekomendasi produksi optimal.
2. **Pemilik UMKM Makanan (Workspace Persisten - P1):** Masuk menggunakan email *magic link*, memiliki salinan awal usaha **Dapur Sari** yang terisolasi via Row Level Security (RLS), lalu menyesuaikan bahan, resep (BOM), pemasok, pengiriman, penawaran alternatif, dan skenario.

## 3. Tujuan & Non-Tujuan
### Tujuan
- Menampilkan peta ketergantungan `Pemasok → Bahan → Produk` dengan penandaan otomatis bahan **sumber tunggal (*single-supplier*)**.
- Menghitung rencana produksi dan pembelian alternatif yang **optimal secara matematis dan deterministik** di server Next.js (TypeScript MILP) tanpa backend Python/FastAPI/Docker.
- Memberikan transparansi pemulihan kontribusi finansial dalam **Rupiah (Rp)** dan **persentase (%)** antara skenario *Normal*, *Pemasok Utama Gagal*, dan *Pemasok Alternatif Aktif*.
- Mencegah keputusan keliru dari data kedaluwarsa dengan penanda **hasil simulasi basi (*stale*)** setiap kali input diubah.

### Non-Tujuan (Out of Scope)
- Multi-lokasi gudang atau optimasi rute kurir (*vehicle routing*).
- Integrasi akuntansi/pembayaran langsung, ERP stok *real-time* POS, atau login berbasis password/OAuth pihak ketiga selain Email Magic Link Supabase.
- Simulasi stokastik/Monte Carlo multi-periode (fokus saat ini pada horizon perencanaan deterministik hingga `cutoff_date`).

## 4. Ruang Lingkup Fitur & Kriteria Penerimaan

### Fitur P0 (Demo Tanpa Login)
1. **Landing & Akses Tamu (`/` dan `/demo`)**
   - Halaman utama berbahasa Indonesia yang menjelaskan masalah ketergantungan pemasok dengan tombol CTA utama **"Coba Demo Dapur Sari"**.
   - Memuat data fixture awal dari tabel Postgres `demo_templates` (`id = 'dapur_sari'`) melalui Next.js Route Handler server-side.
   - Perubahan data tamu hanya tersimpan di sesi browser (`sessionStorage` + state React), tidak pernah menulis ke tabel `demo_templates` maupun database user lain.
2. **Jaringan Pasok (`/demo` & `/workspace` tab Jaringan Pasok)**
   - Layar `>= 640px`: Graf interaktif **React Flow** (`@xyflow/react`) 3 kolom (`Pemasok → Bahan → Produk`).
   - Layar `< 640px`: Daftar terstruktur berhierarki (bukan kanvas graf).
   - Klik node (atau item daftar di mobile) membuka panel detail node (stok/permintaan/pemasok/produk terdampak).
   - Bahan yang hanya memiliki 1 pemasok komitmen utama ditandai jelas sebagai **"Sumber Tunggal"**.
3. **Simulator 3 Skenario**
   - Mendukung minimal 3 skenario inti: **Normal**, **Pemasok Utama Gagal**, dan **Mitigasi: Pemasok Alternatif Aktif** (serta kustomisasi parameter).
   - **Input yang diperhitungkan:** stok di tangan (`stock_on_hand`), permintaan (`demand_units`), kontribusi per unit (`unit_contribution_idr`), resep BOM (`quantity_per_product`), pengiriman terjadwal (`quantity_base_units`, `arrival_date`), penawaran alternatif (`pack_size_base_units`, `max_packs`, `lead_days`, `incremental_premium_idr_per_pack`), `scenario_date`, `cutoff_date`, pemasok dinonaktifkan, dan penawaran diaktifkan.
   - **Output yang ditampilkan:** rencana produksi per produk (unit & pemenuhan permintaan), pemakaian & sisa setiap bahan, paket alternatif yang dibeli, total biaya premi alternatif (Rp), kontribusi kotor & bersih (Rp), status pengiriman, serta status solver (`Optimal` / `Tidak Layak` / `Error`).
4. **Perbandingan 3 Skenario**
   - Tabel dan visualisasi perbandingan berdampingan untuk skenario Normal vs Gangguan vs Mitigasi.
   - Menampilkan kehilangan kontribusi akibat gangguan dan **kontribusi yang dipulihkan** dalam **Rp** dan **%** (pemulihan dari kerugian gangguan sekaligus rasio terhadap kondisi normal).
5. **Data Usaha & Status Basi**
   - Pengeditan stok bahan, permintaan & margin produk, kebutuhan BOM, kapasitas/premi/lead-time penawaran alternatif, tanggal/kuantitas pengiriman terjadwal, status aktif pemasok, dan tanggal perencanaan.
   - Begitu ada input berubah setelah simulasi dijalankan, sistem menandai hasil simulasi lama sebagai **basi** (*stale*) dengan banner peringatan dan tombol hitung ulang.
   - Tombol **Reset ke Fixture Awal** mengembalikan seluruh data (dan skenario demo) ke kondisi awal Dapur Sari.

### Fitur P1 (Autentikasi & Workspace Persisten)
6. **Supabase Auth (Email Magic Link) & Workspace Persisten (`/login`, `/auth/callback`, `/workspace`)**
   - Autentikasi menggunakan Email Magic Link via `@supabase/ssr`.
   - Saat login pertama, workspace pengguna otomatis diinisialisasi dari template `dapur_sari` melalui RPC `ensure_demo_workspace(false)` ke tabel `businesses`, `suppliers`, `materials`, `products`, `bom_items`, `committed_deliveries`, `alternative_offers`, dan `scenarios`.
   - Seluruh akses baca/tulis menggunakan JWT pengguna dan tunduk pada **Row Level Security (RLS)** Postgres.
   - Pengguna terautentikasi dapat menyimpan perubahan data usaha, menambah/mengubah/menghapus entitas rantai pasok, serta me-reset workspace ke fixture Dapur Sari.

## 5. Angka Referensi Demo "Dapur Sari"
Data awal pada `demo_templates` (`scenario_date = 2026-11-23`, `planning_cutoff_date = 2026-11-24`):
- **Bahan:** Tepung terigu (`8.000 g`), Gula pasir (`10.000 g`), Mentega (`6.000 g`).
- **Produk:** Roti (permintaan `100`, kontribusi `Rp 3.000`, BOM: `250g` tepung, `20g` gula, `10g` mentega), Kue kering (permintaan `30`, kontribusi `Rp 5.000`, BOM: `100g` tepung, `50g` gula, `40g` mentega).
- **Pemasok:** Pemasok A (komitmen kirim `25.000 g` tepung pada `2026-11-23`), Pemasok B (penawaran alternatif tepung maks `12` pak @ `1.000 g`, `lead_days = 1`, premi `Rp 1.000/pak`).
- **Hasil Optimal Deterministik Referensi:**
  - **Normal:** 100 Roti + 30 Kue kering → Kontribusi bersih **Rp 450.000** (sisa tepung `5.000 g`).
  - **Pemasok Utama Gagal:** 30 Kue kering + 20 Roti → Kontribusi bersih **Rp 210.000** (rugi **Rp 240.000 / -53,3%**).
  - **Mitigasi Aktif:** Beli 12 pak Pemasok B (`12.000 g`, premi **Rp 12.000**) → produksi 30 Kue kering + 68 Roti → Kontribusi kotor Rp 354.000, **bersih Rp 342.000**.
  - **Kontribusi Dipulihkan:** **+Rp 132.000** (**55,0%** dari kerugian gangguan pulih; mencapai **76,0%** dari target normal).

## 6. Risiko & Mitigasi
1. **Trigger warisan pada `auth.users`:** `on_auth_user_created` memanggil `handle_new_user()` yang menyisipkan ke `public.business_profiles` (tabel tidak ada) — dapat menggagalkan pendaftaran Magic Link baru. *Mitigasi:* hapus trigger & fungsi usang lewat migrasi terverifikasi sebelum pengujian auth.
2. **Bundling WASM di Vercel Serverless:** Solver `highs` menggunakan berkas `.wasm`. *Mitigasi:* daftarkan `serverExternalPackages: ['highs']` dan `outputFileTracingIncludes` pada `next.config.ts`, plus uji dengan `next build` dan `next start`.
3. **Bahasa & Kejelasan Angka:** UI harus konsisten berbahasa Indonesia dengan pemformatan `Rp` dan satuan `g/ml/pcs` yang jelas agar mudah dipahami pelaku UMKM.
