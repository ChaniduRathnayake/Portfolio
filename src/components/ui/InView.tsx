"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Marks its element once it scrolls into view, so CSS can play an entrance
 * (see [data-armed] / [data-inview] in globals.css).
 *
 * Safe by default: content is only hidden after this script has run and found
 * the element still below the screen. Without JavaScript, or if the element is
 * already on screen, nothing is ever hidden.
 */
export function InView({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Elements hidden with the other side of the site have no box yet: arm them too.
    const box = el.getBoundingClientRect();
    if (box.height > 0 && box.top < window.innerHeight * 0.85) return;

    el.dataset.armed = "";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.inview = "";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
