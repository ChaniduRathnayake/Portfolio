"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSiteStore, type WebGLSupport } from "@/lib/store";
import { telemetry } from "@/lib/telemetry";
import { setLenis } from "@/lib/scroll";

gsap.registerPlugin(ScrollTrigger);

function detectWebGL(): WebGLSupport {
  try {
    const canvas = document.createElement("canvas");
    return canvas.getContext("webgl2") ? "yes" : "no";
  } catch {
    return "no";
  }
}

/**
 * Site-wide client setup: environment detection, Lenis smooth scroll driven
 * by GSAP's ticker (so ScrollTrigger and Lenis share one clock), pointer
 * tracking for the camera sway, and CTF flag 2.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const webgl = detectWebGL();
    document.documentElement.dataset.webgl = webgl;
    useSiteStore.getState().hydrate({ reducedMotion, webgl });

    // CTF flag 2 of 4.
    const css = getComputedStyle(document.documentElement);
    console.info(
      "%cbuild/break%c  you opened the console. good instinct.\nflag 2/4: FLAG{c0ns0l3_t3l3m3try_l34k_02}\nsubmit it in the terminal: press ` then type  submit FLAG{...}",
      `background:${css.getPropertyValue("--primary")};color:${css.getPropertyValue("--bg-void")};padding:2px 6px;font-weight:600`,
      "color:inherit",
    );

    const onPointer = (e: PointerEvent) => {
      telemetry.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      telemetry.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    // A press ripples the 3D layer where it landed (see fullFrameDither.ts).
    const onPress = (e: PointerEvent) => {
      telemetry.tap.x = e.clientX / window.innerWidth;
      telemetry.tap.y = 1 - e.clientY / window.innerHeight;
      telemetry.tap.at = performance.now() / 1000;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPress, { passive: true });
    const stopListening = () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPress);
    };

    // Reduced motion: native scrolling, no inertia.
    if (reducedMotion) return stopListening;

    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9, anchors: true });
    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      stopListening();
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return children;
}
