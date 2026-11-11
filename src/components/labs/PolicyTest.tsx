"use client";

import { useRef, useState } from "react";

/**
 * This page attacks itself. Six things an injected script would try, run for
 * real against the Content-Security-Policy this page was served with. The
 * verdicts come from the browser's own `securitypolicyviolation` events, not
 * from a list of expected answers, so if the policy ever stops being enforced
 * this panel says so.
 *
 * The payloads are fixed and harmless (they set a variable, or point at a
 * .invalid host that cannot exist), and none of them takes visitor input.
 */

/** RFC 2606 reserves .invalid: it never resolves, so nothing leaves the browser even without a policy. */
const NOWHERE = "https://csp-test.invalid";

interface Attempt {
  name: string;
  what: string;
  /** Directives that should stop it. */
  directives: string[];
  /** Performs the attempt. Returns true if it can tell on its own that it got through. */
  run: () => boolean | void;
}

const ATTEMPTS: Attempt[] = [
  {
    name: "Inline event handler",
    what: 'an onclick="…" attribute, the classic XSS payload',
    directives: ["script-src-attr", "script-src"],
    run: () => {
      const probe = document.createElement("button");
      probe.setAttribute("onclick", "document.documentElement.dataset.cspLeak = 'handler'");
      probe.click();
      return document.documentElement.dataset.cspLeak === "handler";
    },
  },
  {
    name: "eval()",
    what: "turning a string into running code",
    directives: ["script-src"],
    run: () => {
      try {
        // The point of this line is to be refused by the policy.
        return new Function("return 1")() === 1;
      } catch {
        return false;
      }
    },
  },
  {
    name: "Inline style attribute",
    what: 'a style="…" attribute, used to restyle a page or leak data',
    directives: ["style-src-attr", "style-src"],
    run: () => {
      const probe = document.createElement("span");
      probe.setAttribute("style", "outline-width: 3px");
      return probe.style.outlineWidth === "3px";
    },
  },
  {
    name: "Request to another server",
    what: "sending what it found somewhere else",
    directives: ["connect-src"],
    run: () => {
      void fetch(`${NOWHERE}/collect`, { mode: "no-cors" }).catch(() => undefined);
    },
  },
  {
    name: "Image from another server",
    what: "a tracking pixel, or data smuggled out in a URL",
    directives: ["img-src"],
    run: () => {
      new Image().src = `${NOWHERE}/pixel.png`;
    },
  },
  {
    name: "Embedded frame",
    what: "loading someone else's page inside this one",
    directives: ["frame-src", "child-src"],
    run: () => {
      const frame = document.createElement("iframe");
      frame.hidden = true;
      frame.src = `${NOWHERE}/frame`;
      document.body.appendChild(frame);
      window.setTimeout(() => frame.remove(), 400);
    },
  },
];

/** `blockedBy` is the directive the browser named; `ran` is true if the attempt visibly succeeded. */
interface Verdict {
  blockedBy: string | null;
  ran: boolean;
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function PolicyTest() {
  const [verdicts, setVerdicts] = useState<(Verdict | null)[]>(() => ATTEMPTS.map(() => null));
  const [running, setRunning] = useState(false);
  const busy = useRef(false);

  const runAll = async () => {
    if (busy.current) return;
    busy.current = true;
    setRunning(true);
    setVerdicts(ATTEMPTS.map(() => null));
    delete document.documentElement.dataset.cspLeak;

    for (const [i, attempt] of ATTEMPTS.entries()) {
      let blockedBy: string | null = null;
      const onViolation = (event: SecurityPolicyViolationEvent) => {
        if (attempt.directives.includes(event.effectiveDirective)) blockedBy = event.effectiveDirective;
      };
      document.addEventListener("securitypolicyviolation", onViolation);
      const ran = attempt.run() === true;
      // Violation events are delivered as tasks, shortly after the attempt.
      await wait(260);
      document.removeEventListener("securitypolicyviolation", onViolation);
      const verdict: Verdict = { blockedBy, ran };
      setVerdicts((list) => list.map((v, j) => (j === i ? verdict : v)));
    }
    delete document.documentElement.dataset.cspLeak;
    busy.current = false;
    setRunning(false);
  };

  const done = verdicts.every((v) => v !== null);
  const blocked = verdicts.filter((v) => v?.blockedBy).length;

  return (
    <div className="wide-pane">
      <div>
        <h3>Now try to get past it.</h3>
        <p className="mt-3 text-[0.9rem] leading-relaxed text-muted">
          Six things an injected script would try, run for real against this page. The verdicts come from your
          browser, not from me.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <button type="button" className="btn-primary" onClick={runAll} disabled={running}>
            {running ? "Attacking…" : done ? "Run it again" : "Attack this page"}
          </button>
          {done && (
            <p className="policy-summary" role="status">
              {blocked} of {ATTEMPTS.length} blocked.
            </p>
          )}
        </div>
        {done && blocked < ATTEMPTS.length && (
          <p className="other-side mt-4">A development build relaxes the policy. The live site should block all six.</p>
        )}
        <p className="other-side mt-5">Each refusal also shows up in your browser&apos;s console, in its own words.</p>
      </div>
      <ol className="policy-test">
        {ATTEMPTS.map((attempt, i) => {
          const verdict = verdicts[i];
          return (
            <li key={attempt.name}>
              <span className="policy-name">{attempt.name}</span>
              <span className="policy-what">{attempt.what}</span>
              <span
                className={`policy-verdict ${verdict ? (verdict.blockedBy ? "is-blocked" : "is-open") : ""}`}
                aria-live="polite"
              >
                {!verdict
                  ? running
                    ? "…"
                    : "not run yet"
                  : verdict.blockedBy
                    ? `blocked by ${verdict.blockedBy}`
                    : verdict.ran
                      ? "got through"
                      : "no block reported"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
