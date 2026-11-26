"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, CircleAlert, FlaskConical, Play, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/workspace";
import { Busy, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { ParameterForm } from "@/features/data-editor/parameter-form";
import { previewScenario } from "@/lib/api";
import { addScenario, removeScenario, updateScenario } from "@/lib/domain/mutations";
import { computeInputsSignature } from "@/lib/domain/signature";
import { CORE_SCENARIO_IDS, MAX_SCENARIOS, type WorkspaceSnapshot } from "@/lib/domain/types";
import { formatDate } from "@/lib/format";
import { notify } from "@/lib/notify";
import type { SimulationResult } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace-context";
import { SimulationResults } from "./results";
import { ScenarioPicker } from "./scenario-picker";
import { ScenarioSettings } from "./scenario-settings";

interface Completed {
  /** Signature snapshot + skenario saat simulasi dijalankan, untuk mendeteksi hasil basi. */
  signature: string;
  scenarioId: string;
  result?: SimulationResult;
  error?: string;
}

export function Simulator() {
  const { data, snapshot, scenarios, scenario, selectScenario, setData, href } = useWorkspace();
  const controller = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState<Completed>();
  const current = completed?.scenarioId === scenario.id ? completed : undefined;
  const stale = Boolean(current?.result) && current?.signature !== computeInputsSignature(snapshot, [scenario]);
  const isCore = (CORE_SCENARIO_IDS as readonly string[]).includes(scenario.id);

  useEffect(() => () => controller.current?.abort(), []);

  async function run(next: WorkspaceSnapshot) {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    if (next !== snapshot) setData({ ...data, snapshot: next });
    const signature = computeInputsSignature(next, [scenario]);
    setPending(true);
    setCompleted(undefined);
    try {
      const result = await previewScenario(next, scenario, request.signal);
      if (!request.signal.aborted) setCompleted({ signature, scenarioId: scenario.id, result });
    } catch (error) {
      if (!request.signal.aborted) {
        const message = error instanceof Error ? error.message : "Simulasi gagal.";
        setCompleted({ signature, scenarioId: scenario.id, error: message });
        notify.error(message);
      }
    } finally {
      if (!request.signal.aborted) setPending(false);
    }
  }

  function addCustom() {
    const next = addScenario(data, scenario.id, `Skenario ${scenarios.length - 2}`);
    setData(next);
    selectScenario(next.scenarios.at(-1)?.id ?? scenario.id);
    setCompleted(undefined);
    notify.success(`Skenario "${next.scenarios.at(-1)?.name ?? "baru"}" ditambahkan sebagai salinan "${scenario.name}".`);
  }

  function removeCurrent() {
    setData(removeScenario(data, scenario.id));
    notify.success(`Skenario "${scenario.name}" dihapus.`);
    selectScenario("baseline");
    setCompleted(undefined);
  }

  return (
    <>
      <PageHeader title="Simulator Pasokan" action={<Button asChild variant="outline"><Link href={href("/comparison")}>Lihat Perbandingan</Link></Button>}>
        Uji dampak gangguan terhadap produksi {snapshot.business.name.replace(/\s*\(DATA SIMULASI\)\s*$/i, "")}.
      </PageHeader>
      <section className="panel simulator-controls" aria-label="Pengaturan simulasi">
        <header className="panel-heading"><div><h2>Pilih Skenario</h2><p>Atur kondisi pasokan untuk satu periode produksi.</p></div><span className="date-stamp"><CalendarDays size={16} aria-hidden="true" /> {formatDate(scenario.cutoff_date)}</span></header>
        <div className="panel-body">
          <div data-tour="scenario-picker"><ScenarioPicker scenarios={scenarios} selected={scenario} onChange={(id) => { setCompleted(undefined); selectScenario(id); }} pending={pending} /></div>
          <div className="scenario-actions">
            <Button type="button" variant="outline" size="sm" onClick={addCustom} disabled={pending || scenarios.length >= MAX_SCENARIOS}><Plus size={16} aria-hidden="true" /> Tambah Skenario</Button>
            {!isCore && <Button type="button" variant="ghost" size="sm" onClick={removeCurrent} disabled={pending}><Trash2 size={16} aria-hidden="true" /> Hapus Skenario</Button>}
          </div>
          <ScenarioSettings snapshot={snapshot} scenario={scenario} pending={pending} onChange={(next) => { setData(updateScenario(data, next)); notify.changed("Pengaturan skenario diperbarui.", "scenario-updated"); }} />
          <ParameterForm snapshot={snapshot} onApply={run} pending={pending} compact>
            {({ dirty }) => <>
              <div className="simulator-actions">
                <div className="form-notice" aria-live="polite">{(dirty || stale) && "Perubahan belum disimulasikan"}</div>
                <Button type="submit" data-tour="run" disabled={pending}><Play size={17} aria-hidden="true" /> {pending ? "Menjalankan Simulasi…" : "Jalankan Simulasi"}</Button>
              </div>
              <div className="simulator-output" aria-live="polite">
                {pending && <Busy label="Menghitung rencana produksi…" />}
                {!dirty && current?.error && <ErrorState message={current.error} retry={() => run(snapshot)} />}
                {!dirty && stale && <div className="stale-notice" role="status"><CircleAlert size={18} aria-hidden="true" /><p>Hasil simulasi sebelumnya sudah basi karena data atau skenario berubah. Jalankan simulasi lagi sebelum mengambil keputusan.</p></div>}
                {!dirty && current?.result && <div className={stale ? "is-stale" : undefined}><SimulationResults result={current.result} snapshot={snapshot} /></div>}
                {!pending && !current && <div className="simulation-empty"><FlaskConical size={20} aria-hidden="true" /><p>Jalankan simulasi untuk melihat rencana produksi dan penggunaan bahan.</p></div>}
              </div>
            </>}
          </ParameterForm>
        </div>
      </section>
    </>
  );
}
