import { NextResponse } from "next/server";
import { handleError } from "@/lib/api/http";
import { createClient } from "@/lib/supabase/server";
import { loadDemoTemplate } from "@/lib/supabase/workspace-repo";

/** Data awal mode tamu, dibaca dari tabel `demo_templates` (publik baca-saja). */
export async function GET() {
  try {
    const supabase = await createClient();
    const { snapshot, scenarios } = await loadDemoTemplate(supabase);
    return NextResponse.json({ snapshot, scenarios });
  } catch (err) {
    return handleError(err);
  }
}
