"use client";

import type Lenis from "lenis";

/**
 * Access to the page's Lenis instance for code outside the provider
 * (the terminal pauses scrolling and jumps to sections).
 */
let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
}

/** Smooth-scrolls to an element id; falls back to native scrolling when Lenis is off. */
export function scrollToId(id: string, immediate = false) {
  const target = document.getElementById(id);
  if (!target) return;
  if (instance) instance.scrollTo(target, { immediate, duration: 2.4 });
  else target.scrollIntoView({ behavior: immediate ? "auto" : "smooth" });
}

/** Moves to a scroll position at once, even while smooth scrolling is paused. */
export function jumpTo(y: number) {
  if (instance) instance.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
}

export function pauseScroll(paused: boolean) {
  if (!instance) return;
  if (paused) instance.stop();
  else instance.start();
}
