"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SCENE_COUNT } from "@/lib/scenes";
import { useSiteStore } from "@/lib/store";
import { telemetry } from "@/lib/telemetry";

/**
 * Maps scroll position to the camera timeline using the real sections.
 *
 * Every [data-scene] section's top is a scene boundary. Scroll between two
 * boundaries maps linearly onto one unit of timeline, so the 3D scene and the
 * HTML text describing it are always on screen together, whatever the
 * section heights or viewport size.
 *
 * Also runs the HTML choreography: the hero copy fades as the camera pushes
 * in, and each section's panel fades in as it arrives.
 */
export function SceneTimeline() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-scene]"));
    if (sections.length !== SCENE_COUNT) return;
    // Read directly: this effect can run before the store is hydrated.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let bounds: number[] = [];

    const update = (y: number) => {
      let i = 0;
      while (i < SCENE_COUNT - 1 && y >= bounds[i + 1]) i++;
      const span = Math.max(1, bounds[i + 1] - bounds[i]);
      const timeline = i + Math.min(1, Math.max(0, (y - bounds[i]) / span));
      telemetry.timeline = timeline;
      useSiteStore.getState().setScene(Math.min(SCENE_COUNT - 1, Math.floor(timeline)));
    };

    const measure = () => {
      bounds = sections.map((s) => s.offsetTop);
      bounds.push(Math.max(bounds[SCENE_COUNT - 1] + 1, ScrollTrigger.maxScroll(window)));
    };

    const tracker = ScrollTrigger.create({
      start: 0,
      end: "max",
      onRefresh: (self) => {
        measure();
        update(self.scroll());
      },
      onUpdate: (self) => update(self.scroll()),
    });

    const ctx = gsap.context(() => {
      const hero = document.querySelector<HTMLElement>("[data-hero-copy]");
      if (hero) {
        gsap.to(hero, {
          opacity: 0,
          y: reduced ? 0 : -28,
          ease: "none",
          scrollTrigger: { start: () => innerHeight * 0.45, end: () => innerHeight * 1.15, scrub: true },
        });
      }
      for (const panel of document.querySelectorAll<HTMLElement>("[data-panel]")) {
        gsap.fromTo(
          panel,
          { opacity: 0, y: reduced ? 0 : 36 },
          {
            opacity: 1,
            y: 0,
            ease: "none",
            scrollTrigger: { trigger: panel.parentElement, start: "top 55%", end: "top 5%", scrub: true },
          },
        );
      }
    });

    measure();
    update(window.scrollY);
    return () => {
      tracker.kill();
      ctx.revert();
    };
  }, []);

  return null;
}
