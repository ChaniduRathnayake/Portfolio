"use client";

import { FLAG_HASHES, flagsIn, type FlagTrack } from "@/lib/ctf";
import { useSiteStore } from "@/lib/store";

const TRACKS: { track: FlagTrack; title: string; about: string }[] = [
  { track: "site", title: "Around the site", about: "Page source, the console, the response headers, and somewhere in the 3D room." },
  { track: "box", title: "The box", about: "A small Linux box in the terminal. You start as guest. Finish by reading /root/root.txt." },
];

/** Invitation to the site's own CTF, with live progress for both tracks. */
export function CtfInvite() {
  const found = useSiteStore((s) => s.flags);
  const openTerminal = useSiteStore((s) => s.openTerminal);

  return (
    <div>
      <h3>Break this site.</h3>
      <p className="mt-3 text-[0.9rem] leading-relaxed text-muted">
        Eight flags are hidden here. Finding them takes the same habits a real test does: read everything, trust
        nothing that calls itself encrypted, and ask what you&apos;re allowed to run.
      </p>
      <dl className="flag-board mt-6">
        {TRACKS.map(({ track, title, about }) => {
          const hashes = flagsIn(track);
          const got = hashes.filter((h) => found.includes(h)).length;
          return (
            <div key={track}>
              <dt>
                {title}
                <span className="flag-count">
                  {got}/{hashes.length}
                </span>
              </dt>
              <dd>
                <span className="flag-squares" role="img" aria-label={`${got} of ${hashes.length} found`}>
                  {hashes.map((hash) => (
                    <span
                      key={hash}
                      className={found.includes(hash) ? "is-found" : undefined}
                      title={found.includes(hash) ? FLAG_HASHES[hash].where : "not found yet"}
                    />
                  ))}
                </span>
                <span className="mt-2 block text-[0.85rem] leading-relaxed text-muted">{about}</span>
              </dd>
            </div>
          );
        })}
      </dl>
      <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="button" className="btn-primary" aria-haspopup="dialog" onClick={() => openTerminal("ctf")}>
          Root the box
        </button>
        <span className="font-mono text-[0.66rem] text-muted">
          or press <kbd className="text-text">`</kbd> anywhere
        </span>
      </div>
    </div>
  );
}
