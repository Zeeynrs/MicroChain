import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

const updateSession = vi.fn(async (request: NextRequest) => { void request; return NextResponse.next(); });
vi.mock("@/lib/supabase/middleware", () => ({ updateSession: (r: NextRequest) => updateSession(r) }));

import { proxy } from "@/proxy";

const call = (url: string) => proxy(new NextRequest(`http://localhost:3000${url}`));

describe("proxy", () => {
  it("forwards a stray ?code= on / to /auth/callback so Magic Link login still completes", async () => {
    const res = await call("/?code=abc123");
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/auth/callback");
    expect(location.searchParams.get("code")).toBe("abc123");
    expect(location.host).toBe("localhost:3000");
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("only touches the root path and refreshes the session everywhere else", async () => {
    updateSession.mockClear();
    await call("/dashboard?code=abc");
    await call("/");
    expect(updateSession).toHaveBeenCalledTimes(2);
  });
});
