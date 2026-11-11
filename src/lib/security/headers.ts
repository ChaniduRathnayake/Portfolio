import { buildCsp } from "./csp";

/**
 * The response headers every page ships with, and why. Rendered on /security
 * and in the Breach section. Values must match next.config.ts and proxy.ts.
 */
export const SECURITY_HEADERS = [
  {
    header: "Content-Security-Policy",
    value: buildCsp("{fresh-per-request}").replaceAll("; ", ";\n"),
    short: "nonce-based, strict-dynamic, no inline scripts",
    why: "A new random nonce on every request. Only scripts carrying it can run, and 'strict-dynamic' lets those load their own chunks. No inline event handlers, no eval, no third-party scripts (Cloudflare Turnstile is allowed only when the contact form's bot check is switched on). object-src and base-uri are locked, framing is refused.",
  },
  {
    header: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
    short: "HTTPS only, two years, subdomains included",
    why: "Two years of HTTPS-only, subdomains included. Browsers never try plain HTTP after the first visit.",
  },
  {
    header: "X-Content-Type-Options",
    value: "nosniff",
    short: "no MIME sniffing",
    why: "Stops the browser guessing content types, so an uploaded text file can't be run as a script.",
  },
  {
    header: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
    short: "other sites see the origin only",
    why: "Other sites see that you came from here, not which page or query string.",
  },
  {
    header: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    short: "camera, mic, location, payments off",
    why: "Turns off powerful browser APIs this site never needs, including ad-topic tracking.",
  },
  {
    header: "X-Frame-Options · COOP · CORP",
    value: "DENY · same-origin · same-origin",
    short: "no framing, no cross-origin handles",
    why: "No clickjacking through iframes, no cross-origin window handles, no hotlinking of resources.",
  },
];
