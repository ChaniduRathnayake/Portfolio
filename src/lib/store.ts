"use client";

import { create } from "zustand";
import { applyMode } from "./modeSwitch";
import { telemetry } from "./telemetry";

export type Mode = "build" | "break";
export type Palette = "phosphor" | "amber" | "thermal";
export type WebGLSupport = "unknown" | "yes" | "no";

export const PALETTES: Palette[] = ["phosphor", "amber", "thermal"];

/** localStorage keys. The inline script in layout.tsx reads the same keys before first paint. */
export const STORAGE_KEYS = { mode: "bb:mode", palette: "bb:palette", flags: "bb:flags" } as const;

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the choice just won't survive a reload.
  }
}

interface SiteState {
  mode: Mode;
  palette: Palette;
  /** Index into SCENES of the scene currently on screen. */
  scene: number;
  booted: boolean;
  stageReady: boolean;
  terminalOpen: boolean;
  /** A command for the terminal to run as soon as it opens (e.g. from a "Root the box" button). */
  terminalCommand: string | null;
  /** SHA-256 hashes of the flags found so far. */
  flags: string[];
  reducedMotion: boolean;
  webgl: WebGLSupport;

  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  setPalette: (palette: Palette) => void;
  setScene: (scene: number) => void;
  markBooted: () => void;
  markStageReady: () => void;
  setTerminalOpen: (open: boolean) => void;
  /** Opens the terminal, optionally running a command once it is up. */
  openTerminal: (command?: string) => void;
  takeTerminalCommand: () => string | null;
  addFlag: (hash: string) => void;
  /** Syncs state with what the pre-paint script and the browser already know. */
  hydrate: (env: { reducedMotion: boolean; webgl: WebGLSupport }) => void;
}

export const useSiteStore = create<SiteState>((set, get) => ({
  mode: "build",
  palette: "phosphor",
  scene: 0,
  booted: false,
  stageReady: false,
  terminalOpen: false,
  terminalCommand: null,
  flags: [],
  reducedMotion: false,
  webgl: "unknown",

  setMode: (mode) => {
    if (mode === get().mode) return;
    applyMode(mode, !get().reducedMotion);
    telemetry.modePulse = 1;
    persist(STORAGE_KEYS.mode, mode);
    set({ mode });
  },

  toggleMode: () => get().setMode(get().mode === "build" ? "break" : "build"),

  setPalette: (palette) => {
    document.documentElement.dataset.palette = palette;
    persist(STORAGE_KEYS.palette, palette);
    set({ palette });
  },

  setScene: (scene) => {
    if (scene !== get().scene) set({ scene });
  },

  markBooted: () => {
    if (get().booted) return;
    try {
      sessionStorage.setItem("bb:booted", "1");
    } catch {
      // Boot will simply replay next time.
    }
    set({ booted: true });
  },

  markStageReady: () => set({ stageReady: true }),

  setTerminalOpen: (terminalOpen) => set({ terminalOpen }),

  openTerminal: (command) => set({ terminalOpen: true, terminalCommand: command ?? null }),

  takeTerminalCommand: () => {
    const command = get().terminalCommand;
    if (command) set({ terminalCommand: null });
    return command;
  },

  addFlag: (hash) => {
    const flags = get().flags;
    if (flags.includes(hash)) return;
    const next = [...flags, hash];
    persist(STORAGE_KEYS.flags, JSON.stringify(next));
    set({ flags: next });
  },

  hydrate: ({ reducedMotion, webgl }) => {
    const root = document.documentElement.dataset;
    const mode: Mode = root.mode === "break" ? "break" : "build";
    const palette = PALETTES.includes(root.palette as Palette) ? (root.palette as Palette) : "phosphor";

    let flags: string[] = [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEYS.flags) ?? "[]");
      if (Array.isArray(parsed)) flags = parsed.filter((f): f is string => typeof f === "string");
    } catch {
      // Corrupt or blocked storage: start with zero flags.
    }

    telemetry.modeBlend = mode === "break" ? 1 : 0;
    set({ mode, palette, flags, reducedMotion, webgl, booted: get().booted || "booted" in root || reducedMotion });
  },
}));
