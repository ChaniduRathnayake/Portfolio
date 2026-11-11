"use client";

import { useSyncExternalStore } from "react";

/**
 * What a visitor's browser hands over before they've clicked anything: the
 * first step of any recon, pointed back at the reader. Everything here is read
 * in the browser from standard APIs and shown on the page. Nothing is stored
 * or sent anywhere.
 */

type Row = [label: string, value: string];

interface NavigatorExtras {
  userAgentData?: { platform?: string; brands?: { brand: string; version: string }[] };
  deviceMemory?: number;
  globalPrivacyControl?: boolean;
}

function browserName(nav: Navigator & NavigatorExtras): string {
  const brand = nav.userAgentData?.brands?.find((b) => !/not.?a.?brand|chromium/i.test(b.brand));
  if (brand) return `${brand.brand} ${brand.version}`;
  const ua = nav.userAgent;
  const match = /(Firefox|Edg|OPR|Chrome|Version)\/(\d+)/.exec(ua);
  if (!match) return "not saying";
  const names: Record<string, string> = { Edg: "Edge", OPR: "Opera", Version: "Safari" };
  return `${names[match[1]] ?? match[1]} ${match[2]}`;
}

function platformName(nav: Navigator & NavigatorExtras): string {
  if (nav.userAgentData?.platform) return nav.userAgentData.platform;
  const ua = nav.userAgent;
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad/.test(ua)) return "iOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "not saying";
}

function collect(): Row[] {
  const nav = navigator as Navigator & NavigatorExtras;
  const prefers = (query: string) => window.matchMedia(query).matches;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const referrer = (() => {
    try {
      return document.referrer ? new URL(document.referrer).hostname : "";
    } catch {
      return "";
    }
  })();
  return [
    ["Browser", `${browserName(nav)} on ${platformName(nav)}`],
    [
      "Screen",
      [
        `${screen.width} by ${screen.height} pixels`,
        window.devicePixelRatio !== 1 ? `${Math.round(window.devicePixelRatio * 100) / 100}x density` : "",
        nav.maxTouchPoints > 0 ? "touch" : "",
      ]
        .filter(Boolean)
        .join(", "),
    ],
    ["Time zone", zone || "not saying"],
    ["Languages", (nav.languages?.length ? nav.languages.slice(0, 4) : [nav.language]).join(", ")],
    ["Hardware", [`${nav.hardwareConcurrency ?? "?"} CPU threads`, nav.deviceMemory ? `about ${nav.deviceMemory} GB memory` : ""].filter(Boolean).join(", ")],
    [
      "Preferences",
      [
        prefers("(prefers-color-scheme: dark)") ? "dark theme" : "light theme",
        prefers("(prefers-reduced-motion: reduce)") ? "reduced motion" : "",
        nav.globalPrivacyControl ? "Global Privacy Control on" : "",
        nav.doNotTrack === "1" ? "Do Not Track on" : "",
      ]
        .filter(Boolean)
        .join(", "),
    ],
    ["Came from", referrer && referrer !== location.hostname ? referrer : "no referrer sent"],
  ];
}

// Read once per page load and reused, so the snapshot is stable between renders.
let cached: Row[] | null = null;
const getSnapshot = () => (cached ??= collect());
const getServerSnapshot = () => null;
const subscribe = () => () => undefined;

export function Recon() {
  const rows = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="wide-pane">
      <div>
        <h3>What you just told me.</h3>
        <p className="mt-3 text-[0.9rem] leading-relaxed text-muted">
          Recon starts with what a target gives away for free. This is what your browser handed this page before
          you clicked anything. Any site you visit can read the same.
        </p>
        <p className="other-side mt-5">Read in your browser and shown here. Not stored, not sent anywhere.</p>
      </div>
      <dl className="facts recon">
        {(rows ?? []).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
