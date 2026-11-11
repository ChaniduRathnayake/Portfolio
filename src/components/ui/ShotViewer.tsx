"use client";

import { useRef, useState } from "react";
import { CspImage } from "./CspImage";

export interface Shot {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption: string;
}

/**
 * Project screenshots: the main shot, optional thumbnails, and a full-size
 * viewer in a native <dialog> (focus trap, Esc and focus return built in).
 * Arrow keys move between shots.
 */
export function ShotViewer({ shots }: { shots: Shot[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [main, ...rest] = shots;
  const current = index === null ? null : shots[index];

  const open = (i: number) => {
    setIndex(i);
    dialogRef.current?.showModal();
  };
  const step = (by: number) => setIndex((i) => (i === null ? i : (i + by + shots.length) % shots.length));

  return (
    <>
      <button type="button" className="shot-open" onClick={() => open(0)} aria-label={`Enlarge: ${main.caption}`}>
        <CspImage
          src={main.src}
          alt={main.alt}
          width={main.width}
          height={main.height}
          sizes="(min-width: 1024px) 38rem, 100vw"
          className="h-auto w-full"
        />
        <span aria-hidden="true">Enlarge</span>
      </button>
      <figcaption>{main.caption}</figcaption>
      {rest.length > 0 && (
        <ul className="project-gallery" aria-label="More screens">
          {rest.map((shot, i) => (
            <li key={shot.src}>
              <button type="button" className="shot-open" onClick={() => open(i + 1)} aria-label={`Enlarge: ${shot.caption}`}>
                <CspImage src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} sizes="13rem" className="h-auto w-full" />
              </button>
              <span>{shot.caption}</span>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-label="Screenshot"
        onClose={() => setIndex(null)}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        onKeyDown={(e) => {
          if (shots.length < 2) return;
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        {current && (
          <div className="lightbox-frame" data-lenis-prevent>
            <CspImage
              key={current.src}
              src={current.src}
              alt={current.alt}
              width={current.width}
              height={current.height}
              sizes="100vw"
              className="h-auto max-h-[78vh] w-auto max-w-full"
            />
            <div className="lightbox-bar">
              <p>
                {current.caption}
                {shots.length > 1 && (
                  <span>
                    {" "}
                    · {(index ?? 0) + 1}/{shots.length}
                  </span>
                )}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                {shots.length > 1 && (
                  <>
                    <button type="button" className="ui-button" onClick={() => step(-1)} aria-label="Previous screenshot">
                      ←
                    </button>
                    <button type="button" className="ui-button" onClick={() => step(1)} aria-label="Next screenshot">
                      →
                    </button>
                  </>
                )}
                <button type="button" className="ui-button" onClick={() => dialogRef.current?.close()}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
