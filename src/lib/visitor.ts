/**
 * What the request itself says about a visitor: their address, and the rough
 * location the host works out from it. Read from headers the visitor's own
 * request arrived with, and only ever shown back to that same visitor (the
 * "What you just told me" panel). Nothing here is stored or logged by the site.
 *
 * Header values are attacker-controllable off Vercel, so each one is checked
 * against a strict shape before it is used, and React escapes it on output.
 */

export interface Visitor {
  /** IPv4 or IPv6 address, or null if the request didn't carry a usable one. */
  ip: string | null;
  /** True for loopback and private ranges (local development, a LAN). */
  local: boolean;
  /** "City, Country", as far as the host could tell. Vercel only. */
  place: string | null;
  /** IANA time zone the address maps to, for comparing with the browser's clock. */
  timeZone: string | null;
  /** The network the address belongs to, e.g. "AS9329". Vercel only. */
  network: string | null;
}

const IP_SHAPE = /^[0-9a-fA-F:.]{3,45}$/;
const LOCAL = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|f[cd][0-9a-f]{2}:|fe80:)/i;

function clean(value: string | null, max: number): string | null {
  if (!value) return null;
  let text = value;
  try {
    // Vercel percent-encodes city names ("S%C3%A3o%20Paulo").
    text = decodeURIComponent(value);
  } catch {
    // Not valid encoding: use it as sent.
  }
  // Letters, marks, digits, spaces and the few punctuation marks place names use.
  text = text.replace(/[^\p{L}\p{M}\p{N} .,'()-]/gu, "").trim();
  return text && text.length <= max ? text : null;
}

export function readVisitor(headers: Headers): Visitor {
  const forwarded = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0] ?? "";
  // IPv4 addresses often arrive wrapped as IPv6 ("::ffff:203.0.113.7").
  const candidate = forwarded.trim().replace(/^::ffff:/i, "");
  const ip = IP_SHAPE.test(candidate) ? candidate : null;

  const countryCode = headers.get("x-vercel-ip-country");
  let country: string | null = null;
  if (countryCode && /^[A-Z]{2}$/.test(countryCode)) {
    try {
      country = new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? null;
    } catch {
      country = null;
    }
  }
  const city = clean(headers.get("x-vercel-ip-city"), 60);

  const zone = headers.get("x-vercel-ip-timezone");
  const asn = headers.get("x-vercel-ip-as-number");

  return {
    ip,
    local: ip !== null && LOCAL.test(ip),
    place: [city, country].filter(Boolean).join(", ") || null,
    timeZone: zone && /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){1,2}$/.test(zone) ? zone : null,
    network: asn && /^\d{1,10}$/.test(asn) ? `AS${asn}` : null,
  };
}
