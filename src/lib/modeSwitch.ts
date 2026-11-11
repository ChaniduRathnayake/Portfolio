"use client";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { jumpTo } from "./scroll";

/**
 * BUILD and BREAK show different content, so flipping the mode changes how
 * tall each section is. This applies the flip to the document and keeps the
 * visitor at the same place in the same scene, which also keeps the camera
 * where it was (the timeline is "scene index + fraction through it").
 */

/** The scene under the top of the viewport, and how far through it we are. */
function currentAnchor(): { section: HTMLElement; fraction: number } | null {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-scene]"));
  if (!sections.length) return null;
  const y = window.scrollY;
  let section = sections[0];
  for (const candidate of sections) if (candidate.offsetTop <= y) section = candidate;
  return { section, fraction: (y - section.offsetTop) / Math.max(1, section.offsetHeight) };
}

function swap(mode: "build" | "break") {
  const anchor = currentAnchor();
  document.documentElement.dataset.mode = mode;
  if (anchor) jumpTo(anchor.section.offsetTop + anchor.fraction * anchor.section.offsetHeight);
  // Section offsets moved: re-measure the scroll timeline and the panel fades.
  ScrollTrigger.refresh();
}

/**
 * Flips the document to `mode`. With motion allowed and View Transitions
 * available, the new side is drawn over the old one in stepped rows, like a
 * terminal redrawing the screen (see "mode-redraw" in globals.css).
 */
export function applyMode(mode: "build" | "break", animate: boolean) {
  const root = document.documentElement;
  if (!animate || typeof document.startViewTransition !== "function") {
    swap(mode);
    return;
  }
  root.dataset.switching = "";
  const transition = document.startViewTransition(() => swap(mode));
  void transition.finished.finally(() => delete root.dataset.switching);
}
