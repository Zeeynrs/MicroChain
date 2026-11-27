import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Ubah Kata Sandi" };

export default function ResetPasswordPage() {
  return (
    <div className="auth-page">
      <header className="auth-top-bar shell">
        <Brand />
      </header>
      <main className="auth-main auth-main-single shell">
        <section className="auth-form-wrap" aria-labelledby="reset-title">
          <div className="auth-intro">
            <h1 id="reset-title">Ubah kata sandi</h1>
            <p>Masukkan kata sandi baru untuk akun Anda. Setelah disimpan, Anda langsung masuk ke workspace.</p>
          </div>
          <div className="auth-card">
            <ResetPasswordForm />
          </div>
        </section>
      </main>
    </div>
  );
}
