"use client";

import { useId, useState } from "react";

/**
 * A working model of path traversal, playable on the page. A pretend file
 * server reads files out of /var/www/files/; the goal is to make it serve
 * /etc/passwd instead. Three stages, each with a filter that looks like a fix
 * and isn't. Everything is string handling in the browser: no requests.
 */

const WEB_ROOT = "/var/www/files/";
const TARGET = "/etc/passwd";

const FILES: Record<string, string[]> = {
  "/var/www/files/report.txt": ["Q3 uptime report", "nothing interesting in here."],
  "/var/www/files/notes.txt": ["uploads live in this folder.", "nothing outside it should ever be served."],
  [TARGET]: [
    "root:x:0:0:root:/root:/bin/bash",
    "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin",
    "deploy:x:1000:1000::/home/deploy:/bin/bash",
  ],
};

interface Stage {
  name: string;
  rule: string;
  /** One input that gets through, for visitors who want to see it work. */
  payload: string;
  /** Returns the cleaned input, or null to refuse the request. */
  filter: (input: string) => string | null;
}

const STAGES: Stage[] = [
  {
    name: "No filter",
    rule: "The server glues your input onto /var/www/files/ and reads whatever that points at.",
    payload: "../../../etc/passwd",
    filter: (input) => input,
  },
  {
    name: "Strips ../",
    rule: "Now it deletes every ../ from your input first. One pass, then it moves on.",
    payload: "....//....//....//etc/passwd",
    filter: (input) => input.replaceAll("../", ""),
  },
  {
    name: "Blocks ../",
    rule: "Now it refuses any input containing ../ and only afterwards URL-decodes it.",
    payload: "..%2f..%2f..%2fetc%2fpasswd",
    filter: (input) => {
      if (input.includes("../")) return null;
      try {
        return decodeURIComponent(input);
      } catch {
        return input;
      }
    },
  },
];

/** Collapses . and .. the way a filesystem does. */
function normalize(path: string): string {
  const stack: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return `/${stack.join("/")}`;
}

interface Response {
  status: string;
  ok: boolean;
  trace: [string, string][];
  body: string[];
  solved: boolean;
}

function serve(stage: Stage, input: string): Response {
  const cleaned = stage.filter(input);
  if (cleaned === null) {
    return { status: "403 Forbidden", ok: false, trace: [["filter", "found ../ and refused"]], body: ["blocked."], solved: false };
  }
  const path = normalize(WEB_ROOT + cleaned);
  const trace: [string, string][] = [
    ["after filter", cleaned || "(empty)"],
    ["server opens", path],
  ];
  const body = Object.hasOwn(FILES, path) ? FILES[path] : null;
  if (!body) return { status: "404 Not Found", ok: false, trace, body: ["no such file."], solved: false };
  return { status: "200 OK", ok: true, trace, body, solved: path === TARGET };
}

export function TraversalLab({ caption }: { caption: string }) {
  const inputId = useId();
  const [stageIndex, setStageIndex] = useState(0);
  const [input, setInput] = useState("report.txt");
  const [response, setResponse] = useState<Response | null>(null);
  const [solved, setSolved] = useState<boolean[]>([false, false, false]);
  const stage = STAGES[stageIndex];
  const solvedCount = solved.filter(Boolean).length;

  const send = (value: string) => {
    const result = serve(stage, value.trim().slice(0, 200));
    setResponse(result);
    if (result.solved) setSolved((done) => done.map((d, i) => d || i === stageIndex));
  };

  const pick = (index: number) => {
    setStageIndex(index);
    setInput("report.txt");
    setResponse(null);
  };

  return (
    <figure className="project-media lab">
      <div className="lab-stages" role="group" aria-label="Stage">
        {STAGES.map((s, i) => (
          <button key={s.name} type="button" aria-pressed={i === stageIndex} onClick={() => pick(i)}>
            <span aria-hidden="true">{solved[i] ? "■" : "□"}</span> {s.name}
            {solved[i] && <span className="sr-only"> (solved)</span>}
          </button>
        ))}
      </div>

      <div className="lab-body">
        <p className="lab-rule">
          {stage.rule} <span>Make it serve {TARGET}.</span>
        </p>
        <form
          className="lab-request"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <label htmlFor={inputId}>GET /view?file=</label>
          <input
            id={inputId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={200}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button type="submit" className="ui-button">
            Send
          </button>
        </form>

        <div className="lab-response" role="status" aria-live="polite">
          {response ? (
            <>
              {response.trace.map(([label, value]) => (
                <p key={label} className="lab-trace">
                  <span>{label}</span> {value}
                </p>
              ))}
              <p className={response.ok ? "lab-status" : "lab-status is-refused"}>HTTP/1.1 {response.status}</p>
              {response.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {response.solved && (
                <p className="lab-win">
                  That file was never meant to leave the server.{" "}
                  {solvedCount === STAGES.length ? "All three stages done." : "Try the next stage."}
                </p>
              )}
            </>
          ) : (
            <p className="lab-trace">Send the request to see what the server does with it.</p>
          )}
        </div>

        <p className="lab-foot">
          <button
            type="button"
            className="ui-link"
            onClick={() => {
              setInput(stage.payload);
              send(stage.payload);
            }}
          >
            Show me a payload that works
          </button>
          <span>
            {solvedCount}/{STAGES.length} solved
          </span>
        </p>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
