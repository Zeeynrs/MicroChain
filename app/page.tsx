import { BarChart3, Check, ChevronDown, Database, FlaskConical, GitFork, PackageOpen, Store, UtensilsCrossed, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { HeroVideoBackground } from "@/components/landing/hero-video-bg";
import { LandingCarousel } from "@/components/landing/landing-carousel";
import { LandingScenarioPreview } from "@/components/landing/landing-interactive";
import { LandingMotion } from "@/components/landing/landing-motion";
import { LandingPainShowcase } from "@/components/landing/pain-showcase";
import { PlanLattice } from "@/components/landing/plan-lattice";
import { Button } from "@/components/ui/button";

const spotlightModules = [
  {
    label: "Modul 01",
    caption: "Tepung terigu, 1 pemasok utama",
    title: "Jaringan Pasok Interaktif",
    description:
      "Visualisasikan seluruh alur dari pemasok, bahan baku, hingga produk jadi dalam satu layar. Titik rawan sumber tunggal langsung terlihat sebelum masalah terjadi.",
    image: "/landing/modul-1-jaringan.webp",
    imageAlt: "Bahan baku tepung terigu, gula, mentega, peti kirim kayu, serta roti dan kue kering di meja dapur produksi",
    bullets: [
      "Graf interaktif Pemasok ke Bahan lalu Produk di layar lebar, otomatis berubah menjadi daftar rapi di ponsel (< 640px).",
      "Penandaan otomatis bahan sumber tunggal (single-supplier) beserta status pemasok cadangan.",
      "Klik node mana saja untuk memeriksa stok, jadwal kirim, resep (BOM), dan menu yang terdampak.",
    ],
  },
  {
    label: "Modul 02",
    caption: "Optimal: 68 Roti dan 30 Kue kering",
    title: "Simulator Gangguan & Rencana Produksi",
    description:
      "Uji skenario Normal, Pemasok Utama Gagal, keterlambatan kirim, hingga aktivasi pemasok alternatif. Perhitungan dijalankan solver optimasi bilangan bulat (MILP) di server.",
    image: "/landing/modul-2-simulator.webp",
    imageAlt: "Pemilik usaha roti memeriksa kotak penyimpanan tepung yang mulai menipis di samping rak bahan dan loyang adonan",
    bullets: [
      "Menghasilkan jumlah produksi bulat per produk yang memaksimalkan kontribusi bersih dari stok tersedia.",
      "Menghitung kebutuhan paket pemasok alternatif, biaya premi tambahan, serta sisa bahan baku tiap menu.",
      "Memperhitungkan tanggal batas perencanaan (cutoff) dan lead time kiriman secara otomatis.",
    ],
  },
];

const secondaryModules = [
  {
    label: "Modul 03",
    caption: "Pulih +Rp 132.000 (55%)",
    title: "Perbandingan 3 Skenario & Margin Pulih",
    description:
      "Lihat dampak finansial gangguan dan manfaat mitigasi dalam satu perbandingan berdampingan, lengkap dalam Rupiah maupun persentase.",
    image: "/landing/modul-3-perbandingan.webp",
    imageAlt: "Loyang roti dan kue kering siap jual di meja kayu dengan pengiriman paket tepung cadangan di latar dapur",
    bullets: [
      "Bandingkan Normal, Pemasok Gagal, dan Mitigasi Aktif dalam satu tabel dan grafik kontribusi.",
      "Ukur kontribusi yang hilang akibat gangguan serta persentase pemulihan bersih setelah premi.",
      "Tambah skenario kustom untuk menguji kombinasi keterlambatan atau pemasok lain.",
    ],
  },
  {
    label: "Modul 04",
    caption: "Penanda hasil basi otomatis",
    title: "Data Usaha, Penanda Basi & Workspace Pribadi",
    description:
      "Ubah stok, permintaan, resep (BOM), kontribusi, atau kapasitas cadangan kapan saja, baik di mode tamu maupun tersimpan permanen di akun usahamu.",
    image: "/landing/modul-4-data.webp",
    imageAlt: "Pemilik usaha roti memperbarui data stok bahan dan rencana produksi di laptop di meja dapur",
    bullets: [
      "Penanda otomatis hasil simulasi basi (stale) setiap kali angka berubah agar keputusan tetap akurat.",
      "Tombol reset instan ke data awal Dapur Sari di mode demo kapan pun dibutuhkan.",
      "Akun pribadi berisolasi Row Level Security (RLS) untuk menyimpan data usahamu sendiri.",
    ],
  },
];

const comparisonRows = [
  {
    topic: "Saat pemasok utama telat kirim",
    manual: "Baru menebak menu mana yang dihentikan saat adonan sudah siap dibuat.",
    microchain: "Langsung tahu produk terdampak dan rencana produksi bulat paling menguntungkan.",
  },
  {
    topic: "Membeli bahan cadangan lebih mahal",
    manual: "Beli terlalu banyak sehingga premi menggerus margin, atau terlalu sedikit.",
    microchain: "Solver menghitung jumlah paket tepat dengan premi bersih paling optimal.",
  },
  {
    topic: "Cek ketepatan tanggal kirim",
    manual: "Lupa memperhitungkan lead time sehingga kiriman baru tiba setelah produksi tutup.",
    microchain: "Kiriman dan penawaran melewati tanggal cutoff otomatis disaring sistem.",
  },
  {
    topic: "Perubahan stok atau pesanan mendadak",
    manual: "Catatan spreadsheet lama tercampur dan rawan salah pakai angka kemarin.",
    microchain: "Hasil lama otomatis ditandai basi hingga simulasi dijalankan ulang.",
  },
];

/* The three steps double as the three stages of the Dapur Sari outage: the figures come from the demo's own scenarios. */
const steps = [
  {
    num: 1,
    icon: GitFork,
    title: "Petakan jaringan pasok",
    text: "Lihat hubungan pemasok, bahan baku, dan produk dalam satu peta serta kenali bahan yang bergantung pada satu pemasok.",
    figure: "450.000",
    figureLabel: "Kontribusi bersih normal, kiriman 25 kg tepung Pemasok A tiba tepat waktu.",
  },
  {
    num: 2,
    icon: FlaskConical,
    title: "Uji gangguan pasokan",
    text: "Simulasikan pemasok utama gagal dan lihat produksi yang bisa dipenuhi dari stok serta penawaran pemasok cadangan.",
    figure: "210.000",
    figureLabel: "Pemasok A gagal kirim. Dengan sisa 8 kg tepung, kontribusi turun 53%.",
  },
  {
    num: 3,
    icon: BarChart3,
    title: "Bandingkan rencana produksi",
    text: "Ukur manfaat pemasok cadangan setelah biaya tambahan pasokan dan pilih rencana dengan kontribusi bersih tertinggi.",
    figure: "342.000",
    figureLabel: "12 pak Pemasok B memulihkan 55% kerugian, setelah premi Rp 12.000.",
  },
];

const businessTypes = [
  { icon: Store, name: "Toko roti & kue rumahan", detail: "Kelola tepung, mentega, gula, dan prioritas loyang harian." },
  { icon: UtensilsCrossed, name: "Katering & nasi kotak", detail: "Antisipasi telat kirim protein atau bumbu saat pesanan besar." },
  { icon: PackageOpen, name: "Camilan & makanan beku", detail: "Atur stok bahan utama dan kemasan untuk batch produksi." },
  { icon: Database, name: "Kedai kopi & minuman", detail: "Hitung substitusi susu, sirup, dan biji kopi saat pasokan macet." },
];

const faqs = [
  {
    q: "Apa itu MicroChain?",
    a: "MicroChain adalah aplikasi web simulasi ketahanan rantai pasok untuk UMKM makanan. Aplikasi ini memetakan ketergantungan pemasok ke menu, mensimulasikan gangguan kiriman, lalu menghitung rencana produksi dan pembelian cadangan paling menguntungkan.",
  },
  {
    q: "Apakah saya harus login atau membayar untuk mencoba?",
    a: "Tidak. Kamu bisa langsung klik “Coba Demo Dapur Sari” untuk menguji seluruh fitur (Jaringan Pasok, Simulator, Perbandingan, dan Data Usaha) tanpa login. Perubahan di mode tamu disimpan sementara di sesi browser.",
  },
  {
    q: "Bagaimana cara MicroChain menentukan rencana produksi terbaik?",
    a: "MicroChain menjalankan solver optimasi deterministik (MILP) di server berdasarkan stok di tangan, kiriman yang tiba sebelum batas waktu, resep tiap produk (BOM), permintaan, margin per unit, serta kapasitas dan biaya premi pemasok alternatif.",
  },
  {
    q: "Apa arti penanda “hasil simulasi basi” saat saya mengubah data?",
    a: "Begitu kamu mengubah stok, permintaan, resep, atau kapasitas cadangan, hasil perhitungan lama otomatis ditandai basi agar kamu tidak mengambil keputusan dari angka kedaluwarsa. Klik hitung ulang untuk memperbarui hasilnya.",
  },
  {
    q: "Apakah data usaha saya aman jika saya membuat akun?",
    a: "Ya. Di workspace akun pribadi, data pemasok, bahan, resep, dan skenario disimpan di database Postgres dengan isolasi Row Level Security (RLS), sehingga hanya akun milikmu yang dapat mengakses datamu.",
  },
  {
    q: "Bisakah MicroChain digunakan lewat ponsel?",
    a: "Bisa. Tampilan navigasi menyesuaikan layar ponsel, dan pada layar kecil (< 640px) peta jaringan pasok otomatis ditampilkan sebagai daftar interaktif yang nyaman dibaca dan diketuk.",
  },
];

const allModules = [...spotlightModules, ...secondaryModules];

function ModuleBullets({ bullets }: { bullets: string[] }) {
  return (
    <ul className="module-bullets">
      {bullets.map((bullet) => (
        <li key={bullet}>
          <Check size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
  );
}

export default function LandingPage() {
  return (
    <LandingMotion>
      <a className="skip-link" href="#isi">Lewati ke isi</a>

      <header className="nav-wrap">
        <div className="shell nav">
          <Brand />
          <nav className="nav-links" aria-label="Navigasi beranda">
            <div className="nav-anchors">
              <a href="#masalah" className="nav-link nav-anchor">Tantangan</a>
              <a href="#simulasi-dapur-sari" className="nav-link nav-anchor">Contoh kasus</a>
              <a href="#fitur" className="nav-link nav-anchor">Fitur</a>
              <a href="#cara-kerja" className="nav-link nav-anchor">Cara kerja</a>
              <a href="#faq" className="nav-link nav-anchor">FAQ</a>
            </div>
            <div className="nav-end">
              <Link href="/login" className="nav-link">Masuk</Link>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">Buka ruang demo</Link>
              </Button>
            </div>
          </nav>
        </div>
        <div className="nav-progress" aria-hidden="true">
          <span data-gsap="scroll-progress" />
        </div>
      </header>

      <main id="isi">
        <section className="hero" aria-labelledby="hero-title">
          <div className="shell hero-grid">
            <div className="hero-copy">
              <h1 id="hero-title" data-gsap="hero-item">Saat pasokan terganggu, produksi tetap terencana.</h1>
              <p className="lead" data-gsap="hero-item">
                Petakan pemasok, uji gangguan bahan baku, dan hitung rencana produksi paling menguntungkan.
              </p>
              <div className="hero-actions" data-gsap="hero-item">
                <Button asChild>
                  <Link href="/login">Buat workspace</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard">Coba Demo Dapur Sari</Link>
                </Button>
              </div>
            </div>

            <figure className="hero-media ticks">
              <PlanLattice scenario="mitigation" className="hero-lattice" />
              <figcaption>
                <span>Dapur Sari, studi kasus fiktif yang bisa langsung dicoba di browser.</span>
                <span>Tiap titik satu rencana produksi; tinggi titik adalah kontribusi bersih.</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="cara-kerja" className="story" aria-labelledby="steps-title" data-story data-stage="1">
          <div className="shell">
            <h2 id="steps-title" data-gsap="reveal-up">Dari stok bahan ke rencana produksi</h2>
            <div className="story-grid">
              <div className="story-pin">
                <div className="story-stage ticks" aria-hidden="true">
                  <p className="story-figure">
                    <span className="story-figure-unit">Rp</span>
                    <span className="figure" data-story-figure>450.000</span>
                  </p>
                  <PlanLattice follow="[data-story]" className="story-lattice" />
                  <div className="story-diagram" aria-label="Diagram jaringan pasok Dapur Sari">
                    <div className="net-col">
                      <span className="net-node net-a">
                        <strong>Pemasok A</strong>
                        <small className="net-state" data-for="1">Kirim 25 kg</small>
                        <small className="net-state" data-for="2 3">Gagal kirim</small>
                      </span>
                      <span className="net-node net-b">
                        <strong>Pemasok B</strong>
                        <small className="net-state" data-for="1 2">Cadangan</small>
                        <small className="net-state" data-for="3">+12 pak</small>
                      </span>
                    </div>
                    <div className="net-col net-mid">
                      <span className="net-node net-flour">
                        <strong>Tepung terigu</strong>
                        <small className="net-state" data-for="1">33 kg tersedia</small>
                        <small className="net-state" data-for="2">Sisa 8 kg</small>
                        <small className="net-state" data-for="3">20 kg tersedia</small>
                      </span>
                    </div>
                    <div className="net-col">
                      <span className="net-node net-out">
                        <strong>Roti</strong>
                        <small className="net-state" data-for="1">100 buah</small>
                        <small className="net-state" data-for="2">20 buah</small>
                        <small className="net-state" data-for="3">68 buah</small>
                      </span>
                      <span className="net-node net-out">
                        <strong>Kue kering</strong>
                        <small>30 buah</small>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <ol className="story-steps">
                {steps.map(({ num, icon: Icon, title, text, figure, figureLabel }) => (
                  <li key={title} className="story-step" data-step={num}>
                    <article className="step-card" data-gsap="step-card">
                      <div className="step-head">
                        <span className="step-num" aria-hidden="true">{num}</span>
                        <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                      </div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                      <p className="step-fact">
                        <strong className="num">Rp {figure}</strong>
                        <span>{figureLabel}</span>
                      </p>
                    </article>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="simulasi-dapur-sari" className="section" aria-labelledby="simulasi-title">
          <div className="shell">
            <div className="head-split" data-gsap="reveal-up">
              <h2 id="simulasi-title">Coba simulasi Dapur Sari di sini</h2>
              <p className="lead">
                Pilih skenario dan geser batas paket Pemasok B untuk melihat rencana produksi Roti &amp; Kue kering serta kontribusi bersih berubah seketika.
              </p>
            </div>
            <LandingScenarioPreview />
          </div>
        </section>

        <section id="galeri-usaha" className="section band-quiet" aria-labelledby="galeri-title">
          <div className="shell">
            <div className="head-split" data-gsap="reveal-up">
              <h2 id="galeri-title">Dari toko roti hingga kedai kopi</h2>
              <p className="lead">
                Satu alat untuk mengamankan produksi harian. Geser atau pilih jenis usaha untuk melihat bagaimana MicroChain menghadapi gangguan pasokan bahan utama.
              </p>
            </div>

            <div data-gsap="carousel">
              <LandingCarousel />
            </div>

            <div className="audience" aria-labelledby="audience-title">
              <h3 id="audience-title" className="audience-title">Cocok untuk berbagai jenis UMKM makanan &amp; minuman</h3>
              <ul className="audience-grid">
                {businessTypes.map(({ icon: Icon, name, detail }) => (
                  <li key={name} className="audience-item">
                    <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                    <strong>{name}</strong>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="masalah" className="section" aria-labelledby="masalah-title">
          <div className="shell">
            <LandingPainShowcase />

            <div className="versus" role="region" aria-labelledby="compare-method-title">
              <div className="head-split" data-gsap="reveal-up">
                <h2 id="compare-method-title">Bedanya menebak manual dengan menghitung lewat MicroChain.</h2>
                <p className="lead">
                  Saat gangguan datang mendadak, keputusan cepat tetap bisa akurat jika stok, resep, dan penawaran cadangan sudah siap disimulasikan.
                </p>
              </div>
              <div className="versus-scroll">
                <table className="versus-table">
                  <thead>
                    <tr>
                      <th scope="col">Situasi di dapur</th>
                      <th scope="col">Hitung manual atau kira-kira</th>
                      <th scope="col">Dengan MicroChain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.topic}>
                        <th scope="row">{row.topic}</th>
                        <td className="versus-old">
                          <X size={16} strokeWidth={1.75} aria-hidden="true" />
                          <span>{row.manual}</span>
                        </td>
                        <td className="versus-new">
                          <Check size={16} strokeWidth={1.75} aria-hidden="true" />
                          <span>{row.microchain}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section id="fitur" className="section" aria-labelledby="fitur-title">
          <div className="shell">
            <div className="head-split" data-gsap="reveal-up">
              <h2 id="fitur-title">Empat modul dalam satu ruang kerja</h2>
              <p className="lead">
                Dirancang khusus untuk alur kerja UMKM makanan: ringkas dipelajari, tetapi memakai perhitungan optimasi yang konsisten dan transparan.
              </p>
            </div>

            <ol className="module-index">
              {allModules.map((mod, index) => (
                <li key={mod.title} className="module-row" data-gsap={index < spotlightModules.length ? "spotlight-row" : "secondary-card"}>
                  <figure className="module-media">
                    <Image src={mod.image} alt={mod.imageAlt} width={1200} height={900} unoptimized loading="lazy" className="module-image" />
                    <figcaption>
                      <span>{mod.label}</span>
                      <strong className="num">{mod.caption}</strong>
                    </figcaption>
                  </figure>
                  <div className="module-copy">
                    <h3>{mod.title}</h3>
                    <p>{mod.description}</p>
                  </div>
                  <ModuleBullets bullets={mod.bullets} />
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="faq" className="section" aria-labelledby="faq-title">
          <div className="shell faq-layout">
            <div className="faq-head" data-gsap="reveal-up">
              <h2 id="faq-title">Pertanyaan umum</h2>
              <p className="lead">
                Masih ragu bagaimana simulasi bekerja? Kamu bisa langsung membuka ruang demo Dapur Sari tanpa mendaftar apa pun.
              </p>
            </div>
            <div className="faq-list">
              {faqs.map(({ q, a }, index) => (
                <details key={q} className="faq-item" open={index === 0}>
                  <summary>
                    <span>{q}</span>
                    <ChevronDown size={20} strokeWidth={1.5} aria-hidden="true" />
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="closing" aria-labelledby="closing-title">
          <div className="shell closing-grid">
            <div className="closing-side" data-gsap="reveal-up">
              <h2 id="closing-title" className="closing-statement">
                Simulasikan gangguan hari ini, sebelum benar‑benar terjadi besok.
              </h2>
              <p>
                Buka studi kasus Dapur Sari secara instan di browser, atau buat akun untuk menyimpan pemasok dan resep usahamu sendiri.
              </p>
              <div className="closing-actions">
                <Button asChild>
                  <Link href="/login">Masuk ke workspace</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard">Mulai demo gratis</Link>
                </Button>
              </div>
            </div>
            <figure className="closing-media ticks">
              <div className="closing-video">
                <HeroVideoBackground />
              </div>
              <figcaption>Dapur produksi pagi, latar video studi kasus Dapur Sari.</figcaption>
            </figure>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="shell footer-inner">
          <p className="footer-statement">Kenali Risiko. Simulasikan Dampak. Amankan Produksi.</p>
          <div className="footer-base">
            <Brand />
            <nav className="footer-links" aria-label="Tautan bawah">
              <Link href="/dashboard">Ruang demo</Link>
              <Link href="/network">Jaringan pasok</Link>
              <Link href="/simulator">Simulator</Link>
              <Link href="/comparison">Perbandingan</Link>
              <Link href="/login">Masuk akun</Link>
            </nav>
          </div>
        </div>
      </footer>
    </LandingMotion>
  );
}
