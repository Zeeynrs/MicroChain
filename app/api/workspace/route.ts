import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, handleError, jsonError, readJson } from "@/lib/api/http";
import { validateWorkspaceData } from "@/lib/domain/validation";
import { createClient } from "@/lib/supabase/server";
import { loadUserWorkspace, saveUserWorkspace } from "@/lib/supabase/workspace-repo";

const UNAUTHORIZED = "Anda belum masuk. Silakan masuk dengan email terlebih dahulu.";

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return jsonError(UNAUTHORIZED, 401);
    const { businessId, data } = await loadUserWorkspace(supabase);
    return NextResponse.json({ businessId, snapshot: data.snapshot, scenarios: data.scenarios });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return jsonError(UNAUTHORIZED, 401);

    const body = (await readJson(request)) as { businessId?: unknown; snapshot?: unknown; scenarios?: unknown } | null;
    const businessId = z.string().uuid().safeParse(body?.businessId);
    if (!businessId.success) throw new HttpError("ID workspace tidak valid.", 400);

    const data = validateWorkspaceData({ snapshot: body?.snapshot, scenarios: body?.scenarios });
    const saved = await saveUserWorkspace(supabase, businessId.data, data);
    return NextResponse.json({ ok: true, snapshot: saved.snapshot, scenarios: saved.scenarios });
  } catch (err) {
    return handleError(err);
  }
}
