"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "./HeaderControls";
import { SCENES } from "@/lib/scenes";
import { useSiteStore } from "@/lib/store";
import { profile } from "@/content/profile";

/**
 * Phone navigation: a full-screen native <dialog> (focus trap, Esc, focus
 * return built in) with the sections, the mode switch and the terminal.
 */
export function MobileMenu() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const setTerminalOpen = useSiteStore((s) => s.setTerminalOpen);
  const onHome = usePathname() === "/";
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button type="button" className="ui-button xl:hidden" aria-haspopup="dialog" onClick={() => dialogRef.current?.showModal()}>
        Menu
      </button>
      <dialog ref={dialogRef} className="mobile-menu" aria-label="Menu">
        <div className="flex items-start justify-between">
          <p className="font-serif text-[1.15rem] text-text">{profile.name}</p>
          <button type="button" className="ui-button" onClick={close}>
            Close
          </button>
        </div>
        <nav aria-label="Sections" className="mt-10">
          <ol className="space-y-1">
            {SCENES.map((s, i) => (
              <li key={s.id}>
                <a href={onHome ? `#${s.id}` : `/#${s.id}`} onClick={close} className="mobile-menu-link">
                  <span className="font-mono text-[0.7rem] text-muted">{String(i + 1).padStart(2, "0")}</span>
                  {s.nav}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <ModeToggle />
          <button
            type="button"
            className="ui-button"
            onClick={() => {
              close();
              setTerminalOpen(true);
            }}
          >
            &gt;_ Terminal
          </button>
          <Link href="/security" className="ui-link" onClick={close}>
            How this site is hardened
          </Link>
        </div>
      </dialog>
    </>
  );
}
