"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useSiteStore, type Palette } from "./store";

/**
 * Bridges the CSS design tokens into three.js. globals.css stays the single
 * source of truth for colour: WebGL materials read the same custom properties
 * the HTML uses, so swapping a palette there changes both.
 */
export interface ThemeColors {
  void: THREE.Color;
  surface: THREE.Color;
  primary: THREE.Color;
  dim: THREE.Color;
  text: THREE.Color;
  alert: THREE.Color;
}

const TOKENS: Record<keyof ThemeColors, string> = {
  void: "--bg-void",
  surface: "--bg-surface",
  primary: "--primary",
  dim: "--dim",
  text: "--text-main",
  alert: "--alert",
};

/** Reads a palette's tokens from a hidden probe element carrying that data-palette. */
export function readThemeColors(palette: Palette): ThemeColors {
  const probe = document.createElement("div");
  probe.hidden = true;
  probe.dataset.palette = palette;
  document.body.appendChild(probe);
  const styles = getComputedStyle(probe);
  const entries = Object.entries(TOKENS).map(([key, token]) => [
    key,
    new THREE.Color(styles.getPropertyValue(token).trim() || "#000000"),
  ]);
  probe.remove();
  return Object.fromEntries(entries) as ThemeColors;
}

/** Theme colours for WebGL, recomputed when the palette changes. */
export function useThemeColors(): ThemeColors {
  const palette = useSiteStore((s) => s.palette);
  return useMemo(() => readThemeColors(palette), [palette]);
}

/** Writes the current accent (primary → alert as BREAK blends in) into `out`. */
export function accentAt(theme: ThemeColors, breakBlend: number, out: THREE.Color): THREE.Color {
  return out.copy(theme.primary).lerp(theme.alert, breakBlend);
}
