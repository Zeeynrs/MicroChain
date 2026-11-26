"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/notify";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD = 8;

type Session = "checking" | "ready" | "missing";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [session, setSession] = useState<Session>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Halaman ini hanya berguna bila tautan dari email sudah menukar kode menjadi sesi.
  useEffect(() => {
    let active = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (active) setSession(data.user ? "ready" : "missing");
      })
      .catch(() => {
        if (active) setSession("missing");
      });
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Kata sandi minimal ${MIN_PASSWORD} karakter.`);
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak sama.");
      return;
    }
    setError(null);
    setBusy(true);
    const { error: failure } = await createClient().auth.updateUser({ password });
    if (failure) {
      setBusy(false);
      const code = (failure as { code?: string }).code;
      setError(
        code === "same_password"
          ? "Kata sandi baru harus berbeda dari yang lama."
          : code === "weak_password"
            ? `Kata sandi terlalu lemah. Gunakan minimal ${MIN_PASSWORD} karakter dengan kombinasi huruf dan angka.`
            : "Gagal mengubah kata sandi. Minta tautan baru lalu coba lagi.",
      );
      return;
    }
    notify.success("Kata sandi berhasil diubah.");
    router.replace("/workspace");
    router.refresh();
  }

  if (session === "checking") return <div className="state-panel" role="status">Memeriksa tautan…</div>;

  if (session === "missing") {
    return (
      <div className="state-panel error-panel" role="alert">
        <CircleAlert size={20} aria-hidden="true" />
        <p>Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru lewat Lupa kata sandi di halaman masuk.</p>
        <Button asChild variant="outline" size="sm"><Link href="/login">Ke halaman masuk</Link></Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="login-form">
      <div className="field">
        <label htmlFor="new-password">Kata sandi baru</label>
        <Input id="new-password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <small className="field-hint">Minimal {MIN_PASSWORD} karakter.</small>
      </div>
      <div className="field">
        <label htmlFor="confirm-password">Ulangi kata sandi baru</label>
        <Input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && (
        <div className="state-panel error-panel" role="alert">
          <CircleAlert size={20} aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}
      <Button type="submit" disabled={busy}>{busy ? "Menyimpan…" : "Simpan Kata Sandi Baru"}</Button>
    </form>
  );
}
