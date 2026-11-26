import { NextResponse } from "next/server";
import { WorkspaceValidationError } from "@/lib/domain/validation";
import { WorkspaceRepoError } from "@/lib/supabase/workspace-repo";

const MAX_BODY_BYTES = 1_000_000;

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

export function jsonError(message: string, status: number, issues?: { path: string; message: string }[]) {
  return NextResponse.json(issues ? { error: message, issues } : { error: message }, { status });
}

/** Baca body JSON dengan batas ukuran; galat dilempar sebagai `HttpError` berpesan Indonesia. */
export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError("Data yang dikirim terlalu besar.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError("Format data tidak valid. Kirim JSON yang benar.", 400);
  }
}

/** Petakan galat apa pun menjadi respons aman: tanpa stack trace maupun detail internal. */
export function handleError(err: unknown) {
  if (err instanceof HttpError) return jsonError(err.message, err.status, err.issues);
  if (err instanceof WorkspaceValidationError) {
    return jsonError("Data tidak valid. Periksa kembali isian Anda.", 400, err.issues);
  }
  if (err instanceof WorkspaceRepoError) return jsonError(err.message, err.status);
  console.error("[api] galat tak terduga", err instanceof Error ? err.name : "unknown");
  return jsonError("Terjadi kesalahan pada server. Coba lagi beberapa saat.", 500);
}
