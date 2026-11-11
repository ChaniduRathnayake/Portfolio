"use client";

import { useEffect, useRef } from "react";
import { useSiteStore } from "@/lib/store";
import { telemetry } from "@/lib/telemetry";

/**
 * Makes the 3D monitor clickable. The canvas itself ignores the pointer (it
 * sits behind the page), so this is an invisible HTML button that follows the
 * CRT glass on screen: CrtScreen projects the glass into viewport fractions
 * every frame and this positions the button to match.
 *
 * A pointer convenience only. Keyboard and screen-reader users have the
 * Terminal button in the header, so this one stays out of the tab order.
 */
export function CrtHotspot() {
  const ref = useRef<HTMLButtonElement>(null);
  const openTerminal = useSiteStore((s) => s.openTerminal);
  const webgl = useSiteStore((s) => s.webgl);

  useEffect(() => {
    const el = ref.current;
    if (!el || webgl !== "yes") return;
    let frame = 0;
    let last = "";
    const follow = () => {
      frame = requestAnimationFrame(follow);
      const { x, y, w, h, visible } = telemetry.crt;
      const key = visible ? `${x.toFixed(3)} ${y.toFixed(3)} ${w.toFixed(3)} ${h.toFixed(3)}` : "";
      if (key === last) return;
      last = key;
      el.hidden = !visible;
      if (!visible) return;
      el.style.left = `${x * 100}%`;
      el.style.top = `${y * 100}%`;
      el.style.width = `${w * 100}%`;
      el.style.height = `${h * 100}%`;
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [webgl]);

  return (
    <button ref={ref} type="button" hidden tabIndex={-1} aria-hidden="true" className="crt-hotspot" onClick={() => openTerminal()}>
      <span>&gt;_ use this terminal</span>
    </button>
  );
}
