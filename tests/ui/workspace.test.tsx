// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DAPUR_SARI_FALLBACK_FIXTURE, EMPTY_WORKSPACE_FIXTURE } from "@/lib/domain/fixture";
import { computeInputsSignature } from "@/lib/domain/signature";
import { compareScenarios } from "@/lib/solver/compare";
import { solveScenario } from "@/lib/solver/milp-solver";

vi.mock("@/lib/notify", () => ({ notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), changed: vi.fn() } }));
vi.mock("@/features/network/network-canvas", () => ({ NetworkCanvas: () => <div data-testid="graph-canvas" /> }));
vi.mock("@/features/simulation/comparison-chart", () => ({ ComparisonChart: () => <div data-testid="chart" /> }));
const replace = vi.fn();
const router = { replace, push: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signOut: vi.fn().mockResolvedValue({}) } }) }));

import { notify } from "@/lib/notify";
import { resetStoredValues } from "@/lib/use-stored-value";
import { TOUR_STEPS } from "@/components/guide/steps";
import { Workspace } from "@/components/workspace";
import { Dashboard } from "@/features/dashboard/dashboard";
import { DataEditor } from "@/features/data-editor/data-editor";
import { SupplyNetwork } from "@/features/network/supply-network";
import { Comparison } from "@/features/simulation/comparison";
import { Simulator } from "@/features/simulation/simulator";

const fixture = () => structuredClone(DAPUR_SARI_FALLBACK_FIXTURE);
const BUSINESS_ID = "11111111-1111-4111-8111-111111111111";
const RP = (value: string) => new RegExp(`^Rp\\s${value.replace(".", "\\.")}$`);
const STALE = /hasil simulasi sebelumnya sudah basi/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let calls: { url: string; method: string; body: any }[];
let workspaceStatus = 200;
let workspaceKind: "empty" | "demo" = "empty";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function handler(url: string, init?: RequestInit): Promise<Response> {
  const method = init?.method ?? "GET";
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  calls.push({ url, method, body });
  if (url === "/api/demo") return json(fixture());
  if (url === "/api/simulate") return json({ result: await solveScenario(body.snapshot, body.scenario) });
  if (url === "/api/simulate/compare") {
    const { results, comparison } = await compareScenarios(body.snapshot, body.scenarios);
    return json({ results, comparison, inputs_signature: computeInputsSignature(body.snapshot, body.scenarios) });
  }
  if (url === "/api/workspace" && method === "GET")
    return workspaceStatus === 401 ? json({ error: "Anda belum masuk." }, 401) : json({ businessId: BUSINESS_ID, ...(workspaceKind === "empty" ? structuredClone(EMPTY_WORKSPACE_FIXTURE) : fixture()) });
  if (url === "/api/workspace" && method === "PUT") return json({ ok: true, snapshot: body.snapshot, scenarios: body.scenarios });
  if (url === "/api/workspace/reset") return json({ businessId: BUSINESS_ID, ...structuredClone(EMPTY_WORKSPACE_FIXTURE) });
  return json({ error: "tidak ditemukan" }, 404);
}
const count = (url: string) => calls.filter((c) => c.url === url).length;

function stubMatchMedia(mobile: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: mobile && query.includes("max-width"), media: query,
    addEventListener: () => {}, removeEventListener: () => {},
  }));
}

beforeEach(() => {
  calls = [];
  workspaceStatus = 200;
  workspaceKind = "empty";
  replace.mockReset();
  for (const fn of Object.values(notify)) vi.mocked(fn).mockReset();
  sessionStorage.clear();
  localStorage.clear();
  resetStoredValues();
  // Pengantar dan panduan dianggap sudah dilihat; test panduan menghapusnya sendiri.
  localStorage.setItem("microchain:onboarding:v1", "done");
  localStorage.setItem("microchain:tour:v1", "done");
  stubMatchMedia(true);
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => handler(url, init)));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const PAGES = { dashboard: Dashboard, network: SupplyNetwork, simulator: Simulator, comparison: Comparison, data: DataEditor };
type PageId = keyof typeof PAGES;

/** Meniru layout Next: Provider bertahan saat berpindah halaman. */
function Harness({ mode, initial = "dashboard" }: { mode: "demo" | "workspace"; initial?: PageId }) {
  const [page, setPage] = useState<PageId>(initial);
  const Page = PAGES[page];
  return (
    <Workspace mode={mode}>
      <div role="group" aria-label="Pindah halaman uji">
        {(Object.keys(PAGES) as PageId[]).map((id) => (
          <button key={id} type="button" onClick={() => setPage(id)}>{`ke-${id}`}</button>
        ))}
      </div>
      <Page />
    </Workspace>
  );
}

async function renderPage(mode: "demo" | "workspace", initial: PageId = "dashboard") {
  render(<Harness mode={mode} initial={initial} />);
  await screen.findByRole("heading", { level: 1 });
}
const go = (id: PageId) => userEvent.click(screen.getByRole("button", { name: `ke-${id}` }));

describe("Shell (sidebar, bar) layout", () => {
  it("shows brand, business card, five nav links with demo hrefs, and the demo mode label", async () => {
    await renderPage("demo");
    const nav = screen.getByRole("navigation", { name: "Navigasi ruang kerja" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/dashboard", "/network", "/simulator", "/comparison", "/data"]);
    expect(screen.getAllByText("Ruang kerja demo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Data simulasi").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Simpan ke Workspace/ })).not.toBeInTheDocument();
  });

  it("uses /workspace-prefixed links and save/logout actions in workspace mode", async () => {
    await renderPage("workspace");
    const links = within(screen.getByRole("navigation", { name: "Navigasi ruang kerja" })).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/workspace/dashboard", "/workspace/network", "/workspace/simulator", "/workspace/comparison", "/workspace/data"]);
    expect(screen.getByRole("button", { name: /Simpan ke Workspace/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Keluar/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Buka Simulator/ })).toHaveAttribute("href", "/workspace/simulator");
  });
});

describe("Dashboard", () => {
  it("shows the overview band, stock and single-supplier risk", async () => {
    await renderPage("demo");
    const band = screen.getByRole("region", { name: "Ringkasan Dapur Sari" });
    expect(within(band).getByText("Pemasok").nextSibling).toHaveTextContent("2");
    expect(within(band).getByText("Bahan baku").nextSibling).toHaveTextContent("3");
    expect(screen.getByText("8 kg")).toBeInTheDocument();
    expect(screen.getByText("Satu pemasok")).toBeInTheDocument();
    expect(screen.getByText(/Pasokan terjadwal bergantung pada Pemasok A\. Produk bergantung pada bahan ini: Roti, Kue kering\./)).toBeInTheDocument();
  });
});

describe("Supply network", () => {
  it("shows the node list on small screens and opens node details with relationships", async () => {
    await renderPage("demo", "network");
    expect(screen.getByRole("button", { name: "Daftar" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByTestId("graph-canvas")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Pemasok A/ }));
    const detail = screen.getByRole("region", { name: "Detail hubungan" });
    expect(within(detail).getByRole("heading", { name: "Pemasok A" })).toBeInTheDocument();
    expect(within(detail).getByText("Tepung terigu")).toBeInTheDocument();
    expect(within(detail).getByText(/Pengiriman terjadwal/)).toBeInTheDocument();
  });

  it("marks flour as single-supplier in the normal scenario and stock-only in the outage scenario", async () => {
    await renderPage("demo", "network");
    const flour = () => screen.getByRole("button", { name: /Tepung terigu/ });
    expect(within(flour()).getByText("Satu pemasok")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Skenario jaringan"), "outage");
    expect(within(flour()).getByText("Stok awal")).toBeInTheDocument();
    expect(screen.getByText("Pemasok A dinonaktifkan dalam skenario ini.")).toBeInTheDocument();
  });

  it("shows the graph on desktop and filters nodes by search", async () => {
    stubMatchMedia(false);
    await renderPage("demo", "network");
    expect(await screen.findByTestId("graph-canvas")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Daftar" }));
    await userEvent.type(screen.getByRole("searchbox"), "gula");
    expect(screen.getByRole("button", { name: /Gula pasir/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mentega/ })).not.toBeInTheDocument();
    await userEvent.clear(screen.getByRole("searchbox"));
    await userEvent.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText(/Tidak ada node yang cocok/)).toBeInTheDocument();
  });
});

describe("Simulator", () => {
  async function runScenario(name: string) {
    await userEvent.click(screen.getByRole("radio", { name }));
    await userEvent.click(screen.getByRole("button", { name: "Jalankan Simulasi" }));
    await screen.findByRole("heading", { name: "Hasil Simulasi" });
  }

  it.each([
    ["Normal", /^Rp\s450\.000$/, "100"],
    ["Pemasok Utama Gagal", /^Rp\s210\.000$/, "20"],
    ["Mitigasi: Pemasok Alternatif Aktif", /^Rp\s342\.000$/, "68"],
  ])("runs %s and shows the exact net contribution and bread plan", async (name, money, bread) => {
    await renderPage("demo", "simulator");
    await runScenario(name);
    expect(screen.getAllByText(money).length).toBeGreaterThan(0);
    const row = screen.getByRole("row", { name: /^Roti\b/ });
    expect(within(row).getAllByRole("cell")[0]).toHaveTextContent(new RegExp(`^${bread}$`));
    expect(screen.getByText("Optimal")).toBeInTheDocument();
  });

  it("shows the alternative purchase and the explanation for the mitigation scenario", async () => {
    await renderPage("demo", "simulator");
    await runScenario("Mitigasi: Pemasok Alternatif Aktif");
    expect(screen.getByText("Rencana memakai 12 pak Tepung terigu dari Pemasok B.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dasar rekomendasi" })).toBeInTheDocument();
  });

  it("marks results stale when the scenario changes, dims them, and clears after rerun", async () => {
    await renderPage("demo", "simulator");
    await runScenario("Normal");
    expect(screen.queryByText(STALE)).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/Pemasok A gagal kirim/));
    expect(await screen.findByText(STALE)).toBeInTheDocument();
    expect(screen.getByText("Perubahan belum disimulasikan")).toBeInTheDocument();
    expect(count("/api/simulate")).toBe(1); // tidak menghitung otomatis tiap perubahan

    await userEvent.click(screen.getByRole("button", { name: "Jalankan Simulasi" }));
    await waitFor(() => expect(count("/api/simulate")).toBe(2));
    await waitFor(() => expect(screen.queryByText(STALE)).not.toBeInTheDocument());
    expect(screen.getAllByText(/^Rp\s210\.000$/).length).toBeGreaterThan(0);
  });

  it("applies delay_days and cutoff changes to the scenario sent to the solver", async () => {
    await renderPage("demo", "simulator");
    const delay = screen.getByLabelText(/Keterlambatan Pemasok A/);
    await userEvent.clear(delay);
    await userEvent.type(delay, "5");
    await userEvent.click(screen.getByRole("button", { name: "Jalankan Simulasi" }));
    await screen.findByRole("heading", { name: "Hasil Simulasi" });
    const body = calls.filter((c) => c.url === "/api/simulate").at(-1)!.body;
    expect(body.scenario.disruptions).toEqual([{ type: "delay_delivery", delivery_id: "supplier_a_flour_delivery", delay_days: 5 }]);
    expect(screen.getAllByText(/^Rp\s210\.000$/).length).toBeGreaterThan(0); // pengiriman tertunda melewati batas
    expect(screen.getByText(/Pengiriman dari Pemasok A tertunda 5 hari/)).toBeInTheDocument();
  });

  it("does not crash or send NaN when a number field is emptied or filled with junk", async () => {
    await renderPage("demo", "simulator");
    const delay = screen.getByLabelText(/Keterlambatan Pemasok A/);
    await userEvent.clear(delay);
    await userEvent.type(delay, "abc-5");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Jalankan Simulasi" }));
    await screen.findByRole("heading", { name: "Hasil Simulasi" });
    const body = calls.filter((c) => c.url === "/api/simulate").at(-1)!.body;
    expect(body.scenario.disruptions).toEqual([]);
  });

  it("adds a custom scenario copy and removes it; core scenarios cannot be removed", async () => {
    await renderPage("demo", "simulator");
    expect(screen.queryByRole("button", { name: "Hapus Skenario" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tambah Skenario" }));
    expect(screen.getByRole("radio", { name: "Skenario 1" })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Hapus Skenario" }));
    expect(screen.queryByRole("radio", { name: "Skenario 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Normal" })).toBeChecked();
  });

  it("shows a recoverable error when the request fails", async () => {
    await renderPage("demo", "simulator");
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      url === "/api/simulate" ? json({ error: "Data tidak valid. Periksa kembali isian Anda." }, 400) : handler(url),
    ));
    await userEvent.click(screen.getByRole("button", { name: "Jalankan Simulasi" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/tidak valid/i);
    vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => handler(url, init)));
    await userEvent.click(within(alert).getByRole("button", { name: "Coba Lagi" }));
    await screen.findByRole("heading", { name: "Hasil Simulasi" });
  });
});

describe("Comparison", () => {
  it("computes automatically and shows at-risk, recovered and recovery percentage", async () => {
    await renderPage("demo", "comparison");
    expect(await screen.findByText("Persentase pemulihan")).toBeInTheDocument();
    const metrics = document.querySelector(".comparison-metrics") as HTMLElement;
    expect(within(metrics).getByText(RP("240.000"))).toBeInTheDocument();
    expect(within(metrics).getByText(RP("132.000"))).toBeInTheDocument();
    expect(within(metrics).getByText("55%")).toBeInTheDocument();
    expect(await screen.findByTestId("chart")).toBeInTheDocument(); // dimuat lewat dynamic import
    const table = screen.getAllByRole("table")[0];
    expect(within(table).getByText(RP("450.000"))).toBeInTheDocument();
    expect(within(table).getByText(RP("210.000"))).toBeInTheDocument();
    expect(within(table).getByText(RP("342.000"))).toBeInTheDocument();
    expect(count("/api/simulate/compare")).toBe(1);
  });

  it("recomputes after data changes elsewhere, but not when nothing changed", async () => {
    await renderPage("demo", "data");
    await go("comparison");
    await screen.findByText("Persentase pemulihan");
    expect(count("/api/simulate/compare")).toBe(1);

    await go("simulator");
    await go("comparison");
    await screen.findByText("Persentase pemulihan");
    expect(count("/api/simulate/compare")).toBe(1); // data sama: memakai hasil yang ada

    await go("data");
    const stock = screen.getByLabelText("Stok tepung terigu (g)");
    await userEvent.clear(stock);
    await userEvent.type(stock, "9000");
    await userEvent.click(screen.getByRole("button", { name: "Simpan Perubahan" }));
    await go("comparison");
    await waitFor(() => expect(count("/api/simulate/compare")).toBe(2));
    await screen.findByText("Persentase pemulihan");
  });
});

describe("Data editor", () => {
  it("applies parameters, flags unsimulated changes, and restores the demo after confirmation", async () => {
    await renderPage("demo", "data");
    const stock = screen.getByLabelText("Stok tepung terigu (g)");
    expect(stock).toHaveValue(8000);
    const save = screen.getByRole("button", { name: "Simpan Perubahan" });
    expect(save).toBeDisabled();
    await userEvent.clear(stock);
    await userEvent.type(stock, "9000");
    expect(screen.getByText("Perubahan belum disimulasikan")).toBeInTheDocument();
    await userEvent.click(save);
    expect(await screen.findByText("Parameter disimpan untuk sesi demo ini.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reset Demo" }));
    expect(count("/api/demo")).toBe(1); // belum reset sebelum konfirmasi
    await userEvent.click(screen.getByRole("button", { name: "Ya, Reset" }));
    await waitFor(() => expect(count("/api/demo")).toBe(2));
    await waitFor(() => expect(screen.getByLabelText("Stok tepung terigu (g)")).toHaveValue(8000));
  });

  it("can cancel the reset confirmation", async () => {
    await renderPage("demo", "data");
    await userEvent.click(screen.getByRole("button", { name: "Reset Demo" }));
    await userEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(count("/api/demo")).toBe(1);
  });

  it("keeps guest edits in sessionStorage and restores them without refetching the template", async () => {
    await renderPage("demo", "data");
    const name = screen.getByLabelText("Nama usaha");
    await userEvent.clear(name);
    await userEvent.type(name, "Toko Kue Maju");
    cleanup();

    calls = [];
    await renderPage("demo", "data");
    expect(screen.getByLabelText("Nama usaha")).toHaveValue("Toko Kue Maju");
    expect(count("/api/demo")).toBe(0);
  });

  it("adds and removes entities and keeps the recipe field safe against empty input", async () => {
    await renderPage("demo", "data");
    await userEvent.type(screen.getByLabelText("Nama pemasok baru"), "Pemasok C");
    await userEvent.click(screen.getByRole("button", { name: /Tambah Pemasok/ }));
    expect(screen.getByLabelText("Nama Pemasok C")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Hapus Pemasok C/ }));
    expect(screen.queryByLabelText("Nama Pemasok C")).not.toBeInTheDocument();

    const bom = screen.getByLabelText("Resep Roti – Tepung terigu (g)");
    await userEvent.clear(bom);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.type(bom, "300");
    expect(bom).toHaveValue("300");
  });

  it("removing a material cascades so the workspace stays valid for the solver", async () => {
    await renderPage("demo", "data");
    await userEvent.click(screen.getByRole("button", { name: /Hapus Mentega/ }));
    await go("comparison");
    await screen.findByText("Persentase pemulihan");
    const body = calls.filter((c) => c.url === "/api/simulate/compare").at(-1)!.body;
    expect(body.snapshot.materials.map((m: { id: string }) => m.id)).not.toContain("butter");
    expect(body.snapshot.bom.every((b: { material_id: string }) => b.material_id !== "butter")).toBe(true);
  });
});

describe("Workspace mode (logged in)", () => {
  it("redirects to /login when the session is missing", async () => {
    workspaceStatus = 401;
    render(<Harness mode="workspace" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("enables save only after changes, saves with the business id, then disables again", async () => {
    await renderPage("workspace", "data");
    const save = screen.getByRole("button", { name: /Simpan ke Workspace/ });
    expect(save).toBeDisabled();

    const name = screen.getByLabelText("Nama usaha");
    await userEvent.clear(name);
    await userEvent.type(name, "Toko Kue Maju");
    expect(screen.getAllByText("Belum disimpan").length).toBeGreaterThan(0);
    expect(save).toBeEnabled();

    await userEvent.click(save);
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    const put = calls.find((c) => c.method === "PUT")!;
    expect(put.body.businessId).toBe(BUSINESS_ID);
    expect(put.body.snapshot.business.name).toBe("Toko Kue Maju");
    await waitFor(() => expect(screen.getByRole("button", { name: /Simpan ke Workspace/ })).toBeDisabled());
    expect(screen.getByText("Perubahan tersimpan di workspace Anda.")).toBeInTheDocument();
    expect(sessionStorage.length).toBe(0); // workspace tidak memakai penyimpanan sesi tamu
  });

  it("empties the persisted workspace through the API after confirmation (starts from zero, not Dapur Sari)", async () => {
    await renderPage("workspace", "data");
    await userEvent.click(screen.getByRole("button", { name: "Kosongkan Data" }));
    expect(screen.getByRole("alertdialog").textContent).toMatch(/mulai dari nol/);
    await userEvent.click(screen.getByRole("button", { name: "Ya, Kosongkan" }));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/workspace/reset" && c.method === "POST")).toBe(true));
  });
});

describe("Workspace kosong untuk pengguna baru", () => {
  it("does not contain any Dapur Sari data and offers to start from zero", async () => {
    await renderPage("workspace");
    expect(screen.getByText("Mulai dari nol")).toBeInTheDocument();
    expect(screen.queryByText("Tepung terigu")).not.toBeInTheDocument();
    expect(screen.queryByText(/Dapur Sari/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Usaha Saya").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Isi Data Usaha" })).toHaveAttribute("href", "/workspace/data");
  });

  it("shows an empty-state message on the network page", async () => {
    await renderPage("workspace", "network");
    expect(screen.getByText(/Belum ada pemasok, bahan, atau produk/)).toBeInTheDocument();
  });

  it("runs the solver on empty data without errors (Rp 0)", async () => {
    await renderPage("workspace", "simulator");
    await userEvent.click(screen.getByRole("button", { name: "Jalankan Simulasi" }));
    await screen.findByRole("heading", { name: "Hasil Simulasi" });
    expect(screen.getByText("Optimal")).toBeInTheDocument();
    expect(screen.getAllByText(/^Rp\s0$/).length).toBeGreaterThan(0);
  });

  it("lets the user build a business from zero and simulate it", async () => {
    await renderPage("workspace", "data");
    await userEvent.type(screen.getByLabelText("Nama bahan baru"), "Tepung");
    await userEvent.click(screen.getByRole("button", { name: /Tambah Bahan/ }));
    await userEvent.type(screen.getByLabelText("Nama produk baru"), "Roti");
    await userEvent.click(screen.getByRole("button", { name: /Tambah Produk/ }));

    const contribution = screen.getByLabelText("Kontribusi Roti (Rp per unit)");
    await userEvent.clear(contribution);
    await userEvent.type(contribution, "3000");
    const recipe = screen.getByLabelText("Resep Roti – Tepung (g)");
    await userEvent.clear(recipe);
    await userEvent.type(recipe, "100");

    const stock = screen.getByLabelText("Stok tepung (g)");
    await userEvent.clear(stock);
    await userEvent.type(stock, "1000");
    const demand = screen.getByLabelText("Permintaan roti (unit)");
    await userEvent.clear(demand);
    await userEvent.type(demand, "5");
    await userEvent.click(screen.getByRole("button", { name: "Terapkan Perubahan" }));

    await go("simulator");
    await userEvent.click(screen.getByRole("button", { name: "Jalankan Simulasi" }));
    await screen.findByRole("heading", { name: "Hasil Simulasi" });
    expect(screen.getAllByText(/^Rp\s15\.000$/).length).toBeGreaterThan(0);
    expect(screen.getByText("Optimal")).toBeInTheDocument();
  });
});

describe("Notifikasi untuk setiap aksi CRUD", () => {
  it("notifies on add and delete of a supplier, immediately", async () => {
    await renderPage("demo", "data");
    await userEvent.type(screen.getByLabelText("Nama pemasok baru"), "Pemasok C");
    await userEvent.click(screen.getByRole("button", { name: /Tambah Pemasok/ }));
    expect(notify.success).toHaveBeenCalledWith('Pemasok "Pemasok C" ditambahkan.');
    await userEvent.click(screen.getByRole("button", { name: /Hapus Pemasok C/ }));
    expect(notify.success).toHaveBeenCalledWith('Pemasok "Pemasok C" dihapus.');
  });

  it("notifies on add and delete of materials, products, deliveries and offers", async () => {
    await renderPage("demo", "data");
    await userEvent.type(screen.getByLabelText("Nama bahan baru"), "Telur");
    await userEvent.click(screen.getByRole("button", { name: /Tambah Bahan/ }));
    expect(notify.success).toHaveBeenCalledWith('Bahan "Telur" ditambahkan.');
    await userEvent.type(screen.getByLabelText("Nama produk baru"), "Donat");
    await userEvent.click(screen.getByRole("button", { name: /Tambah Produk/ }));
    expect(notify.success).toHaveBeenCalledWith('Produk "Donat" ditambahkan.');
    await userEvent.click(screen.getByRole("button", { name: /Tambah Pengiriman/ }));
    expect(notify.success).toHaveBeenCalledWith(expect.stringMatching(/Pengiriman terjadwal ditambahkan/));
    await userEvent.click(screen.getByRole("button", { name: /Tambah Penawaran/ }));
    expect(notify.success).toHaveBeenCalledWith(expect.stringMatching(/Penawaran alternatif ditambahkan/));
    await userEvent.click(screen.getByRole("button", { name: /Hapus pengiriman 2/ }));
    expect(notify.success).toHaveBeenCalledWith("Pengiriman 2 dihapus.");
    await userEvent.click(screen.getByRole("button", { name: /Hapus Donat/ }));
    expect(notify.success).toHaveBeenCalledWith(expect.stringMatching(/Produk "Donat" dihapus/));
  });

  it("uses the merged toast for inline edits instead of one toast per keystroke", async () => {
    await renderPage("demo", "data");
    const name = screen.getByLabelText("Nama Pemasok A");
    await userEvent.type(name, "XYZ");
    expect(notify.changed).toHaveBeenCalled();
    expect(notify.changed).toHaveBeenCalledWith("Pemasok diperbarui.");
    expect(notify.success).not.toHaveBeenCalled();
  });

  it("notifies when parameters are applied", async () => {
    await renderPage("demo", "data");
    const stock = screen.getByLabelText("Stok tepung terigu (g)");
    await userEvent.clear(stock);
    await userEvent.type(stock, "9000");
    await userEvent.click(screen.getByRole("button", { name: "Simpan Perubahan" }));
    expect(notify.success).toHaveBeenCalledWith("Parameter disimpan untuk sesi demo ini.");
  });

  it("notifies on reset, and on scenario add and delete", async () => {
    await renderPage("demo", "data");
    await userEvent.click(screen.getByRole("button", { name: "Reset Demo" }));
    await userEvent.click(screen.getByRole("button", { name: "Ya, Reset" }));
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith("Data dikembalikan ke kondisi awal Dapur Sari."));

    await go("simulator");
    await userEvent.click(screen.getByRole("button", { name: "Tambah Skenario" }));
    expect(notify.success).toHaveBeenCalledWith(expect.stringMatching(/Skenario "Skenario 1" ditambahkan/));
    await userEvent.click(screen.getByRole("button", { name: "Hapus Skenario" }));
    expect(notify.success).toHaveBeenCalledWith('Skenario "Skenario 1" dihapus.');
  });

  it("notifies on workspace save success and on save failure", async () => {
    await renderPage("workspace", "data");
    const name = screen.getByLabelText("Nama usaha");
    await userEvent.clear(name);
    await userEvent.type(name, "Toko Maju");
    await userEvent.click(screen.getByRole("button", { name: /Simpan ke Workspace/ }));
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith("Perubahan tersimpan di workspace Anda."));

    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) =>
      url === "/api/workspace" && init?.method === "PUT" ? json({ error: "Data workspace tidak valid dan tidak dapat disimpan." }, 400) : handler(url, init),
    ));
    await userEvent.type(screen.getByLabelText("Nama usaha"), "!");
    await userEvent.click(screen.getByRole("button", { name: /Simpan ke Workspace/ }));
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith("Data workspace tidak valid dan tidak dapat disimpan."));
  });

  it("notifies when the simulation request fails", async () => {
    await renderPage("demo", "simulator");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url === "/api/simulate" ? json({ error: "Data tidak valid." }, 400) : handler(url))));
    await userEvent.click(screen.getByRole("button", { name: "Jalankan Simulasi" }));
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith("Data tidak valid."));
  });
});

describe("Panduan penggunaan di aplikasi", () => {
  const needsDom = () => {
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} unobserve() {} });
    Element.prototype.scrollIntoView = vi.fn();
  };

  it("shows the onboarding screens on the first visit, and not again once skipped", async () => {
    localStorage.removeItem("microchain:onboarding:v1");
    resetStoredValues();
    render(<Harness mode="demo" />);
    expect(await screen.findByRole("heading", { level: 2, name: "Petakan jaringan pasok" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Lewati" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem("microchain:onboarding:v1")).toBe("done");
    cleanup();
    render(<Harness mode="demo" />);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("reopens the onboarding from the Bantuan menu", async () => {
    await renderPage("demo");
    await userEvent.click(screen.getByRole("button", { name: "Bantuan" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Lihat pengantar/ }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Petakan jaringan pasok");
  });

  it("starts the interactive tour from the last slide, and remembers when it is closed", async () => {
    needsDom();
    localStorage.removeItem("microchain:onboarding:v1");
    resetStoredValues();
    render(<Harness mode="workspace" />);
    await screen.findByRole("heading", { level: 2, name: "Petakan jaringan pasok" });
    await userEvent.click(screen.getByRole("button", { name: /Langkah 4/ }));
    await userEvent.click(screen.getByRole("button", { name: /Mulai Panduan Interaktif/ }));
    expect(localStorage.getItem("microchain:onboarding:v1")).toBe("done");
    const tour = await screen.findByTestId("coach-marks");
    expect(tour).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Menu utama");
    expect(screen.getByText("Langkah 1 dari 12")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Lewati" }));
    expect(screen.queryByTestId("coach-marks")).not.toBeInTheDocument();
    expect(localStorage.getItem("microchain:tour:v1")).toBe("done");
  });

  it("restarts the tour from Bantuan at step 1 and uses the workspace-only save step in workspace mode", async () => {
    needsDom();
    await renderPage("workspace");
    await userEvent.click(screen.getByRole("button", { name: "Bantuan" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Panduan interaktif/ }));
    expect(await screen.findByRole("dialog")).toHaveAccessibleName("Menu utama");
    expect(screen.getByText("Langkah 1 dari 12")).toBeInTheDocument();
  });

  it.each([
    ["dashboard", ["nav-menu", "overview", "risk", "mode", "help"]],
    ["data", ["parameters", "structure"]],
    ["network", ["network-panel", "network-scenario"]],
    ["simulator", ["scenario-picker", "run"]],
  ] as const)("the %s page exposes every tour target it is responsible for", async (page, targets) => {
    await renderPage("demo", page);
    for (const target of targets) {
      expect(document.querySelector(`[data-tour="${target}"]`), `data-tour="${target}" di halaman ${page}`).not.toBeNull();
    }
  });

  it("the comparison page exposes its metrics target once results are ready", async () => {
    await renderPage("demo", "comparison");
    await screen.findByText("Persentase pemulihan");
    expect(document.querySelector('[data-tour="comparison-metrics"]')).not.toBeNull();
  });

  it("every step of the tour has a target in the DOM for its mode (workspace save button)", async () => {
    await renderPage("workspace");
    expect(document.querySelector('[data-tour="save"]')).not.toBeNull();
    expect(document.querySelector('[data-tour="mode"]')).not.toBeNull();
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(12);
  });
});
