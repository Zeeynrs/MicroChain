import { NextResponse, type NextRequest } from "next/server";
import { HttpError, handleError, readJson } from "@/lib/api/http";
import { computeInputsSignature } from "@/lib/domain/signature";
import { validateWorkspaceData } from "@/lib/domain/validation";
import { compareScenarios } from "@/lib/solver/compare";

export async function POST(request: NextRequest) {
  try {
    const body = (await readJson(request)) as { snapshot?: unknown; scenarios?: unknown } | null;
    if (!body || typeof body !== "object" || !body.snapshot || !body.scenarios) {
      throw new HttpError("Data simulasi tidak lengkap: snapshot dan scenarios wajib diisi.", 400);
    }
    const { snapshot, scenarios } = validateWorkspaceData({ snapshot: body.snapshot, scenarios: body.scenarios });
    const { results, comparison } = await compareScenarios(snapshot, scenarios);
    return NextResponse.json({ results, comparison, inputs_signature: computeInputsSignature(snapshot, scenarios) });
  } catch (err) {
    return handleError(err);
  }
}
