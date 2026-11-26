// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const signUp = vi.fn();
const resetPasswordForEmail = vi.fn();
const signInWithOtp = vi.fn();
const replace = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithPassword, signUp, resetPasswordForEmail, signInWithOtp } }),
}));
let searchError: string | null = null;
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
  useSearchParams: () => ({ get: (key: string) => (key === "error" ? searchError : null) }),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import HomePage from "@/app/page";
import LoginForm from "@/app/login/LoginForm";
import LoginPage from "@/app/login/page";
import { formatDate, formatMoney, formatNumber, formatPercent, formatQuantity } from "@/lib/format";

beforeEach(() => {
  for (const fn of [signInWithPassword, signUp, resetPasswordForEmail, signInWithOtp, replace]) fn.mockReset();
  searchError = null;
  document.cookie = "microchain-reset=; path=/; max-age=0";
});
afterEach(cleanup);

describe("HomePage (landing)", () => {
  it("links the main CTA to the demo workspace and offers login", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: /Coba Demo Dapur Sari/ })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: /Buka ruang demo/ })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Masuk" })).toHaveAttribute("href", "/login");
  });

  it("renders the hero photo asset, the three steps and the footer tagline in Indonesian", () => {
    const { container } = render(<HomePage />);
    expect(screen.getByRole("img", { name: /Pembuat roti/ })).toHaveAttribute("src", "/dapur-sari.webp");
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Saat pasokan\s*terganggu,\s*produksi tetap\s*terencana\./);
    for (const title of ["Petakan jaringan pasok", "Uji gangguan pasokan", "Bandingkan rencana produksi"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(screen.getByText("Kenali Risiko. Simulasikan Dampak. Amankan Produksi.")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/lorem ipsum|get started|sign in|learn more/i);
  });

  it("has a skip link and a labelled brand link", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: "Lewati ke isi" })).toHaveAttribute("href", "#isi");
    expect(screen.getAllByRole("link", { name: "MicroChain, beranda" }).length).toBeGreaterThan(0);
  });

  it("renders pain points, interactive 3-scenario Dapur Sari preview with live slider, 4 feature modules, comparison, and FAQ", async () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /Keputusan dapur saat pasokan macet/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Jaringan Pasok Interaktif" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Simulator Gangguan & Rencana Produksi" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Perbandingan 3 Skenario & Margin Pulih" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Data Usaha, Penanda Basi & Workspace Pribadi" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Bedanya menebak manual dengan menghitung lewat MicroChain/ })).toBeInTheDocument();
    expect(screen.getByText("Apa itu MicroChain?")).toBeInTheDocument();

    // Interactive scenario tabs & live backup-pack slider recalculate Dapur Sari deterministically
    const panel = () => screen.getByRole("tabpanel");
    expect(panel()).toHaveTextContent(/68 buah/);
    const slider = screen.getByLabelText(/Simulasikan batas pak Pemasok B/);
    fireEvent.change(slider, { target: { value: "6" } });
    expect(panel()).toHaveTextContent(/44 buah/);
    expect(panel()).toHaveTextContent(/Rp\s*276\.000/);
    await userEvent.click(screen.getByRole("button", { name: /Reset/ }));
    expect(panel()).toHaveTextContent(/68 buah/);

    await userEvent.click(screen.getByRole("tab", { name: /Pemasok Utama Gagal/ }));
    expect(panel()).toHaveTextContent(/20 buah/);
    expect(panel()).toHaveTextContent(/Turun Rp 240\.000/);
    await userEvent.click(screen.getByRole("tab", { name: /Normal/ }));
    expect(panel()).toHaveTextContent(/100 buah/);
  });

  it("wires GSAP responsive scroll choreography hooks and scroll progress indicator cleanly", () => {
    const { container, unmount } = render(<HomePage />);
    expect(container.querySelector("[data-gsap='scroll-progress']")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-gsap='pain-row']")).toHaveLength(4);
    expect(container.querySelectorAll("[data-gsap='spotlight-row']")).toHaveLength(2);
    expect(container.querySelectorAll("[data-gsap='step-card']")).toHaveLength(3);
    unmount();
  });
});

describe("LoginPage", () => {
  it("is a split-screen password login with generated kitchen photo, demo escape hatch, and no Dapur Sari clone promise", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Masuk ke workspace" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Pemilik usaha roti menyiapkan bahan baku/ })).toHaveAttribute("src", "/login-kitchen.webp");
    expect(screen.getByRole("link", { name: "Buka demo tanpa masuk" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText(/Workspace kosong milik Anda/)).toBeInTheDocument();
    expect(screen.queryByText(/Dapur Sari Anda/)).not.toBeInTheDocument();
  });
});

describe("LoginForm (password only; link only for forgot password)", () => {
  it("has no magic-link login and toggles password visibility cleanly", async () => {
    render(<LoginForm />);
    expect(screen.queryByRole("button", { name: /Tautan email/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Kirim Tautan Masuk" })).not.toBeInTheDocument();
    const pwd = screen.getByLabelText("Kata sandi");
    expect(pwd).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Tampilkan kata sandi" }));
    expect(pwd).toHaveAttribute("type", "text");
    await userEvent.click(screen.getByRole("button", { name: "Sembunyikan kata sandi" }));
    expect(pwd).toHaveAttribute("type", "password");
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("signs in with email and password and goes to the workspace", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "pemilik@dapur.id");
    await userEvent.type(screen.getByLabelText("Kata sandi"), "rahasia123");
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith({ email: "pemilik@dapur.id", password: "rahasia123" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/workspace"));
  });

  it("shows Indonesian errors for wrong credentials and rate limits without leaking provider text", async () => {
    signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials", message: "Invalid login credentials" } });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "pemilik@dapur.id");
    await userEvent.type(screen.getByLabelText("Kata sandi"), "salah");
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Email atau kata sandi salah.");
    expect(replace).not.toHaveBeenCalled();

    signInWithPassword.mockResolvedValue({ error: { code: "over_email_send_rate_limit", status: 429, message: "email rate limit exceeded" } });
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/Batas pengiriman email/));
    expect(screen.getByRole("alert").textContent).not.toMatch(/exceeded/);
  });

  it("validates the email and password before calling Supabase", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(screen.getByRole("alert").textContent).toMatch(/email yang valid/);
    await userEvent.type(screen.getByLabelText("Email"), "pemilik@dapur.id");
    await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(screen.getByRole("alert").textContent).toMatch(/Masukkan kata sandi/);
    await userEvent.type(screen.getByLabelText("Kata sandi"), "pendek");
    await userEvent.click(screen.getByRole("button", { name: "Daftar Akun Baru" }));
    expect(screen.getByRole("alert").textContent).toMatch(/minimal 8 karakter/);
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("signs up: straight in when no confirmation is required, otherwise asks to check email", async () => {
    signUp.mockResolvedValue({ data: { session: { access_token: "x" } }, error: null });
    const { unmount } = render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "baru@dapur.id");
    await userEvent.type(screen.getByLabelText("Kata sandi"), "rahasia123");
    await userEvent.click(screen.getByRole("button", { name: "Daftar Akun Baru" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/workspace"));
    expect(signUp.mock.calls[0][0].options.emailRedirectTo).toMatch(/\/auth\/callback$/);
    unmount();

    signUp.mockResolvedValue({ data: { session: null }, error: null });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "baru@dapur.id");
    await userEvent.type(screen.getByLabelText("Kata sandi"), "rahasia123");
    await userEvent.click(screen.getByRole("button", { name: "Daftar Akun Baru" }));
    expect(await screen.findByText(/tautan konfirmasi/)).toBeInTheDocument();
  });

  it("forgot password: sends a reset link aimed at the change-password page and marks the browser", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "pemilik@dapur.id");
    await userEvent.click(screen.getByRole("button", { name: "Lupa kata sandi?" }));
    await waitFor(() => expect(resetPasswordForEmail).toHaveBeenCalledTimes(1));
    const [email, options] = resetPasswordForEmail.mock.calls[0];
    expect(email).toBe("pemilik@dapur.id");
    expect(options.redirectTo).toMatch(/\/auth\/callback\?next=\/reset-password$/);
    expect(document.cookie).toContain("microchain-reset=1");
    expect(await screen.findByText(/tautan untuk mengubah kata sandi/)).toBeInTheDocument();
  });

  it("forgot password needs a valid email and reports rate limits in Indonesian", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Lupa kata sandi?" }));
    expect(screen.getByRole("alert").textContent).toMatch(/email yang valid/);
    expect(resetPasswordForEmail).not.toHaveBeenCalled();

    resetPasswordForEmail.mockResolvedValue({ error: { code: "over_email_send_rate_limit", status: 429, message: "rate limit" } });
    await userEvent.type(screen.getByLabelText("Email"), "pemilik@dapur.id");
    await userEvent.click(screen.getByRole("button", { name: "Lupa kata sandi?" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/Batas pengiriman email/));
    expect(document.cookie).not.toContain("microchain-reset=1");
  });

  it("explains a failed callback from the ?error query", () => {
    searchError = "kedaluwarsa";
    render(<LoginForm />);
    expect(screen.getByRole("alert").textContent).toMatch(/kedaluwarsa/i);
  });
});

describe("format helpers (id-ID)", () => {
  it("formats money, numbers, percentages, quantities and dates", () => {
    expect(formatMoney(342000)).toMatch(/^Rp\s342\.000$/);
    expect(formatMoney(null)).toBe("—");
    expect(formatNumber(25000)).toBe("25.000");
    expect(formatPercent(55)).toBe("55%");
    expect(formatPercent(null)).toBe("Tidak berlaku");
    expect(formatQuantity(8000, "g")).toBe("8 kg");
    expect(formatQuantity(250, "g")).toBe("250 g");
    expect(formatQuantity(12, "pcs")).toBe("12 buah");
    expect(formatDate("2026-11-24")).toBe("24 November 2026");
  });
});
