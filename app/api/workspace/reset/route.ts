import { NextResponse } from "next/server";
import { handleError, jsonError } from "@/lib/api/http";
import { createClient } from "@/lib/supabase/server";
import { resetUserWorkspace } from "@/lib/supabase/workspace-repo";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return jsonError("Anda belum masuk. Silakan masuk dengan email terlebih dahulu.", 401);
    const { businessId, data: workspace } = await resetUserWorkspace(supabase);
    return NextResponse.json({ businessId, snapshot: workspace.snapshot, scenarios: workspace.scenarios });
  } catch (err) {
    return handleError(err);
  }
}
