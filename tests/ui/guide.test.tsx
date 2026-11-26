// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
let pathname = "/dashboard";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => pathname,
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) => <img src={src} alt={alt} onError={onError} />,
}));

import { CoachMarks } from "@/components/guide/coach-marks";
import { HelpMenu } from "@/components/guide/help-menu";
import { Onboarding } from "@/components/guide/onboarding";
import { INTRO_SLIDES, TOUR_STEPS, type TourStep } from "@/components/guide/steps";
import { resetStoredValues, useStoredValue } from "@/lib/use-stored-value";

beforeEach(() => {
  push.mockReset();
  pathname = "/dashboard";
  resetStoredValues();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.style.overflow = "";
});

describe("Onboarding (layar pengantar)", () => {
  const setup = (mode: "demo" | "workspace" = "workspace") => {
    const onFinish = vi.fn();
    const onSkip = vi.fn();
    render(<Onboarding mode={mode} onFinish={onFinish} onSkip={onSkip} />);
    return { onFinish, onSkip };
  };

  it("is an accessible modal dialog that shows the first slide with its WebP illustration", () => {
    setup();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { level: 2, name: "Petakan jaringan pasok" })).toBeInTheDocument();
    expect(screen.getByText("Langkah 1 dari 4")).toBeInTheDocument();
    const images = screen.getAllByRole("img", { hidden: true }) as HTMLImageElement[];
    expect(images).toHaveLength(INTRO_SLIDES.length);
    expect(images.every((img) => /^\/onboarding\/onboarding-\d-[a-z]+\.webp$/.test(img.getAttribute("src") ?? ""))).toBe(true);
    expect(document.body.style.overflow).toBe("hidden"); // gulir halaman di belakang dikunci
  });

  it("moves through the slides with Berikutnya, Sebelumnya, the dots and the arrow keys", async () => {
    setup();
    const back = screen.getByRole("button", { name: "Sebelumnya" });
    expect(back).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /Berikutnya/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Uji gangguan pasokan" })).toBeInTheDocument();
    expect(back).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: /Langkah 3: Bandingkan rencana produksi/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Bandingkan rencana produksi" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Langkah 3/ })).toHaveAttribute("aria-current", "step");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    expect(screen.getByText("Langkah 2 dari 4")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(screen.getByText("Langkah 4 dari 4")).toBeInTheDocument();
  });

  it("swipes between slides with a horizontal drag", () => {
    setup();
    const dialog = screen.getByRole("dialog");
    fireEvent.pointerDown(dialog, { clientX: 300 });
    fireEvent.pointerUp(dialog, { clientX: 200 });
    expect(screen.getByText("Langkah 2 dari 4")).toBeInTheDocument();
    fireEvent.pointerDown(dialog, { clientX: 100 });
    fireEvent.pointerUp(dialog, { clientX: 220 });
    expect(screen.getByText("Langkah 1 dari 4")).toBeInTheDocument();
    fireEvent.pointerDown(dialog, { clientX: 100 });
    fireEvent.pointerUp(dialog, { clientX: 120 }); // gerak kecil diabaikan
    expect(screen.getByText("Langkah 1 dari 4")).toBeInTheDocument();
  });

  it("can be skipped with Lewati or Escape", async () => {
    const { onSkip } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Lewati" }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onSkip).toHaveBeenCalledTimes(2);
  });

  it("offers the interactive guide or straight usage on the last slide", async () => {
    const { onFinish } = setup();
    for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole("button", { name: /Berikutnya/ }));
    expect(screen.queryByRole("button", { name: "Lewati" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Mulai Panduan Interaktif/ }));
    expect(onFinish).toHaveBeenLastCalledWith(true);
    await userEvent.click(screen.getByRole("button", { name: "Langsung Pakai" }));
    expect(onFinish).toHaveBeenLastCalledWith(false);
  });

  it("words the last slide differently for the guest demo and a personal workspace", async () => {
    const { unmount } = render(<Onboarding mode="demo" onFinish={vi.fn()} onSkip={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Langkah 4/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Coba dengan data Dapur Sari" })).toBeInTheDocument();
    expect(screen.getByText(/hanya ada di browser ini/)).toBeInTheDocument();
    unmount();

    render(<Onboarding mode="workspace" onFinish={vi.fn()} onSkip={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Langkah 4/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Mulai dari data usaha" })).toBeInTheDocument();
  });

  it("falls back to an icon panel when an illustration fails to load", () => {
    setup();
    const [first] = screen.getAllByRole("img", { hidden: true });
    fireEvent.error(first);
    expect(screen.getAllByRole("img", { hidden: true }).some((el) => el.classList.contains("onboard-fallback"))).toBe(true);
  });
});

describe("HelpMenu", () => {
  it("opens a menu with both guides, closes after choosing, and closes on Escape", async () => {
    const onIntro = vi.fn();
    const onTour = vi.fn();
    render(<HelpMenu onIntro={onIntro} onTour={onTour} />);
    const trigger = screen.getByRole("button", { name: "Bantuan" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(screen.getByRole("menuitem", { name: /Panduan interaktif/ }));
    expect(onTour).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("menuitem", { name: /Lihat pengantar/ }));
    expect(onIntro).toHaveBeenCalledTimes(1);

    await userEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes when clicking outside", async () => {
    render(<div><HelpMenu onIntro={vi.fn()} onTour={vi.fn()} /><p>di luar</p></div>);
    await userEvent.click(screen.getByRole("button", { name: "Bantuan" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await userEvent.click(screen.getByText("di luar"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("CoachMarks (panduan interaktif)", () => {
  const steps: TourStep[] = [
    { id: "a", route: "/dashboard", target: "box-a", title: "Kotak A", text: "Teks A." },
    { id: "b", route: "/data", target: "box-b", title: "Kotak B", text: "Teks B." },
    { id: "c", route: "/data", target: "tidak-ada", title: "Kotak C", text: "Teks C." },
  ];

  function stubRects() {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const id = this.getAttribute("data-tour");
      if (id === "box-a") return { top: 100, left: 220, width: 300, height: 80, right: 520, bottom: 180, x: 220, y: 100, toJSON() {} };
      if (id === "box-b") return { top: 300, left: 40, width: 200, height: 60, right: 240, bottom: 360, x: 40, y: 300, toJSON() {} };
      return { top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} };
    });
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
  }

  const setup = (index = 0, base = "") => {
    const onIndex = vi.fn();
    const onClose = vi.fn();
    render(
      <>
        <div data-tour="box-a">A</div>
        <div data-tour="box-b">B</div>
        <CoachMarks steps={steps} index={index} base={base} onIndex={onIndex} onClose={onClose} />
      </>,
    );
    return { onIndex, onClose };
  };

  it("spotlights the target element with padding and shows the step card", async () => {
    stubRects();
    setup(0);
    const spot = await screen.findByTestId("coach-spotlight");
    expect(spot).toHaveStyle({ top: "94px", left: "214px", width: "312px", height: "92px" });
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Kotak A");
    expect(screen.getByText("Langkah 1 dari 3")).toBeInTheDocument();
    expect(screen.getByText("Teks A.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kembali" })).toBeDisabled();
    expect(push).not.toHaveBeenCalled(); // sudah di halaman yang benar
  });

  it("goes forward, back and finishes; Esc and Lewati close it", async () => {
    stubRects();
    pathname = "/data";
    const { onIndex, onClose } = setup(1);
    await screen.findByTestId("coach-spotlight");
    await userEvent.click(screen.getByRole("button", { name: "Berikutnya" }));
    expect(onIndex).toHaveBeenLastCalledWith(2);
    await userEvent.click(screen.getByRole("button", { name: "Kembali" }));
    expect(onIndex).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(onIndex).toHaveBeenLastCalledWith(2);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Lewati" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("keeps the same card element across steps so its measured size never goes stale", async () => {
    stubRects();
    const onIndex = vi.fn();
    const onClose = vi.fn();
    const view = (index: number) => (
      <>
        <div data-tour="box-a">A</div>
        <div data-tour="box-b">B</div>
        <CoachMarks steps={steps} index={index} base="" onIndex={onIndex} onClose={onClose} />
      </>
    );
    const { rerender } = render(view(0));
    await screen.findByTestId("coach-spotlight");
    const first = screen.getByRole("dialog");
    pathname = "/data";
    rerender(view(1));
    expect(screen.getByRole("dialog")).toBe(first);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Kotak B");
  });

  it("navigates to the step's page (with the mode prefix) when it is on another route", () => {
    stubRects();
    pathname = "/workspace/dashboard";
    setup(1, "/workspace");
    expect(push).toHaveBeenCalledWith("/workspace/data");
  });

  it("shows a centred card without spotlight when the target never appears, and labels the last step Selesai", () => {
    vi.useFakeTimers();
    stubRects();
    pathname = "/data";
    const { onClose } = setup(2);
    expect(screen.queryByTestId("coach-spotlight")).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(4200);
    });
    expect(screen.queryByTestId("coach-spotlight")).not.toBeInTheDocument();
    const card = screen.getByRole("dialog");
    expect(card.style.top).toBe("50%");
    fireEvent.click(screen.getByRole("button", { name: "Selesai" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("places the card above the bottom navigation on phones for targets in the upper half", async () => {
    stubRects();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    setup(0);
    await screen.findByTestId("coach-spotlight");
    const card = screen.getByRole("dialog");
    expect(card.style.bottom).toBe("96px");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
  });
});

describe("tour content", () => {
  it("covers every page, uses unique ids, and only one of save/mode applies per mode", () => {
    expect(new Set(TOUR_STEPS.map((s) => s.id)).size).toBe(TOUR_STEPS.length);
    const routes = new Set(TOUR_STEPS.map((s) => s.route));
    for (const r of ["/dashboard", "/data", "/network", "/simulator", "/comparison"]) expect(routes.has(r)).toBe(true);
    expect(TOUR_STEPS.filter((s) => s.only === "workspace").map((s) => s.target)).toEqual(["save"]);
    expect(TOUR_STEPS.filter((s) => s.only === "demo").map((s) => s.target)).toEqual(["mode"]);
  });

  it("has four intro slides with Indonesian copy and WebP images", () => {
    expect(INTRO_SLIDES).toHaveLength(4);
    for (const s of INTRO_SLIDES) {
      expect(s.image).toMatch(/\.webp$/);
      expect(s.title.length).toBeGreaterThan(5);
      expect(s.imageAlt.length).toBeGreaterThan(10);
    }
  });
});

describe("useStoredValue", () => {
  function Probe() {
    const [value, set] = useStoredValue("test:flag", "done");
    return <button onClick={() => set("x")}>{String(value)}</button>;
  }

  it("keeps working in memory when localStorage is blocked", async () => {
    const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    vi.stubGlobal("localStorage", blocked);
    render(<Probe />);
    // Nilai server "done" dipakai saat render awal; setelah hidrasi dibaca dari penyimpanan (kosong).
    const button = screen.getByRole("button");
    await userEvent.click(button);
    expect(button).toHaveTextContent("x");
    vi.unstubAllGlobals();
  });
});
