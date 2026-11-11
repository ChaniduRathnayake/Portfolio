"use client";

import type { ReactNode } from "react";
import { useSiteStore, type Mode } from "@/lib/store";

/**
 * The hero headline doubles as the mode switch. "I build secure networks."
 * is the BUILD side, "Then I try to break them." is the BREAK side: the
 * sentence for the side you're on is solid, the other is an outline you can
 * click. Which one is lit comes from html[data-mode] in CSS, so it is right
 * before hydration.
 */
export function HeroHeadline({ build, brk }: { build: string; brk: string }) {
  const mode = useSiteStore((s) => s.mode);
  const setMode = useSiteStore((s) => s.setMode);
  return (
    <h1 id="hero-title" className="hero-title">
      <button type="button" data-side="build" aria-pressed={mode === "build"} onClick={() => setMode("build")}>
        {build}
      </button>
      <button type="button" data-side="break" aria-pressed={mode === "break"} onClick={() => setMode("break")}>
        <em>{brk}</em>
      </button>
    </h1>
  );
}

/** An inline text button that flips the site to the other side. */
export function ModeLink({ to, children }: { to: Mode; children: ReactNode }) {
  const setMode = useSiteStore((s) => s.setMode);
  return (
    <button type="button" className="ui-link" onClick={() => setMode(to)}>
      {children}
    </button>
  );
}

/** Opens the terminal, optionally with a command already running. */
export function TerminalLaunch({
  command,
  className = "btn-primary",
  children,
}: {
  command?: string;
  className?: string;
  children: ReactNode;
}) {
  const openTerminal = useSiteStore((s) => s.openTerminal);
  return (
    <button type="button" className={className} aria-haspopup="dialog" onClick={() => openTerminal(command)}>
      {children}
    </button>
  );
}
