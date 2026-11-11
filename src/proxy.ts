import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/security/csp";

/**
 * Runs before every page request (Next.js 16 "proxy", formerly middleware).
 * Generates a per-request nonce and sends the CSP that uses it. Static security
 * headers that never change live in next.config.ts so they also cover assets.
 */
export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, { isDev: process.env.NODE_ENV === "development" });

  // Next.js reads the nonce from the request's CSP header and stamps it on its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  // CTF flag 3 of 4. People who read response headers deserve a reward.
  response.headers.set("X-Recon-Note", "flag 3/4 FLAG{x_h34d3r_p4yl04d_03}");

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
