/** Isi layar pengantar dan langkah panduan interaktif (coach marks). */

export interface IntroSlide {
  id: string;
  image: string;
  imageAlt: string;
  title: string;
  text: string;
  /** Teks pengganti per mode bila berbeda. */
  textByMode?: { demo?: string; workspace?: string };
  titleByMode?: { demo?: string; workspace?: string };
}

export const INTRO_SLIDES: IntroSlide[] = [
  {
    id: "peta",
    image: "/onboarding/onboarding-1-peta.webp",
    imageAlt: "Ilustrasi peta pemasok, bahan, dan produk yang saling terhubung",
    title: "Petakan jaringan pasok",
    text: "Lihat hubungan pemasok, bahan baku, dan produk dalam satu peta. Bahan yang hanya punya satu pemasok ditandai agar kamu tahu titik rawannya.",
  },
  {
    id: "gangguan",
    image: "/onboarding/onboarding-2-gangguan.webp",
    imageAlt: "Ilustrasi truk pengantar berhenti dan rak tepung yang hampir kosong",
    title: "Uji gangguan pasokan",
    text: "Simulasikan pemasok utama gagal kirim atau terlambat, lalu lihat produk apa yang masih bisa dibuat dari stok yang ada.",
  },
  {
    id: "bandingkan",
    image: "/onboarding/onboarding-3-bandingkan.webp",
    imageAlt: "Ilustrasi grafik batang yang membandingkan tiga rencana produksi",
    title: "Bandingkan rencana produksi",
    text: "Bandingkan kondisi normal, gangguan, dan mitigasi. Lihat berapa kontribusi yang bisa dipulihkan dengan pemasok cadangan.",
  },
  {
    id: "mulai",
    image: "/onboarding/onboarding-4-mulai.webp",
    imageAlt: "Ilustrasi pembuat roti memegang tablet berisi daftar centang",
    title: "Mulai dari data usaha",
    titleByMode: { demo: "Coba dengan data Dapur Sari" },
    text: "Isi pemasok, bahan baku, produk, dan resep di Data Usaha. Semuanya tersimpan di akunmu dan bisa kamu ubah kapan saja.",
    textByMode: {
      demo: "Kamu sedang di ruang demo toko roti Dapur Sari. Ubah stok atau permintaan sesukamu. Perubahan hanya ada di browser ini.",
    },
  },
];

export interface TourStep {
  id: string;
  /** Rute relatif terhadap awalan mode, mis. "/data". */
  route: string;
  /** Nilai atribut `data-tour` elemen yang disorot. */
  target: string;
  title: string;
  text: string;
  placement?: "top" | "bottom" | "left" | "right";
  only?: "demo" | "workspace";
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "menu",
    route: "/dashboard",
    target: "nav-menu",
    title: "Menu utama",
    text: "Pindah antar halaman lewat menu ini: Ringkasan, Jaringan Pasok, Simulator, Perbandingan, dan Data Usaha.",
  },
  {
    id: "ringkasan",
    route: "/dashboard",
    target: "overview",
    title: "Ringkasan usaha",
    text: "Di sini kamu melihat jumlah pemasok, bahan baku, dan produk usahamu sekilas.",
  },
  {
    id: "risiko",
    route: "/dashboard",
    target: "risk",
    title: "Risiko pemasok",
    text: "Bahan yang hanya punya satu pemasok muncul di sini. Gangguan di pemasok itu bisa menghentikan produksi.",
  },
  {
    id: "parameter",
    route: "/data",
    target: "parameters",
    title: "Isi stok dan permintaan",
    text: "Masukkan stok bahan baku, permintaan produk, dan batas pak pemasok alternatif. Tekan tombol terapkan setelah selesai.",
  },
  {
    id: "struktur",
    route: "/data",
    target: "structure",
    title: "Bangun struktur usaha",
    text: "Tambah pemasok di sini, lalu bahan, produk, resep, pengiriman, dan penawaran di panel di bawahnya. Setiap tambah atau hapus ada notifikasi konfirmasinya.",
    placement: "top",
  },
  {
    id: "jaringan",
    route: "/network",
    target: "network-panel",
    title: "Peta jaringan pasok",
    text: "Pilih pemasok, bahan, atau produk untuk melihat hubungannya. Di ponsel peta tampil sebagai daftar.",
  },
  {
    id: "skenario-jaringan",
    route: "/network",
    target: "network-scenario",
    title: "Lihat per skenario",
    text: "Ganti skenario untuk melihat jalur mana yang terganggu saat pemasok gagal kirim.",
  },
  {
    id: "pilih-skenario",
    route: "/simulator",
    target: "scenario-picker",
    title: "Pilih skenario",
    text: "Pilih kondisi pasokan: normal, pemasok utama gagal, atau mitigasi dengan pemasok alternatif. Kamu juga bisa menambah skenario sendiri.",
  },
  {
    id: "jalankan",
    route: "/simulator",
    target: "run",
    title: "Jalankan simulasi",
    text: "Tekan tombol ini untuk menghitung rencana produksi terbaik. Bila data berubah, hasil lama ditandai basi.",
  },
  {
    id: "bandingkan",
    route: "/comparison",
    target: "comparison-metrics",
    title: "Bandingkan hasilnya",
    text: "Lihat kontribusi yang berisiko hilang, yang dipulihkan, dan persentase pemulihannya dalam rupiah.",
  },
  {
    id: "simpan",
    route: "/comparison",
    target: "save",
    only: "workspace",
    title: "Simpan ke workspace",
    text: "Perubahan baru tersimpan setelah kamu menekan tombol ini. Label di sebelahnya menunjukkan ada perubahan yang belum disimpan.",
  },
  {
    id: "mode",
    route: "/comparison",
    target: "mode",
    only: "demo",
    title: "Mode demo",
    text: "Perubahan di ruang demo hanya ada di browser ini. Masuk untuk membuat workspace sendiri dan menyimpan datamu.",
  },
  {
    id: "bantuan",
    route: "/comparison",
    target: "help",
    title: "Butuh bantuan lagi?",
    text: "Tekan Bantuan kapan saja untuk melihat pengantar atau mengulang panduan ini.",
  },
];
