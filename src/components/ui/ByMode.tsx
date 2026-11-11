import type { ReactNode } from "react";

/**
 * Content that differs between the two sides of the site. Both versions are
 * in the HTML and CSS shows the one matching html[data-mode] (see .only-build
 * and .only-break in globals.css), so the right side is on screen from the
 * first paint, before any JavaScript, and nothing flashes on a repeat visit.
 * The hidden version is display:none, so assistive tech reads only one.
 */
export function ByMode({
  build,
  brk,
  as: Tag = "div",
  className,
}: {
  build: ReactNode;
  /** The BREAK side. ("break" is a reserved word.) */
  brk: ReactNode;
  as?: "div" | "span" | "p";
  className?: string;
}) {
  return (
    <>
      <Tag className={`only-build ${className ?? ""}`}>{build}</Tag>
      <Tag className={`only-break ${className ?? ""}`}>{brk}</Tag>
    </>
  );
}
