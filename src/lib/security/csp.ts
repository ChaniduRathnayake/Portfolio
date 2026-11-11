/**
 * Content-Security-Policy builder.
 *
 * Single source of truth: the proxy sends this policy with a fresh nonce on every
 * request, and the /security page renders the same policy with a placeholder so
 * what visitors read is exactly what the server sends.
 */

const TURNSTILE = "https://challenges.cloudflare.com";

/** Turnstile is optional: the policy only allows Cloudflare when a site key is configured. */
export const turnstileEnabled = () => Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export function buildCsp(nonce: string, { isDev = false, turnstile = turnstileEnabled() } = {}): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'strict-dynamic' lets scripts that Next.js loads (trusted via the nonce)
    // load their own chunks. React needs eval only for dev-mode debugging.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(turnstile ? [TURNSTILE] : []),
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    // Production: only nonce'd inline styles. Dev: the error overlay injects
    // un-nonced styles, so dev falls back to 'unsafe-inline'.
    "style-src": isDev ? ["'self'", "'unsafe-inline'"] : ["'self'", `'nonce-${nonce}'`],
    "img-src": ["'self'", "data:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(turnstile ? [TURNSTILE] : [])],
    "frame-src": turnstile ? [TURNSTILE] : ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!isDev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}
