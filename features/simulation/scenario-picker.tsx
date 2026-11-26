"use client";

import { useId } from "react";
import { CircleCheck, CircleAlert, ShieldCheck } from "lucide-react";
import type { ScenarioConfig as Scenario } from "@/lib/domain/types";

const scenarioContent = {
  baseline: { label: "Normal", text: "Pasokan terjadwal berjalan.", icon: CircleCheck, tone: "good" },
  outage: { label: "Pemasok Utama Gagal", text: "Andalkan stok yang sudah tersedia.", icon: CircleAlert, tone: "bad" },
  mitigation: { label: "Mitigasi: Pemasok Alternatif Aktif", text: "Gunakan penawaran cadangan jika layak.", icon: ShieldCheck, tone: "good" },
};

export function scenarioLabel(scenario: Pick<Scenario, "id" | "name">) {
  return scenarioContent[scenario.id as keyof typeof scenarioContent]?.label ?? scenario.name;
}

export function ScenarioPicker({ scenarios, selected, onChange, pending }: {
  scenarios: Scenario[]; selected: Scenario; onChange: (id: string) => void; pending: boolean;
}) {
  const group = useId();
  return (
    <fieldset className="scenario-options" disabled={pending}>
      <legend className="sr-only">Skenario pasokan</legend>
      {scenarios.map((scenario) => {
        const content = scenarioContent[scenario.id as keyof typeof scenarioContent];
        const Icon = content?.icon ?? CircleCheck;
        return (
          <label className="scenario-option" key={scenario.id}>
            <input type="radio" name={group} aria-label={scenarioLabel(scenario)} value={scenario.id} checked={selected.id === scenario.id} onChange={() => onChange(scenario.id)} />
            <Icon size={20} className={`scenario-option-icon ${content?.tone ?? ""}`} aria-hidden="true" />
            <span><strong>{scenarioLabel(scenario)}</strong>{content && <small>{content.text}</small>}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
