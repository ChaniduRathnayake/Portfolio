"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COMPLETABLE, completeArgs, runLine } from "./commands";
import { displayPath, homeOf } from "./filesystem";
import { accent, cmd, HOSTNAME, muted, USERS, type Line, type User } from "./types";
import { FLAG_TOTAL } from "@/lib/ctf";
import { useSiteStore } from "@/lib/store";
import { pauseScroll, scrollToId } from "@/lib/scroll";

interface Entry {
  id: number;
  /** Who and where the prompt showed when the command ran; absent for system messages. */
  prompt?: { user: User; cwd: string };
  cmd?: string;
  lines: Line[];
}

/** A question a running command is waiting on (a password, a PIN guess). */
interface Pending {
  label: string;
  secret: boolean;
}

const MOTD: Line[] = [
  [accent("build/break shell"), muted("  ·  everything on the site, from a prompt")],
  [muted("new here: "), cmd("help"), muted("   want a challenge: "), cmd("ctf")],
  [muted("esc closes. tab completes. up and down for history.")],
  "",
];

/** Commands offered as buttons on touch screens, where typing is slow. */
const QUICK = ["help", "ctf", "hint", "ls -la", "whoami"];

/** True for elements where a typed backtick belongs to the user, not to us. */
function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

function LineView({ line, onRun }: { line: Line; onRun: (command: string) => void }) {
  if (typeof line === "string") return <span>{line || " "}</span>;
  return (
    <span>
      {line.map((seg, i) =>
        seg.href ? (
          <a
            key={i}
            href={seg.href}
            className="term-link"
            {...(seg.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {seg.t}
          </a>
        ) : seg.run ? (
          <button key={i} type="button" className="term-run" onClick={() => onRun(seg.run!)}>
            {seg.t}
          </button>
        ) : (
          <span key={i} className={seg.tone ? `tone-${seg.tone}` : undefined}>
            {seg.t}
          </span>
        ),
      )}
    </span>
  );
}

function Prompt({ user, cwd }: { user: User; cwd: string }) {
  return (
    <span className="tone-accent">
      {USERS[user].name}@{HOSTNAME}
      <span className="tone-muted">:</span>
      {displayPath(cwd, user)}
      <span className="tone-muted">{user === "root" ? "#" : "$"}</span>{" "}
    </span>
  );
}

/**
 * Terminal mode. A command line over the site: everything a visitor can learn
 * by scrolling is reachable from here, plus the box (see ./box.ts). Native
 * <dialog> gives focus trapping, Esc to close and focus return for free.
 */
export function Terminal() {
  const router = useRouter();
  const open = useSiteStore((s) => s.terminalOpen);
  const setOpen = useSiteStore((s) => s.setTerminalOpen);
  const flagCount = useSiteStore((s) => s.flags.length);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const history = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  /** Resolves the question a command is waiting on. */
  const answer = useRef<((value: string | null) => void) | null>(null);
  const aborted = useRef(false);
  /** Appends lines to the command that is currently running. */
  const printToActive = useRef<((lines: Line[]) => void) | null>(null);

  const [entries, setEntries] = useState<Entry[]>([{ id: 0, lines: MOTD }]);
  const [user, setUser] = useState<User>("guest");
  const [cwd, setCwd] = useState(homeOf("guest"));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  const close = useCallback(() => setOpen(false), [setOpen]);

  const run = useCallback(
    async (raw: string) => {
      const line = raw.trim();
      const id = nextId.current++;
      const prompt = { user, cwd };
      if (line) {
        history.current.push(line);
        historyIndex.current = -1;
      }
      if (line === "clear") {
        setEntries([]);
        return;
      }
      setEntries((list) => [...list, { id, prompt, cmd: line, lines: [] }]);
      if (!line) return;

      const print = (lines: Line[]) =>
        setEntries((list) => list.map((entry) => (entry.id === id ? { ...entry, lines: [...entry.lines, ...lines] } : entry)));

      aborted.current = false;
      printToActive.current = print;
      setBusy(true);
      try {
        const lines = await runLine(line, {
          user,
          cwd,
          history: history.current,
          setCwd,
          setUser,
          print,
          ask: (label, secret = false) =>
            new Promise<string | null>((resolve) => {
              answer.current = resolve;
              setPending({ label, secret });
            }),
          aborted: () => aborted.current,
          clear: () => setEntries([]),
          close,
          goto: (sceneId) => {
            close();
            if (document.getElementById(sceneId)) window.setTimeout(() => scrollToId(sceneId), 60);
            else router.push(`/#${sceneId}`);
          },
        });
        print(lines);
      } catch {
        print([[{ t: "bb-sh: that command fell over. try another.", tone: "alert" }]]);
      } finally {
        setBusy(false);
        setPending(null);
        answer.current = null;
        printToActive.current = null;
      }
    },
    [user, cwd, close, router],
  );

  // Global hotkey: backtick toggles, unless the user is typing somewhere else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "`" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditable(e.target) && e.target !== inputRef.current) return;
      if (e.target === inputRef.current && inputRef.current?.value) return;
      e.preventDefault();
      setOpen(!useSiteStore.getState().terminalOpen);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  // Sync the dialog with the store and pause page scrolling while open.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    pauseScroll(open);
  }, [open]);

  // A button elsewhere on the page can open the terminal with a command to run.
  useEffect(() => {
    if (!open || busy) return;
    // A beat after the dialog opens, so the command is seen being run.
    const id = window.setTimeout(() => {
      const queued = useSiteStore.getState().takeTerminalCommand();
      if (queued) void run(queued);
    }, 140);
    return () => window.clearTimeout(id);
  }, [open, busy, run]);

  // Phones: keep the window inside the part of the screen the keyboard leaves visible.
  useEffect(() => {
    const viewport = window.visualViewport;
    const dialog = dialogRef.current;
    if (!open || !viewport || !dialog) return;
    const fit = () => dialog.style.setProperty("--visible-height", `${Math.round(viewport.height)}px`);
    fit();
    viewport.addEventListener("resize", fit);
    return () => viewport.removeEventListener("resize", fit);
  }, [open]);

  useEffect(() => {
    const out = outputRef.current;
    if (out) out.scrollTop = out.scrollHeight;
  }, [entries, pending]);

  const submit = (value: string) => {
    setInput("");
    if (pending) {
      // The typed answer is echoed under the running command, unless it was a password.
      printToActive.current?.([[muted(pending.label), { t: pending.secret ? "" : value }]]);
      setPending(null);
      answer.current?.(value);
      return;
    }
    if (!busy) void run(value);
  };

  const interrupt = () => {
    if (pending) {
      setPending(null);
      answer.current?.(null);
    } else if (busy) {
      aborted.current = true;
    } else {
      const id = nextId.current++;
      setEntries((list) => [...list, { id, prompt: { user, cwd }, cmd: `${input}^C`, lines: [] }]);
    }
    setInput("");
  };

  const complete = () => {
    if (pending) return;
    const tokens = input.split(" ");
    const current = tokens[tokens.length - 1];
    const pool = tokens.length === 1 ? COMPLETABLE : completeArgs(tokens[0], current, cwd, user);
    const matches = pool.filter((option) => option.startsWith(current));
    if (matches.length === 1) {
      tokens[tokens.length - 1] = matches[0];
      setInput(tokens.join(" ") + (matches[0].endsWith("/") ? "" : " "));
    } else if (matches.length > 1) {
      const id = nextId.current++;
      setEntries((list) => [...list, { id, prompt: { user, cwd }, cmd: input, lines: [matches.join("  ")] }]);
    }
  };

  const recall = (direction: -1 | 1) => {
    const list = history.current;
    if (!list.length || pending) return;
    const from = historyIndex.current === -1 ? list.length : historyIndex.current;
    const i = Math.max(0, from + direction);
    historyIndex.current = i >= list.length ? -1 : i;
    setInput(i >= list.length ? "" : list[i]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit(input);
    } else if (e.key === "Tab") {
      e.preventDefault();
      complete();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      recall(e.key === "ArrowUp" ? -1 : 1);
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      if (!busy) setEntries([]);
    } else if (e.key === "c" && e.ctrlKey && !window.getSelection()?.toString()) {
      e.preventDefault();
      interrupt();
    }
  };

  /** Runs a command from a click or tap, as if it had been typed. */
  const runFromClick = (command: string) => {
    if (busy || pending) return;
    void run(command);
    inputRef.current?.focus();
  };

  /** Touch keys act, then hand focus back to the prompt so the keyboard stays up. */
  const press = (action: () => void) => {
    action();
    inputRef.current?.focus();
  };

  return (
    <dialog
      ref={dialogRef}
      className="terminal"
      aria-label="Terminal"
      onClose={close}
      onClick={(e) => {
        // Click on the dimmed backdrop (the dialog itself, outside the window) closes.
        if (e.target === dialogRef.current) close();
      }}
    >
      <div
        className="terminal-window"
        onClick={(e) => {
          // Clicking empty space focuses the prompt, without stealing a text selection.
          if (!(e.target instanceof HTMLElement && e.target.closest("a, button")) && !window.getSelection()?.toString()) {
            inputRef.current?.focus();
          }
        }}
      >
        <div className="terminal-bar">
          <span className="truncate">
            {USERS[user].name}@{HOSTNAME}: {displayPath(cwd, user)}
          </span>
          <span className="flex shrink-0 items-center gap-4">
            <span>
              flags {flagCount}/{FLAG_TOTAL}
            </span>
            <button type="button" className="terminal-close" onClick={close}>
              Close
            </button>
          </span>
        </div>
        <div ref={outputRef} className="terminal-output" role="log" aria-live="polite" data-lenis-prevent>
          {entries.map((entry) => (
            <Fragment key={entry.id}>
              {/* One <div> per line: copying from the log gives single line breaks. */}
              {entry.prompt && (
                <div>
                  <Prompt {...entry.prompt} />
                  <span>{entry.cmd}</span>
                </div>
              )}
              {entry.lines.map((line, i) => (
                <div key={i}>
                  <LineView line={line} onRun={runFromClick} />
                </div>
              ))}
            </Fragment>
          ))}
        </div>
        <div className="terminal-keys">
          <button type="button" aria-label="Complete" onClick={() => press(complete)}>
            tab
          </button>
          <button type="button" aria-label="Previous command" onClick={() => press(() => recall(-1))}>
            ↑
          </button>
          <button type="button" aria-label="Next command" onClick={() => press(() => recall(1))}>
            ↓
          </button>
          <button type="button" aria-label="Cancel" onClick={() => press(interrupt)}>
            ^C
          </button>
          {QUICK.map((command) => (
            <button key={command} type="button" onClick={() => runFromClick(command)}>
              {command}
            </button>
          ))}
        </div>
        <div className="terminal-input-row">
          <label htmlFor="terminal-input">
            {pending ? <span className="tone-muted">{pending.label}</span> : <Prompt user={user} cwd={cwd} />}
          </label>
          <input
            ref={inputRef}
            id="terminal-input"
            className={pending?.secret ? "is-secret" : undefined}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            aria-busy={busy}
          />
        </div>
      </div>
    </dialog>
  );
}
