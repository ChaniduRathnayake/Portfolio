"use client";

import { useSyncExternalStore } from "react";
import type { Visitor } from "@/lib/visitor";

/**
 * What a visitor hands over before they've clicked anything: the first step
 * of any recon, pointed back at the reader.
 *
 * Two sources. The address and rough location came with the request itself
 * (read on the server from its headers, see src/lib/visitor.ts). Everything
 * else is read here in the browser from standard APIs. The site keeps none of
 * it: nothing is stored, logged or sent on.
 */

interface NavigatorExtras {
  userAgentData?: { platform?: string; brands?: { brand: string; version: string }[] };
  deviceMemory?: number;
  globalPrivacyControl?: boolean;
  connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
  getBattery?: () => Promise<{ level: number; charging: boolean }>;
}
type Nav = Navigator & NavigatorExtras;

/** Everything read in the browser. The last two arrive a moment later (they are async). */
interface BrowserFacts {
  browser: string;
  screen: string;
  timeZone: string;
  localTime: string;
  languages: string;
  hardware: string;
  graphics: string;
  connection: string;
  preferences: string;
  referrer: string;
  battery?: string;
  fingerprint?: string;
}

function browserName(nav: Nav): string {
  const brand = nav.userAgentData?.brands?.find((b) => !/not.?a.?brand|chromium/i.test(b.brand));
  if (brand) return `${brand.brand} ${brand.version}`;
  const match = /(Firefox|Edg|OPR|Chrome|Version)\/(\d+)/.exec(nav.userAgent);
  if (!match) return "not saying";
  const names: Record<string, string> = { Edg: "Edge", OPR: "Opera", Version: "Safari" };
  return `${names[match[1]] ?? match[1]} ${match[2]}`;
}

function platformName(nav: Nav): string {
  if (nav.userAgentData?.platform) return nav.userAgentData.platform;
  const ua = nav.userAgent;
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad/.test(ua)) return "iOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "not saying";
}

/** The graphics card, as WebGL reports it. A short-lived context, released straight away. */
function graphicsCard(): string {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return "";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const raw = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    // "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)" → the model name.
    const angle = /^ANGLE \([^,]*,\s*([^,]+?)(?:\s+(?:Direct3D|OpenGL|Metal|Vulkan)[^,]*)?(?:,|\))/.exec(raw);
    return (angle ? angle[1] : raw).replace(/\s*\(0x[0-9a-f]+\)/gi, "").trim().slice(0, 70);
  } catch {
    return "";
  }
}

/** Text drawn to a canvas comes out slightly differently on every setup; that difference identifies it. */
function canvasProbe(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 48;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "16px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(100, 4, 80, 24);
    ctx.fillStyle = "#069";
    ctx.fillText("build/break éñ 0O1l", 4, 8);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("build/break éñ 0O1l", 6, 12);
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

/** Skips anything falsy: a browser that doesn't expose a value simply leaves it out. */
type Maybe<T> = T | false | 0 | "" | null | undefined;
const list = (parts: Maybe<string>[]) => parts.filter(Boolean).join(", ");

function readNow(): BrowserFacts {
  const nav = navigator as Nav;
  const prefers = (query: string) => window.matchMedia(query).matches;
  const net = nav.connection;
  let referrer = "";
  try {
    referrer = document.referrer ? new URL(document.referrer).hostname : "";
  } catch {
    referrer = "";
  }
  return {
    browser: `${browserName(nav)} on ${platformName(nav)}`,
    screen: list([
      `${screen.width} by ${screen.height} pixels`,
      `window ${window.innerWidth} by ${window.innerHeight}`,
      window.devicePixelRatio !== 1 && `${Math.round(window.devicePixelRatio * 100) / 100}x density`,
      nav.maxTouchPoints > 0 && "touch",
    ]),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    localTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    languages: (nav.languages?.length ? nav.languages.slice(0, 4) : [nav.language]).join(", "),
    hardware: list([`${nav.hardwareConcurrency ?? "?"} CPU threads`, nav.deviceMemory && `about ${nav.deviceMemory} GB memory`]),
    graphics: graphicsCard(),
    connection: net
      ? list([
          net.effectiveType && `${net.effectiveType.toUpperCase()}-class`,
          net.downlink && `about ${net.downlink} Mbps down`,
          typeof net.rtt === "number" && net.rtt > 0 && `${net.rtt} ms round trip`,
          net.saveData && "data saver on",
        ])
      : "",
    preferences: list([
      prefers("(prefers-color-scheme: dark)") ? "dark theme" : "light theme",
      prefers("(prefers-reduced-motion: reduce)") && "reduced motion",
      nav.globalPrivacyControl && "Global Privacy Control on",
      nav.doNotTrack === "1" && "Do Not Track on",
    ]),
    referrer: referrer && referrer !== location.hostname ? referrer : "no referrer sent",
  };
}

/** The parts that take a moment: battery state, and a hash over everything stable. */
async function readLater(facts: BrowserFacts): Promise<Partial<BrowserFacts>> {
  const nav = navigator as Nav;
  let battery: string | undefined;
  try {
    const state = await nav.getBattery?.();
    if (state) battery = `${Math.round(state.level * 100)}%, ${state.charging ? "plugged in" : "on battery"}`;
  } catch {
    battery = undefined;
  }

  let fingerprint: string | undefined;
  try {
    const stable = [facts.browser, `${screen.width}x${screen.height}x${screen.colorDepth}`, facts.timeZone, facts.languages, facts.hardware, facts.graphics, canvasProbe()];
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stable.join("|")));
    fingerprint = Array.from(new Uint8Array(digest).slice(0, 6), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    fingerprint = undefined;
  }
  return { battery, fingerprint };
}

// A tiny external store: read once per page load, updated once when the async parts land.
let facts: BrowserFacts | null = null;
let started = false;
const listeners = new Set<() => void>();
const getSnapshot = () => (facts ??= readNow());
const getServerSnapshot = () => null;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    const current = getSnapshot();
    void readLater(current).then((later) => {
      facts = { ...current, ...later };
      for (const notify of listeners) notify();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

interface Row {
  label: string;
  value: string;
  mono?: boolean;
  /** Something a tester would stop and look at. */
  flag?: boolean;
}

function rowsFrom(visitor: Visitor, f: BrowserFacts | null): Row[] {
  const rows: Maybe<Row>[] = [
    visitor.ip && { label: "IP address", value: visitor.local ? `${visitor.ip} (this machine or your own network)` : visitor.ip, mono: true },
    visitor.place && { label: "Location", value: list([`near ${visitor.place}`, visitor.network]) },
    f &&
      visitor.timeZone &&
      f.timeZone &&
      visitor.timeZone !== f.timeZone && {
        label: "Mismatch",
        value: `your address is in ${visitor.timeZone}, your clock is set to ${f.timeZone}. A VPN, a proxy, or you're travelling.`,
        flag: true,
      },
  ];
  if (f) {
    rows.push(
      { label: "Browser", value: f.browser },
      { label: "Screen", value: f.screen },
      f.timeZone && { label: "Time zone", value: `${f.timeZone}, ${f.localTime} where you are` },
      { label: "Languages", value: f.languages },
      { label: "Hardware", value: f.hardware },
      f.graphics && { label: "Graphics", value: f.graphics },
      f.connection && { label: "Connection", value: f.connection },
      f.battery && { label: "Battery", value: f.battery },
      { label: "Preferences", value: f.preferences },
      { label: "Came from", value: f.referrer },
      f.fingerprint && { label: "Fingerprint", value: f.fingerprint, mono: true },
    );
  }
  return rows.filter((row): row is Row => Boolean(row));
}

export function Recon({ visitor }: { visitor: Visitor }) {
  const browserFacts = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const rows = rowsFrom(visitor, browserFacts);

  return (
    <div className="wide-pane">
      <div>
        <h3>What you just told me.</h3>
        <p className="mt-3 text-[0.9rem] leading-relaxed text-muted">
          Recon starts with what a target gives away for free. This is what you handed this page before you
          clicked anything. Any site you visit gets the same.
        </p>
        <p className="mt-3 text-[0.9rem] leading-relaxed text-muted">
          The last line is the point: put the rest together and it makes a fingerprint that can recognise your
          browser again without a single cookie.
        </p>
        <p className="other-side mt-5">
          Your address came with the request. Everything else was read in your browser. This site keeps none of
          it.
        </p>
      </div>
      <dl className="facts recon">
        {rows.map((row) => (
          <div key={row.label} className={row.flag ? "is-flagged" : undefined}>
            <dt>{row.label}</dt>
            <dd className={row.mono ? "font-mono text-[0.82rem]" : undefined}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
