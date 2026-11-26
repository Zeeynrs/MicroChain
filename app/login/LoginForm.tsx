"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, MailCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const CALLBACK_ERRORS: Record<string, string> = {
  tautan: "Tautan tidak lengkap. Minta tautan baru lewat Lupa kata sandi.",
  kedaluwarsa: "Tautan sudah kedaluwarsa atau pernah dipakai. Minta tautan baru lewat Lupa kata sandi.",
  server: "Kami gagal menyiapkan workspace Anda. Coba masuk lagi beberapa saat lagi.",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;
/** Penanda singkat agar /auth/callback tahu tautan ini untuk mengubah kata sandi, bahkan bila `next` hilang. */
export const RESET_COOKIE = "microchain-reset";

interface AuthFailure {
  code?: string;
  status?: number;
}

/** Ubah galat Supabase menjadi pesan Indonesia yang aman (tanpa detail penyedia). */
function describeFailure(error: AuthFailure, action: "masuk" | "daftar" | "reset"): string {
  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return "Batas pengiriman email tercapai. Tunggu beberapa saat lalu coba lagi.";
  }
  if (error.code === "invalid_credentials") return "Email atau kata sandi salah.";
  if (error.code === "email_not_confirmed") return "Email belum dikonfirmasi. Buka tautan konfirmasi yang dikirim ke email Anda.";
  if (error.code === "user_already_exists" || error.code === "email_exists") return "Email ini sudah terdaftar. Silakan masuk.";
  if (error.code === "weak_password") return `Kata sandi terlalu lemah. Gunakan minimal ${MIN_PASSWORD} karakter dengan kombinasi huruf dan angka.`;
  if (action === "daftar") return "Gagal mendaftar. Periksa data Anda lalu coba lagi.";
  if (action === "reset") return "Gagal mengirim tautan. Periksa email Anda lalu coba lagi.";
  return "Gagal masuk. Periksa email dan kata sandi Anda lalu coba lagi.";
}

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackError = CALLBACK_ERRORS[params.get("error") ?? ""] ?? null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function validEmail() {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Masukkan alamat email yang valid, misalnya nama@usaha.id.");
      return false;
    }
    return true;
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validEmail()) return;
    if (!password) {
      setError("Masukkan kata sandi Anda.");
      return;
    }
    setError(null);
    setBusy(true);
    const { error: failure } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (failure) {
      setBusy(false);
      setError(describeFailure(failure as AuthFailure, "masuk"));
      return;
    }
    router.replace("/workspace");
    router.refresh();
  }

  async function signUp() {
    if (!validEmail()) return;
    if (password.length < MIN_PASSWORD) {
      setError(`Kata sandi minimal ${MIN_PASSWORD} karakter.`);
      return;
    }
    setError(null);
    setBusy(true);
    const { data, error: failure } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (failure) {
      setBusy(false);
      setError(describeFailure(failure as AuthFailure, "daftar"));
      return;
    }
    if (data.session) {
      router.replace("/workspace");
      router.refresh();
      return;
    }
    setBusy(false);
    setSentMessage(`Kami mengirim tautan konfirmasi ke ${email.trim()}. Buka tautan itu, lalu masuk dengan kata sandi Anda.`);
  }

  async function forgotPassword() {
    if (!validEmail()) return;
    setError(null);
    setBusy(true);
    const { error: failure } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (failure) {
      setError(describeFailure(failure as AuthFailure, "reset"));
      return;
    }
    document.cookie = `${RESET_COOKIE}=1; path=/; max-age=3600; samesite=lax`;
    setSentMessage(`Jika ${email.trim()} terdaftar, kami mengirim tautan untuk mengubah kata sandi. Buka tautan itu di browser ini.`);
  }

  if (sentMessage) {
    return (
      <div className="estimate-notice" role="status">
        <MailCheck size={18} aria-hidden="true" />
        <p><strong>Cek email Anda.</strong> {sentMessage}</p>
      </div>
    );
  }

  const message = error ?? callbackError;

  return (
    <form onSubmit={signIn} noValidate className="login-form">
      <div className="field">
        <label htmlFor="email">Email</label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={message ? "login-error" : undefined}
          aria-invalid={message ? true : undefined}
        />
      </div>
      <div className="field">
        <label htmlFor="password">Kata sandi</label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <small className="field-hint">Untuk akun baru, gunakan minimal {MIN_PASSWORD} karakter.</small>
      </div>
      {message && (
        <div className="state-panel error-panel" role="alert">
          <CircleAlert size={20} aria-hidden="true" />
          <p id="login-error">{message}</p>
        </div>
      )}
      <div className="login-actions">
        <Button type="submit" disabled={busy}>{busy ? "Memproses…" : "Masuk"}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={signUp}>Daftar Akun Baru</Button>
      </div>
      <button type="button" className="login-forgot text-link" disabled={busy} onClick={forgotPassword}>
        Lupa kata sandi?
      </button>
    </form>
  );
}
