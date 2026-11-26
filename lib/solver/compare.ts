import type {
  ComparisonSummary,
  ScenarioConfig,
  ScenarioResult,
  WorkspaceSnapshot,
} from "@/lib/domain/types";
import { solveScenario } from "./milp-solver";

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

export function summarize(results: ScenarioResult[]): ComparisonSummary {
  const net = (id: string) => results.find((r) => r.scenario_id === id)?.net_contribution_idr ?? 0;
  const baseline = net("baseline");
  const outage = net("outage");
  const mitigation = net("mitigation");

  const loss = Math.max(0, baseline - outage);
  const recovered = mitigation - outage;
  return {
    baseline_net_idr: baseline,
    outage_net_idr: outage,
    mitigation_net_idr: mitigation,
    loss_idr: loss,
    loss_pct_of_baseline: pct(loss, baseline),
    recovered_idr: recovered,
    recovered_pct_of_loss: loss > 0 ? (recovered / loss) * 100 : recovered >= 0 ? 100 : 0,
    recovered_pct_of_baseline: pct(mitigation, baseline),
  };
}

export async function compareScenarios(
  snapshot: WorkspaceSnapshot,
  scenarios: ScenarioConfig[],
): Promise<{ results: ScenarioResult[]; comparison: ComparisonSummary }> {
  const results: ScenarioResult[] = [];
  for (const scenario of scenarios) results.push(await solveScenario(snapshot, scenario));
  return { results, comparison: summarize(results) };
}
