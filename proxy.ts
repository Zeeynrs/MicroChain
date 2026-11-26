import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Bila alamat /auth/callback belum didaftarkan di Supabase (Authentication > URL Configuration), Supabase
  // mengembalikan pengguna ke Site URL (/) membawa `?code=`. Teruskan ke callback agar login tetap selesai.
  if (pathname === "/" && searchParams.has("code")) {
    const callback = new URL("/auth/callback", request.url);
    callback.searchParams.set("code", searchParams.get("code") ?? "");
    return NextResponse.redirect(callback);
  }

  return updateSession(request);
}

export const config = {
  // Lewati aset statis; seluruh halaman dan API lain ikut menyegarkan sesi.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
