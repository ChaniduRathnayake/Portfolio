"use client";

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useSiteStore } from "@/lib/store";

// three.js and the scenes load in their own chunk, after the HTML is on screen.
const Stage = dynamic(() => import("@/scenes/Stage"), { ssr: false });

/**
 * The 3D layer is decoration. If it throws (a lost WebGL context, a driver
 * that rejects a shader), drop it and keep the page: every word is HTML.
 */
class StageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    // Lets the boot screen and anything else waiting on the stage carry on without it.
    document.documentElement.dataset.webgl = "no";
    useSiteStore.setState({ webgl: "no" });
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Mounts the WebGL stage only when the browser supports WebGL2. */
export function StageLoader() {
  const webgl = useSiteStore((s) => s.webgl);
  if (webgl !== "yes") return null;
  return (
    <StageBoundary>
      <Stage />
    </StageBoundary>
  );
}
