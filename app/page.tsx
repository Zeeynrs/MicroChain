import {
  AlertTriangle,
  ArrowDown,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  CookingPot,
  Database,
  FlaskConical,
  GitFork,
  PackageOpen,
  ShieldCheck,
  Store,
  Truck,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { LandingScenarioPreview } from "@/components/landing/landing-interactive";
import { LandingMotion } from "@/components/landing/landing-motion";
import { Button } from "@/components/ui/button";

const painPoints = [
  {
    num: "01",
    icon: AlertTriangle,
    risk: "Risiko sumber tunggal",
    question: "Bahan mana yang cuma bergantung pada satu pemasok?",
    answer: "Banyak dapur UMKM baru sadar saat truk terlambat bahwa satu bahan utama menghentikan hampir semua menu unggulan.",
  },
  {
    num: "02",
    icon: CookingPot,
    risk: "Prioritas produksi meleset",
    question: "Dengan sisa stok di rak, produk mana yang paling untung dibuat dulu?",
    answer: "Saat tepung terbatas, membagi bahan secara kira-kira membuat margin harian anjlok. Prioritas produksi perlu dihitung dari kontribusi per gram.",
  },
  {
    num: "03",
    icon: Truck,
    risk: "Premi menggerus margin",
    question: "Apakah beli dari pemasok cadangan yang lebih mahal tetap untung?",
    answer: "Pemasok alternatif sering punya harga lebih tinggi dan batas paket. MicroChain menghitung berapa paket yang layak dibeli setelah biaya premi.",
  },
  {
    num: "04",
    icon: Clock,
    risk: "Kiriman lewat batas waktu",
    question: "Apakah kiriman cadangan sempat datang sebelum batas produksi?",
    answer: "Lead time 1 hari vs 3 hari mengubah kelayakan pasokan. Sistem otomatis menyaring kiriman yang melewati tanggal batas perencanaan.",
  },
];

const spotlightModules = [
  {
    label: "Modul 01",
    caption: "Tepung terigu — 1 pemasok utama",
    captionTone: "warning" as const,
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
    caption: "Optimal — 68 Roti & 30 Kue kering",
    captionTone: "good" as const,
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
      "Lihat dampak finansial gangguan dan manfaat mitigasi dalam satu perbandingan berdampingan—lengkap dalam Rupiah maupun persentase.",
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
      "Ubah stok, permintaan, resep (BOM), kontribusi, atau kapasitas cadangan kapan saja—baik di mode tamu maupun tersimpan permanen di akun usahamu.",
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

const steps = [
  {
    num: "01",
    icon: GitFork,
    title: "Petakan jaringan pasok",
    text: "Lihat hubungan pemasok, bahan baku, dan produk dalam satu peta serta kenali bahan yang bergantung pada satu pemasok.",
  },
  {
    num: "02",
    icon: FlaskConical,
    title: "Uji gangguan pasokan",
    text: "Simulasikan pemasok utama gagal dan lihat produksi yang bisa dipenuhi dari stok serta penawaran pemasok cadangan.",
  },
  {
    num: "03",
    icon: BarChart3,
    title: "Bandingkan rencana produksi",
    text: "Ukur manfaat pemasok cadangan setelah biaya tambahan pasokan dan pilih rencana dengan kontribusi bersih tertinggi.",
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

export default function LandingPage() {
  return (
    <LandingMotion>
      <a className="skip-link" href="#isi">Lewati ke isi</a>

      <header className="landing-header-wrap">
        <div className="landing-top landing-width">
          <Brand />
          <nav aria-label="Navigasi beranda">
            <a href="#masalah" className="landing-nav-link">Tantangan</a>
            <a href="#simulasi-dapur-sari" className="landing-nav-link">Contoh kasus</a>
            <a href="#fitur" className="landing-nav-link">Fitur</a>
            <a href="#cara-kerja" className="landing-nav-link">Cara kerja</a>
            <a href="#faq" className="landing-nav-link">FAQ</a>
            <Link href="/login" className="landing-nav-link landing-nav-login">Masuk</Link>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">
                Buka ruang demo <ChevronRight size={16} aria-hidden="true" />
              </Link>
            </Button>
          </nav>
        </div>
        <div className="landing-scroll-track" aria-hidden="true">
          <span className="landing-scroll-progress" data-gsap="scroll-progress" />
        </div>
      </header>

      <main id="isi">
        <section className="landing-hero landing-width" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="hero-context" data-gsap="hero-item"><span aria-hidden="true" /> Perencanaan pasokan UMKM makanan</div>
            <h1 id="hero-title" data-gsap="hero-item">
              Saat pasokan<br className="hero-break" /> terganggu,<br className="hero-break" />{" "}
              <em>produksi tetap<br className="hero-break" /> terencana.</em>
            </h1>
            <p data-gsap="hero-item">
              Petakan pemasok, uji dampak gangguan bahan baku, dan hitung rencana produksi serta pembelian cadangan paling menguntungkan berdasarkan stok dan biayamu sendiri.
            </p>
            <div className="hero-actions" data-gsap="hero-item">
              <Button asChild>
                <Link href="/dashboard">
                  Coba Demo Dapur Sari <ChevronRight size={20} aria-hidden="true" />
                </Link>
              </Button>
              <a href="#simulasi-dapur-sari" className="hero-secondary-link">
                Lihat simulasi <ArrowDown size={15} aria-hidden="true" />
              </a>
            </div>
            <ul className="hero-checks" aria-label="Keunggulan utama" data-gsap="hero-item">
              <li><Check size={15} aria-hidden="true" /> Langsung dicoba tanpa login</li>
              <li><Check size={15} aria-hidden="true" /> Optimasi deterministik (MILP)</li>
              <li><Check size={15} aria-hidden="true" /> Simpan data usahamu sendiri</li>
            </ul>
            <small data-gsap="hero-item">Studi kasus fiktif Dapur Sari siap dicoba langsung di browser</small>
          </div>

          <figure className="hero-figure" data-gsap="hero-media">
            <Image
              src="/dapur-sari.webp"
              alt="Pembuat roti menata loyang roti di dapur produksi"
              fill
              unoptimized
              sizes="(max-width: 840px) 100vw, 50vw"
              preload
              className="hero-photo"
            />
            <div className="hero-scrim" aria-hidden="true" />
            <figcaption className="hero-ticket" data-gsap="hero-ticket">
              <div className="hero-ticket-heading">
                <span className="ticket-mark"><Store size={19} aria-hidden="true" /></span>
                <span>
                  <strong>Dapur Sari</strong>
                  <small>Usaha roti &amp; kue dalam demo</small>
                </span>
                <span className="hero-ticket-badge">Pulih 55%</span>
              </div>
              <div className="hero-ticket-flow">
                <PackageOpen size={15} aria-hidden="true" /> Pemasok <ChevronRight size={13} aria-hidden="true" /> Bahan <ChevronRight size={13} aria-hidden="true" /> Produksi
              </div>
              <div className="hero-ticket-metrics">
                <div>
                  <span>Normal</span>
                  <strong>Rp&nbsp;450&nbsp;rb</strong>
                </div>
                <div>
                  <span>Gagal kirim</span>
                  <strong className="metric-bad">Rp&nbsp;210&nbsp;rb</strong>
                </div>
                <div>
                  <span>Mitigasi</span>
                  <strong className="metric-good">Rp&nbsp;342&nbsp;rb</strong>
                </div>
              </div>
            </figcaption>
          </figure>
        </section>

        <section id="masalah" className="landing-section landing-width" aria-labelledby="masalah-title">
          <div className="pain-layout">
            <div className="section-intro pain-sticky" data-gsap="reveal-up">
              <p className="section-kicker">Pertanyaan untuk pemilik usaha makanan</p>
              <h2 id="masalah-title">Keputusan dapur saat pasokan macet jangan lagi pakai kira-kira.</h2>
              <p className="section-lead">
                Bisa membuat makanan enak saja tidak cukup ketika satu bahan utama terlambat datang. Tanpa angka yang jelas, dapur berisiko salah prioritas menu atau rugi karena membeli bahan cadangan terlalu mahal.
              </p>
              <div className="pain-callout">
                <ShieldCheck size={18} aria-hidden="true" />
                <span>MicroChain mengubah stok, resep, dan jadwal kirim menjadi rencana produksi yang terukur dalam hitungan detik.</span>
              </div>
            </div>

            <div className="pain-ledger">
              {painPoints.map(({ num, icon: Icon, risk, question, answer }) => (
                <article key={question} className="pain-row" data-gsap="pain-row">
                  <div className="pain-row-meta">
                    <span className="pain-row-num">{num}</span>
                    <span className="pain-icon" aria-hidden="true"><Icon size={17} strokeWidth={1.85} /></span>
                  </div>
                  <div className="pain-row-body">
                    <span className="pain-risk-label">{risk}</span>
                    <h3>{question}</h3>
                    <p>{answer}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="simulasi-dapur-sari" className="landing-section landing-surface-band" aria-labelledby="simulasi-title">
          <div className="landing-width">
            <div className="section-header-split" data-gsap="reveal-up">
              <div>
                <p className="section-kicker">Contoh kasus nyata dalam demo</p>
                <h2 id="simulasi-title">Lihat bagaimana Dapur Sari memulihkan 55% kerugian saat pemasok tepung gagal kirim.</h2>
              </div>
              <p className="section-lead">
                Pilih skenario di bawah ini dan geser batas paket Pemasok B untuk melihat rencana produksi Roti &amp; Kue kering serta kontribusi bersih berubah seketika.
              </p>
            </div>

            <LandingScenarioPreview />
          </div>
        </section>

        <section id="fitur" className="landing-section landing-width" aria-labelledby="fitur-title">
          <div className="section-header-split" data-gsap="reveal-up">
            <div>
              <p className="section-kicker">Empat modul dalam satu ruang kerja</p>
              <h2 id="fitur-title">Semua yang dibutuhkan untuk memetakan risiko hingga memilih rencana produksi.</h2>
            </div>
            <p className="section-lead">
              Dirancang khusus untuk alur kerja UMKM makanan—ringkas dipelajari, tetapi memakai perhitungan optimasi yang konsisten dan transparan.
            </p>
          </div>

          <div className="spotlight-stack">
            {spotlightModules.map((mod, index) => (
              <article key={mod.title} className={`spotlight-row ${index % 2 === 1 ? "is-reversed" : ""}`} data-gsap="spotlight-row">
                <figure className="module-media" data-gsap="spotlight-media">
                  <Image
                    src={mod.image}
                    alt={mod.imageAlt}
                    width={1200}
                    height={900}
                    unoptimized
                    loading="eager"
                    className="module-image"
                  />
                  <figcaption className={`media-pill tone-${mod.captionTone}`}>
                    <span aria-hidden="true" />
                    {mod.caption}
                  </figcaption>
                </figure>
                <div className="module-copy" data-gsap="spotlight-copy">
                  <span className="module-tag">{mod.label}</span>
                  <h3>{mod.title}</h3>
                  <p>{mod.description}</p>
                  <ul className="module-bullets">
                    {mod.bullets.map((bullet) => (
                      <li key={bullet}>
                        <Check size={16} aria-hidden="true" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>

          <div className="secondary-module-grid">
            {secondaryModules.map((mod) => (
              <article key={mod.title} className="secondary-module-card" data-gsap="secondary-card">
                <figure className="module-media">
                  <Image
                    src={mod.image}
                    alt={mod.imageAlt}
                    width={1200}
                    height={900}
                    unoptimized
                    loading="eager"
                    className="module-image"
                  />
                  <figcaption className="media-pill tone-good">
                    <span aria-hidden="true" />
                    {mod.caption}
                  </figcaption>
                </figure>
                <div className="secondary-module-body">
                  <span className="module-tag">{mod.label}</span>
                  <h3>{mod.title}</h3>
                  <p>{mod.description}</p>
                  <ul className="module-bullets">
                    {mod.bullets.map((bullet) => (
                      <li key={bullet}>
                        <Check size={15} aria-hidden="true" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-contrast-band" aria-labelledby="compare-method-title">
          <div className="landing-width">
            <div className="section-header-split" data-gsap="reveal-up">
              <div>
                <p className="section-kicker">Mengapa simulasi terstruktur</p>
                <h2 id="compare-method-title">Bedanya menebak manual dengan menghitung lewat MicroChain.</h2>
              </div>
              <p className="section-lead">
                Saat gangguan datang mendadak, keputusan cepat tetap bisa akurat jika stok, resep, dan penawaran cadangan sudah siap disimulasikan.
              </p>
            </div>

            <div className="versus-board" role="region" aria-label="Perbandingan cara manual dan MicroChain">
              <div className="versus-head">
                <span>Situasi di dapur</span>
                <span className="versus-col-old">Hitung manual / kira-kira</span>
                <span className="versus-col-new">Dengan MicroChain</span>
              </div>
              {comparisonRows.map((row) => (
                <div key={row.topic} className="versus-row" data-gsap="versus-row">
                  <strong className="versus-topic">{row.topic}</strong>
                  <p className="versus-old">
                    <X size={15} aria-hidden="true" />
                    <span>{row.manual}</span>
                  </p>
                  <p className="versus-new">
                    <Check size={15} aria-hidden="true" />
                    <span>{row.microchain}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="cara-kerja" className="landing-dark-band" aria-labelledby="steps-title">
          <div className="landing-width">
            <div className="landing-steps-dark">
              <div className="steps-header" data-gsap="reveal-up">
                <p>Cara kerja</p>
                <h2 id="steps-title">Dari stok bahan ke rencana produksi</h2>
              </div>
              <div className="step-list-dark">
                {steps.map(({ num, icon: Icon, title, text }) => (
                  <article key={title} className="step-card-dark" data-gsap="step-card">
                    <div className="step-card-top">
                      <span className="step-num">{num}</span>
                      <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
                    </div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="audience-strip" aria-label="Jenis usaha yang cocok menggunakan MicroChain">
              <p className="audience-label" data-gsap="reveal-up">Cocok untuk berbagai jenis UMKM makanan &amp; minuman</p>
              <div className="audience-grid">
                {businessTypes.map(({ icon: Icon, name, detail }) => (
                  <div key={name} className="audience-item" data-gsap="audience-item">
                    <span className="audience-icon" aria-hidden="true"><Icon size={17} /></span>
                    <div>
                      <strong>{name}</strong>
                      <small>{detail}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="landing-section landing-width" aria-labelledby="faq-title">
          <div className="faq-layout">
            <div className="section-intro" data-gsap="reveal-up">
              <p className="section-kicker">Pertanyaan umum</p>
              <h2 id="faq-title">Hal yang sering ditanyakan sebelum mulai mencoba.</h2>
              <p className="section-lead">
                Masih ragu bagaimana simulasi bekerja? Kamu bisa langsung membuka ruang demo Dapur Sari tanpa mendaftar apa pun.
              </p>
            </div>

            <div className="faq-list">
              {faqs.map(({ q, a }, index) => (
                <details key={q} className="faq-item" open={index === 0} data-gsap="faq-item">
                  <summary>
                    <span>{q}</span>
                    <ChevronDown size={18} aria-hidden="true" />
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-closing-wrap landing-width" aria-labelledby="closing-title">
          <div className="landing-closing" data-gsap="closing">
            <div className="landing-closing-copy">
              <p className="section-kicker">Siap menguji ketahanan dapurmu?</p>
              <h2 id="closing-title">Simulasikan gangguan hari ini, sebelum benar-benar terjadi besok.</h2>
              <p>
                Buka studi kasus Dapur Sari secara instan di browser, atau buat akun untuk menyimpan pemasok dan resep usahamu sendiri.
              </p>
            </div>
            <div className="closing-actions">
              <Button asChild variant="inverse">
                <Link href="/dashboard">
                  Mulai demo gratis <ChevronRight size={18} aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="closing-outline-btn">
                <Link href="/login">Masuk ke workspace</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer-wrap">
        <div className="landing-footer landing-width">
          <div className="landing-footer-brand">
            <Brand />
            <p>Kenali Risiko. Simulasikan Dampak. Amankan Produksi.</p>
          </div>
          <nav className="landing-footer-links" aria-label="Tautan bawah">
            <Link href="/dashboard">Ruang demo</Link>
            <Link href="/network">Jaringan pasok</Link>
            <Link href="/simulator">Simulator</Link>
            <Link href="/comparison">Perbandingan</Link>
            <Link href="/login">Masuk akun</Link>
          </nav>
        </div>
      </footer>
    </LandingMotion>
  );
}
