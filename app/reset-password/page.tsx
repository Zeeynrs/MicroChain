import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Ubah Kata Sandi" };

export default function ResetPasswordPage() {
  return (
    <div className="landing">
      <header className="landing-top landing-width">
        <Brand />
      </header>
      <main className="login-main landing-width">
        <section className="panel login-card" aria-labelledby="reset-title">
          <header className="panel-heading">
            <div>
              <h1 id="reset-title">Ubah kata sandi</h1>
              <p>Masukkan kata sandi baru untuk akun Anda. Setelah disimpan, Anda langsung masuk ke workspace.</p>
            </div>
          </header>
          <div className="panel-body">
            <ResetPasswordForm />
          </div>
        </section>
      </main>
    </div>
  );
}
