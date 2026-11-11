"use client";

import { useEffect, useState } from "react";
import { useSiteStore } from "@/lib/store";
import { telemetry } from "@/lib/telemetry";

const LINES = [
  "build/break v1.0 — booting",
  "checking memory ................ ok",
  "mounting /dev/crt0 ............. ok",
  "loading shaders: bayer 8x8 ..... ok",
  "headers: csp nonce, hsts ....... ok",
  "starting session as guest",
];

const MIN_MS = 1100;
const MAX_MS = 1800;

/**
 * Scene 0. Server-rendered, so it covers the page from the first paint.
 * Lines appear with pure CSS; JS dismisses it once the 3D stage is ready
 * (never later than 1.8 s). If JS never runs, a CSS animation removes it
 * anyway. Skipped on repeat visits within a session and for reduced motion.
 * Decorative, so hidden from assistive tech; any key or click skips it.
 */
export function BootSequence() {
  const booted = useSiteStore((s) => s.booted);
  const stageReady = useSiteStore((s) => s.stageReady);
  const webgl = useSiteStore((s) => s.webgl);
  const markBooted = useSiteStore((s) => s.markBooted);
  const [gone, setGone] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);

  // Dismiss: the class fades it out, then it is removed from the DOM.
  useEffect(() => {
    if (!booted) return;
    const id = window.setTimeout(() => setGone(true), 500);
    return () => window.clearTimeout(id);
  }, [booted]);

  // The CRT powers on as the boot screen leaves (or right away if it was skipped).
  useEffect(() => {
    if (booted && stageReady && telemetry.poweredAt < 0) telemetry.poweredAt = performance.now() / 1000 + 0.15;
  }, [booted, stageReady]);

  useEffect(() => {
    if (booted) return;
    // performance.now() counts from navigation start, so the 1.8 s cap is from page load.
    const elapsed = performance.now();
    const minTimer = window.setTimeout(() => setMinElapsed(true), Math.max(0, MIN_MS - elapsed));
    const maxTimer = window.setTimeout(markBooted, Math.max(0, MAX_MS - elapsed));
    const skip = () => markBooted();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [booted, markBooted]);

  // Leave as soon as the stage is ready (or there will be no stage).
  useEffect(() => {
    if (minElapsed && (stageReady || webgl === "no")) markBooted();
  }, [minElapsed, stageReady, webgl, markBooted]);

  if (gone) return null;

  return (
    <div aria-hidden="true" className={`boot ${booted ? "is-leaving" : ""}`}>
      <div className="boot-lines">
        {LINES.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <p className="boot-hint">press any key to skip</p>
    </div>
  );
}
