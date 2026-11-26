import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadUserWorkspace } from "@/lib/supabase/workspace-repo";

/** Cookie sementara yang diset halaman login saat meminta tautan ubah kata sandi. */
const RESET_COOKIE = "microchain-reset";

/**
 * Menukar `code` dari tautan email (konfirmasi pendaftaran atau ubah kata sandi) menjadi sesi.
 * Tujuan redirect hanya salah satu dari dua alamat tetap; parameter `next` bebas diabaikan agar bebas open-redirect.
 */
export async function GET(request: NextRequest) {
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return fail("tautan");

  const wantsReset =
    request.nextUrl.searchParams.get("next") === "/reset-password" || request.cookies.get(RESET_COOKIE)?.value === "1";

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail("kedaluwarsa");

    if (wantsReset) {
      const response = NextResponse.redirect(new URL("/reset-password", request.url));
      response.cookies.delete(RESET_COOKIE);
      return response;
    }
    await loadUserWorkspace(supabase); // menyiapkan salinan Dapur Sari bila pengguna baru
    return NextResponse.redirect(new URL("/workspace", request.url));
  } catch {
    return fail("server");
  }
}
