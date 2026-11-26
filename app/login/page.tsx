import type { Metadata } from "next";
import { ArrowLeft, CheckCircle2, ChevronRight, Lock, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Masuk" };

const highlights = [
  "Petakan pemasok, bahan baku, dan resep menu usahamu sendiri",
  "Uji skenario gangguan dengan solver optimasi deterministik",
  "Data tersimpan privat per akun dengan isolasi Row Level Security",
];

export default function LoginPage() {
  return (
    <div className="auth-page">
      <a className="skip-link" href="#isi-masuk">Lewati ke formulir masuk</a>

      <div className="auth-split">
        <aside className="auth-visual-col" aria-label="Gambaran ruang kerja MicroChain">
          <figure className="auth-visual-frame">
            <Image
              src="/login-kitchen.webp"
              alt="Pemilik usaha roti menyiapkan bahan baku tepung, gula, mentega, dan loyang roti pagi hari di dapur produksi"
              fill
              unoptimized
              preload
              sizes="(max-width: 960px) 100vw, 52vw"
              className="auth-visual-photo"
            />
            <div className="auth-visual-scrim" aria-hidden="true" />
            <div className="auth-visual-top">
              <span className="auth-visual-pill">
                <ShieldCheck size={14} aria-hidden="true" />
                Ruang kerja rantai pasok UMKM
              </span>
            </div>
            <figcaption className="auth-visual-copy">
              <h2>Kendalikan pasokan usahamu dari satu ruang kerja.</h2>
              <ul className="auth-visual-list">
                {highlights.map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={15} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </figcaption>
          </figure>
        </aside>

        <div className="auth-content-col">
          <header className="auth-top-bar">
            <Brand />
            <nav aria-label="Navigasi masuk" className="auth-top-nav">
              <Link href="/" className="auth-back-link">
                <ArrowLeft size={14} aria-hidden="true" />
                <span>Beranda</span>
              </Link>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">
                  Buka ruang demo <ChevronRight size={15} aria-hidden="true" />
                </Link>
              </Button>
            </nav>
          </header>

          <main id="isi-masuk" className="auth-main">
            <section className="auth-form-wrap" aria-labelledby="login-title">
              <div className="auth-intro">
                <span className="auth-kicker">
                  <Lock size={13} aria-hidden="true" />
                  Akses akun pribadi
                </span>
                <h1 id="login-title">Masuk ke workspace</h1>
                <p>
                  Masuk dengan email dan kata sandi. Workspace kosong milik Anda dibuat otomatis saat pertama masuk, siap diisi dengan data usaha Anda sendiri.
                </p>
              </div>

              <div className="auth-card">
                <Suspense fallback={<div className="state-panel" aria-hidden="true">Memuat formulir…</div>}>
                  <LoginForm />
                </Suspense>
              </div>

              <div className="auth-footer">
                <p className="login-footer-note">
                  Hanya ingin mencoba?{" "}
                  <Link href="/dashboard" className="text-link">
                    Buka demo tanpa masuk
                  </Link>
                </p>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
