import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import { notify } from "@/lib/notify";

beforeEach(() => {
  vi.useFakeTimers();
  for (const fn of Object.values(toast)) fn.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("notify", () => {
  it("shows success, error and info toasts immediately", () => {
    notify.success("Tersimpan");
    notify.error("Gagal");
    notify.info("Info");
    expect(toast.success).toHaveBeenCalledWith("Tersimpan");
    expect(toast.error).toHaveBeenCalledWith("Gagal");
    expect(toast.info).toHaveBeenCalledWith("Info");
  });

  it("merges rapid edits into a single toast after typing stops", () => {
    notify.changed("Pemasok diperbarui.");
    vi.advanceTimersByTime(300);
    notify.changed("Pemasok diperbarui.");
    vi.advanceTimersByTime(300);
    notify.changed("Pemasok diperbarui.");
    expect(toast.success).not.toHaveBeenCalled();
    vi.advanceTimersByTime(800);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Pemasok diperbarui.", { id: "data-updated" });
  });

  it("keeps separate debounce channels per id", () => {
    notify.changed("Data diubah.");
    notify.changed("Skenario diubah.", "scenario-updated");
    vi.advanceTimersByTime(800);
    expect(toast.success).toHaveBeenCalledTimes(2);
  });
});
