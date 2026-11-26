import { BarChart3, ChevronRight, FlaskConical, GitFork, PackageOpen, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

const steps = [
  { icon: GitFork, title: "Petakan jaringan pasok", text: "Lihat hubungan pemasok, bahan baku, dan produk dalam satu peta." },
  { icon: FlaskConical, title: "Uji gangguan pasokan", text: "Simulasikan pemasok utama gagal dan lihat produksi yang bisa dipenuhi dari stok." },
  { icon: BarChart3, title: "Bandingkan rencana produksi", text: "Ukur manfaat pemasok cadangan setelah biaya tambahan pasokan." },
];

export default function LandingPage() {
  return (
    <div className="landing">
      <a className="skip-link" href="#isi">Lewati ke isi</a>
      <header className="landing-top landing-width">
        <Brand />
        <nav aria-label="Navigasi beranda">
          <a href="#cara-kerja" className="landing-nav-link">Cara kerja</a>
          <Link href="/login" className="landing-nav-link">Masuk</Link>
          <Button asChild variant="outline" size="sm"><Link href="/dashboard">Buka ruang demo <ChevronRight size={16} aria-hidden="true" /></Link></Button>
        </nav>
      </header>
      <main id="isi">
        <section className="landing-hero landing-width" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="hero-context"><span /> Perencanaan pasokan UMKM</div>
            <h1 id="hero-title">Saat pasokan<br className="hero-break" /> terganggu,<br className="hero-break" /> <em>produksi tetap<br className="hero-break" /> terencana.</em></h1>
            <p>Petakan pemasok, uji dampak gangguan, dan hitung rencana produksi berdasarkan stok serta biaya yang kamu masukkan.</p>
            <Button asChild><Link href="/dashboard">Coba Demo Dapur Sari <ChevronRight size={20} aria-hidden="true" /></Link></Button>
            <small>Prototipe · Data fiktif · Tanpa login</small>
          </div>
          <figure className="hero-figure">
            <Image src="/dapur-sari.webp" alt="Pembuat roti menata loyang roti di dapur produksi" fill unoptimized sizes="(max-width: 840px) 100vw, 50vw" preload className="hero-photo" />
            <figcaption className="hero-ticket">
              <div className="hero-ticket-heading"><span className="ticket-mark"><Store size={19} aria-hidden="true" /></span><span><strong>Dapur Sari</strong><small>Usaha roti & kue dalam demo</small></span></div>
              <div className="hero-ticket-flow"><PackageOpen size={15} aria-hidden="true" /> Pemasok <ChevronRight size={13} aria-hidden="true" /> Bahan <ChevronRight size={13} aria-hidden="true" /> Produksi</div>
            </figcaption>
          </figure>
        </section>
        <section id="cara-kerja" className="landing-steps landing-width" aria-labelledby="steps-title">
          <div className="steps-header"><p>Cara kerja</p><h2 id="steps-title">Dari stok bahan ke rencana produksi</h2></div>
          <div className="step-list">
            {steps.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={23} strokeWidth={1.7} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}
          </div>
        </section>
      </main>
      <footer className="landing-footer landing-width"><Brand /><p>Kenali Risiko. Simulasikan Dampak. Amankan Produksi.</p></footer>
    </div>
  );
}
