"use client";

import { useId, useMemo, useState } from "react";
import { FeistelDiagram } from "@/components/ui/ProjectDiagram";
import { desTrace, eightBytes } from "@/lib/des";

/**
 * DES, one round at a time. Type a message and a key; the cipher runs in the
 * browser (src/lib/des.ts, checked against the published test vectors) and
 * the diagram shows the real values going through whichever round is picked.
 */
export function DesLab({ caption }: { caption: string }) {
  const id = useId();
  const [message, setMessage] = useState("8 bytes!");
  const [key, setKey] = useState("56 bits!");
  const [n, setN] = useState(1);
  const trace = useMemo(() => desTrace(eightBytes(message), eightBytes(key)), [message, key]);
  const round = trace.rounds[n - 1];

  return (
    <figure className="project-media lab">
      <FeistelDiagram label={`DES round ${n} of 16, with the values for this message and key`} round={round} />
      <div className="lab-body">
        <div className="des-inputs">
          <div>
            <label htmlFor={`${id}-message`}>Message, 8 characters</label>
            <input
              id={`${id}-message`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={8}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label htmlFor={`${id}-key`}>Key, 8 characters</label>
            <input
              id={`${id}-key`}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              maxLength={8}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        </div>

        <label htmlFor={`${id}-round`} className="des-round">
          <span>Round {n} of 16</span>
          <input
            id={`${id}-round`}
            className="lab-range"
            type="range"
            min={1}
            max={16}
            step={1}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
          />
        </label>

        <dl className="des-out" aria-live="polite">
          <div>
            <dt>Block in</dt>
            <dd>{trace.block}</dd>
          </div>
          <div>
            <dt>Ciphertext</dt>
            <dd className="text-accent">{trace.cipher}</dd>
          </div>
        </dl>
        <p className="lab-rule mt-4">
          Change one character and drag through the rounds to see how fast the difference spreads.{" "}
          <span>The key is only 56 bits. In 1998 a purpose-built machine found one in 56 hours.</span>
        </p>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
