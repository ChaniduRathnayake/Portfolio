"use client";

import { usePathname } from "next/navigation";
import { useSiteStore } from "@/lib/store";
import { FLAG_TOTAL } from "@/lib/ctf";
import { SCENES } from "@/lib/scenes";

/**
 * BUILD / BREAK switch. Active styling comes from html[data-mode] in CSS, so
 * it is correct on first paint (set by the pre-paint script) before React runs.
 */
export function ModeToggle() {
  const mode = useSiteStore((s) => s.mode);
  const setMode = useSiteStore((s) => s.setMode);
  return (
    <div role="group" aria-label="Site mode" className="mode-toggle">
      <button type="button" data-mode-option="build" aria-pressed={mode === "build"} onClick={() => setMode("build")}>
        Build
      </button>
      <button type="button" data-mode-option="break" aria-pressed={mode === "break"} onClick={() => setMode("break")}>
        Break
      </button>
    </div>
  );
}

export function TerminalButton() {
  const open = useSiteStore((s) => s.terminalOpen);
  const setOpen = useSiteStore((s) => s.setTerminalOpen);
  const flags = useSiteStore((s) => s.flags.length);
  return (
    <button
      type="button"
      className="ui-button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-keyshortcuts="`"
      aria-label={`Terminal, ${flags}/${FLAG_TOTAL} flags found. Shortcut: backtick.`}
      onClick={() => setOpen(true)}
    >
      <span aria-hidden="true" className="text-muted">
        &gt;_
      </span>
      <span aria-hidden="true" className="hidden md:inline">
        Terminal
      </span>
      <span aria-hidden="true" className="text-muted">
        {flags}/{FLAG_TOTAL}
      </span>
    </button>
  );
}

/**
 * Section links in the header (wide screens). On the home page the current
 * section is marked as you scroll; Lenis turns the hash links into smooth
 * scrolls. Elsewhere they link back to the home page sections.
 */
export function SectionNav() {
  const scene = useSiteStore((s) => s.scene);
  const onHome = usePathname() === "/";
  return (
    <nav aria-label="Sections" className="section-nav">
      <ol>
        {SCENES.map((s, i) => (
          <li key={s.id}>
            <a href={onHome ? `#${s.id}` : `/#${s.id}`} aria-current={onHome && i === scene ? "location" : undefined}>
              {s.nav}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
