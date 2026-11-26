// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const updateUser = vi.fn();
const replace = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getUser, updateUser } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh: vi.fn() }) }));

import ResetPasswordPage from "@/app/reset-password/page";

beforeEach(() => {
  for (const fn of [getUser, updateUser, replace]) fn.mockReset();
});
afterEach(cleanup);

describe("Reset password page", () => {
  it("explains an invalid or expired link when there is no recovery session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    render(<ResetPasswordPage />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/Tautan tidak valid atau sudah kedaluwarsa/);
    expect(screen.getByRole("link", { name: "Ke halaman masuk" })).toHaveAttribute("href", "/login");
    expect(screen.queryByLabelText("Kata sandi baru")).not.toBeInTheDocument();
  });

  it("validates length and confirmation before calling Supabase", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    render(<ResetPasswordPage />);
    await userEvent.type(await screen.findByLabelText("Kata sandi baru"), "pendek");
    await userEvent.type(screen.getByLabelText("Ulangi kata sandi baru"), "pendek");
    await userEvent.click(screen.getByRole("button", { name: "Simpan Kata Sandi Baru" }));
    expect(screen.getByRole("alert").textContent).toMatch(/minimal 8 karakter/);

    await userEvent.clear(screen.getByLabelText("Kata sandi baru"));
    await userEvent.type(screen.getByLabelText("Kata sandi baru"), "kata-sandi-baru-1");
    await userEvent.click(screen.getByRole("button", { name: "Simpan Kata Sandi Baru" }));
    expect(screen.getByRole("alert").textContent).toMatch(/Konfirmasi kata sandi tidak sama/);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("saves the new password and goes to the workspace", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    updateUser.mockResolvedValue({ error: null });
    render(<ResetPasswordPage />);
    await userEvent.type(await screen.findByLabelText("Kata sandi baru"), "kata-sandi-baru-1");
    await userEvent.type(screen.getByLabelText("Ulangi kata sandi baru"), "kata-sandi-baru-1");
    await userEvent.click(screen.getByRole("button", { name: "Simpan Kata Sandi Baru" }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: "kata-sandi-baru-1" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/workspace"));
  });

  it("shows friendly errors without provider details", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    updateUser.mockResolvedValue({ error: { code: "same_password", message: "New password should be different" } });
    render(<ResetPasswordPage />);
    await userEvent.type(await screen.findByLabelText("Kata sandi baru"), "kata-sandi-baru-1");
    await userEvent.type(screen.getByLabelText("Ulangi kata sandi baru"), "kata-sandi-baru-1");
    await userEvent.click(screen.getByRole("button", { name: "Simpan Kata Sandi Baru" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Kata sandi baru harus berbeda dari yang lama.");
    expect(replace).not.toHaveBeenCalled();
  });
});
