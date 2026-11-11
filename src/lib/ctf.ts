/**
 * The CTF. Eight flags, FLAG{...}, in two tracks.
 *
 * Site track, hidden around the page:
 *   1. an HTML comment in the page source      (layout.tsx)
 *   2. the browser console                     (AppProviders.tsx)
 *   3. a custom HTTP response header           (proxy.ts)
 *   4. a base64 string inside the 3D scene     (the sticky note on the CRT)
 *
 * Box track, a small boot2root inside the terminal (src/components/terminal/box.ts):
 *   5. enumeration        a hidden directory
 *   6. decoding           base64 over rot13
 *   7. password cracking  a world-readable shadow file and a wordlist
 *   8. privilege escalation   a sudo rule with a wildcard
 *
 * Flags are checked against SHA-256 hashes, so this file does not hand out
 * the answers. The box's files do ship in the bundle (the game runs in the
 * browser), lightly obfuscated; reading the bundle is a valid way to solve it.
 */
export type FlagTrack = "site" | "box";

export const FLAG_HASHES: Record<string, { where: string; track: FlagTrack }> = {
  "904111ca8301bb8fda07b30ea00dafec74ae82f8137b24e3cf749a1544b92c7b": { where: "page source", track: "site" },
  "7274ba8cf551894e0bd425ff907e8bbb32527b29d94ba941cf189028556160d2": { where: "console", track: "site" },
  "74de4d6a10043bb77e518324f1522e97c92acdb551e8a8cdffbf8368ed79f817": { where: "response headers", track: "site" },
  "0f77e33e192c37e12b5d22a032cf15d28116c79281b5780ada958daef4f75da9": { where: "the desk", track: "site" },
  bb81f4b845d2f6fd05b543feee4719dd43bc59ed6414ebd612f902404523ba1d: { where: "enumeration", track: "box" },
  "3e2aaba9505e93a6f14f39998f39b12bf37b9c183fe32a8c07d78553a434c593": { where: "decoding", track: "box" },
  "4a806863679c8a71378072b4402e388cb458102664b83b54e7e222af35011579": { where: "password cracking", track: "box" },
  "25ab1b5679d7d225207623f40d2ba774ea3aff6a8806ad218570b1d6f4807880": { where: "root", track: "box" },
};

export const FLAG_TOTAL = Object.keys(FLAG_HASHES).length;

/** Hashes of one track, in order. */
export const flagsIn = (track: FlagTrack) =>
  Object.entries(FLAG_HASHES)
    .filter(([, flag]) => flag.track === track)
    .map(([hash]) => hash);

const FLAG_PATTERN = /FLAG\{[^}\s]{1,80}\}/g;

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Returns the flag's hash if it is valid, otherwise null. */
export async function checkFlag(candidate: string): Promise<string | null> {
  const hash = await sha256Hex(candidate.trim());
  return hash in FLAG_HASHES ? hash : null;
}

/** Hashes of every valid flag that appears in a block of text. */
export async function findFlags(text: string): Promise<string[]> {
  const candidates = [...new Set(text.match(FLAG_PATTERN) ?? [])].slice(0, 8);
  const hashes = await Promise.all(candidates.map(checkFlag));
  return hashes.filter((h): h is string => h !== null);
}
