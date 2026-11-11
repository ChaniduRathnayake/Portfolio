import type { NextConfig } from "next";

/**
 * Headers that are the same on every response, assets included.
 * The nonce-based CSP is per request, so it is set in src/proxy.ts instead.
 */
const staticSecurityHeaders = [
  // Two years, subdomains included. Only submit to the preload list once every
  // subdomain of the production domain serves HTTPS.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  // Legacy twin of CSP frame-ancestors 'none' for older browsers and scanners.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The dev-only route indicator sits over the hero. Compile and runtime errors still show.
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: staticSecurityHeaders }];
  },
};

export default nextConfig;
