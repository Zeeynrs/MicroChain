import { NextResponse, type NextRequest } from "next/server";
import { HttpError, handleError, readJson } from "@/lib/api/http";
import { computeInputsSignature } from "@/lib/domain/signature";
import { validateSimulationInput } from "@/lib/domain/validation";
import { solveScenario } from "@/lib/solver/milp-solver";

export async function POST(request: NextRequest) {
  try {
    const body = (await readJson(request)) as { snapshot?: unknown; scenario?: unknown } | null;
    if (!body || typeof body !== "object" || !body.snapshot || !body.scenario) {
      throw new HttpError("Data simulasi tidak lengkap: snapshot dan scenario wajib diisi.", 400);
    }
    const { snapshot, scenarios } = validateSimulationInput({ snapshot: body.snapshot, scenarios: [body.scenario] });
    const result = await solveScenario(snapshot, scenarios[0]);
    return NextResponse.json({ result, inputs_signature: computeInputsSignature(snapshot, scenarios) });
  } catch (err) {
    return handleError(err);
  }
}
