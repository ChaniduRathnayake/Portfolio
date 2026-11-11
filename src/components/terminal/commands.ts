import { allSkills, education, experience, profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { checkFlag, findFlags, FLAG_HASHES, FLAG_TOTAL, flagsIn, sha256Hex } from "@/lib/ctf";
import { SCENES } from "@/lib/scenes";
import { PALETTES, useSiteStore, type Palette } from "@/lib/store";
import { BOX_HINTS, OWNER_HASH, session, SITE_HINTS, SUDO_RULE, WORDLIST_PATH } from "./box";
import {
  canRead,
  contactLines,
  displayPath,
  findFile,
  homeOf,
  lookup,
  projectLines,
  resolvePath,
  walk,
} from "./filesystem";
import {
  accent,
  alert,
  cmd,
  err,
  HOSTNAME,
  lineText,
  linesText,
  muted,
  USERS,
  type FsNode,
  type Line,
  type Segment,
  type User,
} from "./types";

/** What a command can see and do. The Terminal component provides it. */
export interface ShellContext {
  user: User;
  cwd: string;
  /** Output of the previous command in a pipe, or null. */
  stdin: string | null;
  history: string[];
  setCwd: (path: string) => void;
  setUser: (user: User) => void;
  /** Shows lines right away, before the command returns. */
  print: (lines: Line[]) => void;
  /** Asks for a line of input. Resolves null if the visitor presses Ctrl+C. */
  ask: (label: string, secret?: boolean) => Promise<string | null>;
  /** True once Ctrl+C was pressed while this command was running. */
  aborted: () => boolean;
  clear: () => void;
  close: () => void;
  goto: (sceneId: string) => void;
}

type Result = Line[] | Promise<Line[]>;
type Command = { run: (args: string[], ctx: ShellContext) => Result };

const SCENE_IDS: string[] = SCENES.map((s) => s.id);
const OWNER = USERS.owner.name;
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/** Short deterministic "commit hash" from a string. */
function shortHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7);
}

const denied = (what: string, path: string) => err(`${what}: ${path}: Permission denied`);
const missing = (what: string, path: string) => err(`${what}: ${path}: No such file or directory`);

/** Reads a file's text as the current user, or returns the error lines to print. */
function readFile(what: string, name: string, ctx: ShellContext, as: User = ctx.user): { text: string; lines: Line[] } | { error: Line[] } {
  const { result } = findFile(ctx.cwd, name, as);
  if ("error" in result) return { error: result.error === "denied" ? denied(what, name) : missing(what, name) };
  if (result.node.type === "dir") return { error: err(`${what}: ${name}: Is a directory`) };
  const lines = result.node.read();
  return { text: linesText(lines), lines };
}

/** Text for a filter command: its file argument if there is one, otherwise the pipe. */
function inputText(what: string, operands: string[], ctx: ShellContext): { text: string } | { error: Line[] } {
  if (operands.length === 1) {
    const found = findFile(ctx.cwd, operands[0], ctx.user).result;
    if ("node" in found || found.error === "denied") {
      const read = readFile(what, operands[0], ctx);
      return "error" in read ? read : { text: read.text };
    }
  }
  if (operands.length) return { text: operands.join(" ") };
  if (ctx.stdin !== null) return { text: ctx.stdin };
  return { error: err(`${what}: nothing to read. give it text, a file, or pipe something in.`) };
}

const perms = (node: FsNode) => (node.type === "dir" ? "d" : "-") + (node.open ? (node.type === "dir" ? "rwxr-xr-x" : "rw-r--r--") : node.type === "dir" ? "rwx------" : "rw-------");

function listDir(node: Extract<FsNode, { type: "dir" }>, all: boolean, long: boolean): Line[] {
  const names = Object.keys(node.children)
    .filter((n) => all || !n.startsWith("."))
    .sort();
  if (!names.length && !all) return [];
  const label = (n: string): Segment => (node.children[n].type === "dir" ? accent(`${n}/`) : { t: n });
  if (long) {
    return names.map((n): Line => {
      const child = node.children[n];
      return [muted(`${perms(child)}  ${USERS[child.owner].name.padEnd(8)} `), label(n)];
    });
  }
  return [names.flatMap((n): Segment[] => [label(n), { t: "  " }])];
}

function tree(node: FsNode, user: User, prefix = ""): Line[] {
  if (node.type !== "dir" || !canRead(node, user)) return [];
  const names = Object.keys(node.children).filter((n) => !n.startsWith(".")).sort();
  return names.flatMap((name, i) => {
    const last = i === names.length - 1;
    const child = node.children[name];
    const label = child.type === "dir" ? accent(`${name}/`) : { t: name };
    return [[muted(`${prefix}${last ? "└── " : "├── "}`), label] as Line, ...tree(child, user, `${prefix}${last ? "    " : "│   "}`)];
  });
}

/** Shell-style * and ? turned into an anchored regular expression. */
function globToRegExp(glob: string): RegExp {
  const pattern = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${pattern}$`);
}

/** Flags found and still to find, as a scoreboard. */
function scoreboard(): Line[] {
  const found = useSiteStore.getState().flags;
  const row = (hash: string, n: number): Line =>
    found.includes(hash)
      ? [accent("  [x] "), { t: `${n}. ${FLAG_HASHES[hash].where}` }]
      : [muted(`  [ ] ${n}. ${FLAG_HASHES[hash].track === "box" ? FLAG_HASHES[hash].where : "????????"}`)];
  const site = flagsIn("site");
  const box = flagsIn("box");
  const count = (hashes: string[]) => hashes.filter((h) => found.includes(h)).length;
  return [
    [accent(`${found.length}/${FLAG_TOTAL} flags`)],
    "",
    [{ t: "around the site  " }, muted(`${count(site)}/${site.length}   hidden in the page itself. found one? submit FLAG{...}`)],
    ...site.map((h, i) => row(h, i + 1)),
    "",
    [{ t: "the box          " }, muted(`${count(box)}/${box.length}   in this shell. get from guest to /root/root.txt`)],
    ...box.map((h, i) => row(h, i + 5)),
    "",
    [muted("briefing: "), cmd("cat ~/README.txt"), muted("   stuck: "), cmd("hint")],
  ];
}

/** Lines to print after a command whose output contained new flags. */
export async function captureFlags(output: string): Promise<Line[]> {
  const store = useSiteStore.getState();
  const fresh = (await findFlags(output)).filter((hash) => !store.flags.includes(hash));
  if (!fresh.length) return [];
  const boxBefore = flagsIn("box").every((h) => store.flags.includes(h));
  for (const hash of fresh) store.addFlag(hash);
  const found = useSiteStore.getState().flags;
  const lines: Line[] = fresh.map((hash): Line => [
    accent("[+] flag captured: "),
    { t: FLAG_HASHES[hash].where },
    muted(`  ${found.length}/${FLAG_TOTAL}`),
  ]);
  const boxDone = flagsIn("box").every((h) => found.includes(h));
  if (boxDone && !boxBefore) lines.push(...rootedCard());
  if (found.length === FLAG_TOTAL) {
    lines.push("", [accent("all eight. "), { t: "you'd do well on my team. or my red team. " }, cmd("contact")]);
  }
  return lines;
}

function rootedCard(): Line[] {
  const seconds = Math.max(1, Math.round((performance.now() - session.startedAt) / 1000));
  const time = seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
  return [
    "",
    [accent("  ┌──────────────────────────────────────────┐")],
    [accent("  │  rooted.                                 │")],
    [accent("  │  guest → "), { t: `${OWNER} → root`.padEnd(32) }, accent("│")],
    [accent("  │  "), muted(`${time}, ${session.commands} commands`.padEnd(40)), accent("│")],
    [accent("  └──────────────────────────────────────────┘")],
    [muted("  hidden dotfiles, encoding mistaken for encryption, a reused")],
    [muted("  password, a sudo wildcard. i look for the same four at work.")],
  ];
}

/** The password cracker behind `john` and `hashcat`. It really hashes the wordlist. */
async function crack(args: string[], ctx: ShellContext, tool: "john" | "hashcat"): Promise<Line[]> {
  const wordlistArg = args.find((a) => a.startsWith("--wordlist="))?.slice("--wordlist=".length);
  const operands = args.filter((a) => !a.startsWith("-") && !/^\d+$/.test(a));
  const target = operands[0];
  if (!target) return err(`usage: ${tool} <hash file> [--wordlist=<file>]   e.g. ${tool} /etc/shadow`);

  const hashFile = readFile(tool, target, ctx);
  if ("error" in hashFile) return hashFile.error;
  const hashes = [...hashFile.text.matchAll(/^([\w-]+):\$sha256\$([0-9a-f]{64})/gm)].map((m) => ({ user: m[1], hash: m[2] }));
  if (!hashes.length) return err(`${tool}: no password hashes loaded from ${target}`);

  const wordlist = readFile(tool, wordlistArg ?? operands[1] ?? WORDLIST_PATH, ctx);
  if ("error" in wordlist) return wordlist.error;
  const words = wordlist.text.split("\n").filter(Boolean);

  ctx.print([
    `Loaded ${hashes.length} password hash (Raw-SHA256 [SHA256 256/256])`,
    [muted(`wordlist: ${wordlistArg ?? operands[1] ?? WORDLIST_PATH}, ${words.length} candidates. ctrl+c to stop`)],
  ]);

  const started = performance.now();
  let tried = 0;
  for (const word of words) {
    if (ctx.aborted()) return [[muted(`Session aborted after ${tried} candidates`)]];
    tried++;
    const digest = await sha256Hex(word);
    const hit = hashes.find((h) => h.hash === digest);
    if (tried % 6 === 0 && !hit) ctx.print([[muted(`  ${String(tried).padStart(3)}  ${word}`)]]);
    if (hit) {
      const elapsed = ((performance.now() - started) / 1000).toFixed(2);
      return [
        [accent(word.padEnd(16)), { t: ` (${hit.user})` }],
        [muted(`1g 0:00:00:${elapsed.padStart(5, "0")} DONE  ${tried} candidates tried`)],
        "",
        [muted("that's a password. use it: "), cmd(`su ${hit.user}`)],
      ];
    }
    // Paced so the search is visible; the hashing itself takes microseconds.
    await sleep(28);
  }
  return [[muted(`0g DONE  ${tried} candidates tried, none matched`)]];
}

/** A keypad to crack: four different digits, feedback after each guess. */
async function pinGame(ctx: ShellContext): Promise<Line[]> {
  const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const random = new Uint32Array(4);
  crypto.getRandomValues(random);
  let secret = "";
  for (const r of random) secret += digits.splice(r % digits.length, 1)[0];

  const MAX = 8;
  ctx.print([
    [accent("keypad lock. "), { t: "four digits, none repeated. eight attempts." }],
    [muted("after each guess:  ■ right digit, right place   □ right digit, wrong place")],
    "",
  ]);
  for (let attempt = 1; attempt <= MAX; attempt++) {
    const guess = (await ctx.ask(`pin ${attempt}/${MAX}> `))?.trim();
    if (guess === undefined) return [[muted("^C  the lock stays shut.")]];
    if (!/^\d{4}$/.test(guess) || new Set(guess).size !== 4) {
      ctx.print([[alert("four different digits, e.g. 4071")]]);
      attempt--;
      continue;
    }
    const exact = [...guess].filter((d, i) => secret[i] === d).length;
    const loose = [...guess].filter((d) => secret.includes(d)).length - exact;
    if (exact === 4) {
      return [[{ t: `  ${guess}  ` }, accent("■■■■")], "", [accent(`open. ${attempt} ${attempt === 1 ? "attempt" : "attempts"}.`)]];
    }
    ctx.print([[{ t: `  ${guess}  ` }, accent("■".repeat(exact)), { t: "□".repeat(loose) }, muted("·".repeat(4 - exact - loose))]]);
  }
  return [[alert("locked out. "), { t: `it was ${secret}. ` }, cmd("pin", "again?")]];
}

export const COMMANDS: Record<string, Command> = {
  help: {
    run: () => {
      const row = (command: string, label: string, about: string): Line => [
        { t: "  " },
        cmd(command, label),
        { t: " ".repeat(Math.max(1, 19 - label.length)) },
        muted(about),
      ];
      return [
        [accent("about me")],
        row("whoami", "whoami", "who I am"),
        row("cat resume", "cat resume", "experience, education, certifications"),
        row("ls projects", "ls projects", "what I've built"),
        row("open medisiem", "open <project>", "details and links, e.g. open medisiem"),
        row("nmap skills", "nmap skills", "what I work with"),
        row("git log", "git log", "where I've been"),
        row("contact", "contact", "how to reach me"),
        "",
        [accent("the site")],
        row("goto work", "goto <section>", SCENE_IDS.join(", ")),
        row("mode break", "mode build|break", "flip the whole site"),
        row("theme amber", "theme <name>", PALETTES.join(", ")),
        "",
        [accent("the box")],
        row("ctf", "ctf", "eight flags: four on the site, four in this shell"),
        row("hint", "hint", "a nudge for the next one"),
        row("pin", "pin", "crack a four-digit keypad"),
        "",
        [muted("also: ls -la, cd, pwd, cat, tree, find, grep, head, wc, id, su, sudo -l, john,")],
        [muted("base64 -d, rot13, curl -I, echo, date, uname -a, history, neofetch, clear, exit.")],
        [muted("pipes work: cat file | base64 -d.  tab completes, esc closes, names above are clickable.")],
      ];
    },
  },

  whoami: {
    run: () => [[accent(profile.name)], profile.role, `${profile.location} · ${profile.remote}`, "", ...profile.about],
  },

  id: {
    run: (_, ctx) => {
      const u = USERS[ctx.user];
      return [`uid=${u.uid}(${u.name}) gid=${u.uid}(${u.name}) groups=${u.groups}`];
    },
  },

  ls: {
    run: (args, ctx) => {
      const flags = args.filter((a) => a.startsWith("-")).join("");
      const target = args.find((a) => !a.startsWith("-"));
      const result = lookup(resolvePath(ctx.cwd, target, ctx.user), ctx.user);
      if ("error" in result) {
        return result.error === "denied"
          ? err(`ls: cannot open directory '${target ?? "."}': Permission denied`)
          : err(`ls: cannot access '${target}': No such file or directory`);
      }
      if (result.node.type === "file") return [target ?? ""];
      return listDir(result.node, flags.includes("a"), flags.includes("l"));
    },
  },

  cd: {
    run: (args, ctx) => {
      const path = resolvePath(ctx.cwd, args[0] ?? "~", ctx.user);
      const result = lookup(path, ctx.user);
      if ("error" in result) {
        return err(`cd: ${args[0]}: ${result.error === "denied" ? "Permission denied" : "No such file or directory"}`);
      }
      if (result.node.type !== "dir") return err(`cd: ${args[0]}: Not a directory`);
      ctx.setCwd(path);
      return [];
    },
  },

  pwd: { run: (_, ctx) => [ctx.cwd] },

  cat: {
    run: (args, ctx) => {
      if (!args.length) return ctx.stdin !== null ? ctx.stdin.split("\n") : err("cat: which file? try: cat resume");
      return args.flatMap((name) => {
        const read = readFile("cat", name, ctx);
        return "error" in read ? read.error : read.lines;
      });
    },
  },

  head: {
    run: (args, ctx) => {
      const nIndex = args.indexOf("-n");
      const count = nIndex >= 0 ? Number(args[nIndex + 1]) || 10 : 10;
      const operands = args.filter((a, i) => !a.startsWith("-") && (nIndex < 0 || i !== nIndex + 1));
      const input = inputText("head", operands.slice(0, 1), ctx);
      return "error" in input ? input.error : input.text.split("\n").slice(0, count);
    },
  },

  wc: {
    run: (args, ctx) => {
      const input = inputText("wc", args.filter((a) => !a.startsWith("-")).slice(0, 1), ctx);
      if ("error" in input) return input.error;
      const lines = input.text.split("\n").filter((l, i, all) => i < all.length - 1 || l !== "").length;
      if (args.includes("-l")) return [String(lines)];
      return [`${lines} ${input.text.split(/\s+/).filter(Boolean).length} ${input.text.length}`];
    },
  },

  tree: {
    run: (args, ctx) => {
      const path = resolvePath(ctx.cwd, args[0], ctx.user);
      const result = lookup(path, ctx.user);
      if ("error" in result || result.node.type !== "dir") return err(`tree: ${args[0] ?? path}: not a directory you can read`);
      return [[accent(displayPath(path, ctx.user))], ...tree(result.node, ctx.user)];
    },
  },

  find: {
    run: (args, ctx) => {
      const nameIndex = args.indexOf("-name");
      const typeIndex = args.indexOf("-type");
      const start = args[0] && !args[0].startsWith("-") ? args[0] : ".";
      const root = resolvePath(ctx.cwd, start, ctx.user);
      const base = lookup(root, ctx.user);
      if ("error" in base) return base.error === "denied" ? denied("find", start) : missing("find", start);

      const name = nameIndex >= 0 && args[nameIndex + 1] ? globToRegExp(args[nameIndex + 1]) : null;
      const type = typeIndex >= 0 ? args[typeIndex + 1] : null;
      const { found, denied: refused } = walk(root, ctx.user);
      // Printed the way find does: relative to the path it was given.
      const shown = (path: string) => (start.startsWith("/") ? path : `${start.replace(/\/$/, "")}${path.slice(root.length)}` || ".");
      const hits = found
        .filter(({ path, node }) => (!name || name.test(path.split("/").pop() ?? "")) && (!type || (type === "d") === (node.type === "dir")))
        .map(({ path }) => shown(path));
      return [
        ...hits.slice(0, 200),
        ...(hits.length > 200 ? ([[muted(`… ${hits.length - 200} more`)]] as Line[]) : []),
        ...refused.map((path): Line => [alert(`find: '${shown(path)}': Permission denied`)]),
      ];
    },
  },

  grep: {
    run: (args, ctx) => {
      const flags = args.filter((a) => /^-[a-zA-Z]+$/.test(a)).join("");
      const [pattern, ...targets] = args.filter((a) => !/^-[a-zA-Z]+$/.test(a));
      if (!pattern) return err("usage: grep [-r] [-i] [-n] <text> [file or directory]");
      const fold = (s: string) => (flags.includes("i") ? s.toLowerCase() : s);
      const needle = fold(pattern);
      const match = (text: string, label = ""): Line[] =>
        text
          .split("\n")
          .map((line, i) => ({ line, n: i + 1 }))
          .filter(({ line }) => fold(line).includes(needle))
          .map(({ line, n }): Line => [muted(`${label}${flags.includes("n") ? `${n}:` : ""}`), { t: line }]);

      if (!targets.length) {
        return ctx.stdin !== null ? match(ctx.stdin) : err("grep: nothing to search. give it a file, or -r and a directory.");
      }
      return targets.flatMap((target): Line[] => {
        const path = resolvePath(ctx.cwd, target, ctx.user);
        const result = lookup(path, ctx.user);
        if ("error" in result) return result.error === "denied" ? denied("grep", target) : missing("grep", target);
        if (result.node.type === "file") return match(linesText(result.node.read()), targets.length > 1 ? `${target}:` : "");
        if (!flags.includes("r")) return err(`grep: ${target}: Is a directory (use -r)`);
        return walk(path, ctx.user).found.flatMap(({ path: at, node }) =>
          node.type === "file" && canRead(node, ctx.user) ? match(linesText(node.read()), `${at}:`) : [],
        );
      });
    },
  },

  open: {
    run: (args) => {
      const name = (args[0] ?? "").toLowerCase();
      if (!name) return [[muted("open what? ")], projects.flatMap((p): Segment[] => [cmd(`open ${p.slug}`, p.slug), { t: "  " }])];
      const external: Record<string, string> = { github: profile.links.github, linkedin: profile.links.linkedin };
      if (Object.hasOwn(external, name)) {
        window.open(external[name], "_blank", "noopener,noreferrer");
        return [[muted("opening "), { t: external[name], href: external[name] }]];
      }
      const project = projects.find((p) => p.slug === name || p.slug.startsWith(name) || p.name.toLowerCase() === name);
      if (!project) return err(`open: no project called '${name}'. try: ls projects`);
      return projectLines(project);
    },
  },

  nmap: {
    run: (args) => {
      const target = args.find((a) => !a.startsWith("-"));
      if (!target) return err("usage: nmap skills   (or nmap localhost)");
      const now = new Date().toISOString().slice(0, 16).replace("T", " ");
      const head = [`Starting Nmap 7.95 ( https://nmap.org ) at ${now}`];
      if (target !== "skills") {
        return [
          ...head,
          `Nmap scan report for ${HOSTNAME} (127.0.0.1)`,
          "Host is up (0.00042s latency).",
          "",
          [muted("PORT     STATE  SERVICE")],
          [{ t: "22/tcp   " }, accent("open   "), { t: "ssh" }],
          [{ t: "443/tcp  " }, accent("open   "), { t: "https" }],
          "",
          [muted("nothing here to exploit over the network. the way in is local: "), cmd("ctf")],
        ];
      }
      return [
        ...head,
        `Nmap scan report for ${profile.handle} (127.0.0.1)`,
        "Host is up (0.00042s latency).",
        "",
        [muted("PORT       STATE  SERVICE          VERSION")],
        ...allSkills.map((s): Line => [
          { t: `${`${s.port}/${s.proto}`.padEnd(11)}` },
          accent("open   "),
          { t: s.service.padEnd(17) },
          muted(s.items.join(", ")),
        ]),
        "",
        [muted("details: "), cmd("cat skills")],
        "",
        "Nmap done: 1 IP address (1 host up) scanned in 0.42 seconds",
      ];
    },
  },

  git: {
    run: (args) => {
      if (args[0] !== "log") return err("git: try 'git log'");
      // Jobs and study as one history, newest first.
      const commits = [
        ...experience.map((e) => ({ when: e.period, title: `${e.role}, ${e.company}`, body: e.highlights.map((h) => `${h.area}: ${h.text}`) })),
        ...education.map((e) => ({ when: e.period, title: `${e.title}, ${e.place}`, body: e.detail })),
      ];
      const oneline = args.includes("--oneline");
      return commits.flatMap((c, i): Line[] => {
        const hash = shortHash(c.title + c.when);
        if (oneline) return [[accent(hash), { t: ` ${c.title}` }]];
        return [
          [accent(`commit ${hash}`), muted(i === 0 ? " (HEAD -> main)" : "")],
          [muted(`Date:   ${c.when}`)],
          "",
          `    ${c.title}`,
          ...c.body.map((d) => `    - ${d}`),
          "",
        ];
      });
    },
  },

  contact: {
    run: () => [...contactLines(), "", [muted("or: "), cmd("goto contact")]],
  },

  goto: {
    run: (args, ctx) => {
      const id = args[0];
      if (!id || !SCENE_IDS.includes(id)) return err(`goto: pick one of ${SCENE_IDS.join(", ")}`);
      ctx.goto(id);
      return [];
    },
  },

  mode: {
    run: (args) => {
      const mode = args[0];
      if (mode !== "build" && mode !== "break") return err("usage: mode build | mode break");
      useSiteStore.getState().setMode(mode);
      return [
        [muted("mode set to "), mode === "break" ? alert(mode) : accent(mode)],
        [muted(mode === "break" ? "the page behind this now shows the offensive side." : "the page behind this now shows the defensive side.")],
      ];
    },
  },

  theme: {
    run: (args) => {
      const palette = args[0] as Palette;
      if (!PALETTES.includes(palette)) return err(`usage: theme ${PALETTES.join(" | ")}`);
      useSiteStore.getState().setPalette(palette);
      return [[muted("palette set to "), accent(palette)]];
    },
  },

  submit: {
    run: async (args) => {
      const candidate = args.join(" ");
      if (!candidate) return err("usage: submit FLAG{...}");
      const hash = await checkFlag(candidate);
      if (!hash) return err("nope. not one of mine.");
      if (useSiteStore.getState().flags.includes(hash)) {
        return [[muted(`already have that one. ${useSiteStore.getState().flags.length}/${FLAG_TOTAL}`)]];
      }
      // Echoing the flag lets the shell's own capture step credit it.
      return [[accent("correct. "), { t: candidate.trim() }]];
    },
  },

  ctf: { run: scoreboard },
  flags: { run: scoreboard },

  hint: {
    run: (args) => {
      const found = useSiteStore.getState().flags;
      const more = args[0] === "more";
      const boxNext = flagsIn("box").findIndex((h) => !found.includes(h));
      if (boxNext >= 0) {
        const hint = BOX_HINTS[boxNext];
        return [
          [accent(`box, flag ${boxNext + 1} of 4: `), { t: FLAG_HASHES[flagsIn("box")[boxNext]].where }],
          more ? hint.more : hint.nudge,
          ...(more ? [] : ([[muted("still stuck? "), cmd("hint more")]] as Line[])),
        ];
      }
      const siteLeft = flagsIn("site")
        .map((h, i) => ({ h, i }))
        .filter(({ h }) => !found.includes(h));
      if (!siteLeft.length) return [[muted("nothing left to hint at. you have all eight.")]];
      return [
        [accent("the box is done. "), { t: "what's left is hidden around the site:" }],
        ...siteLeft.map(({ i }) => `  ${i + 1}. ${SITE_HINTS[i]}`),
      ];
    },
  },

  su: {
    run: async (args, ctx) => {
      const name = args.find((a) => a !== "-") ?? "root";
      const target = (Object.keys(USERS) as User[]).find((u) => USERS[u].name === name);
      if (!target) return err(`su: user ${name} does not exist or the user entry does not contain all the required fields`);
      if (target === "guest" || ctx.user === "root") {
        ctx.setUser(target);
        ctx.setCwd(homeOf(target));
        return [];
      }
      const password = await ctx.ask("Password: ", true);
      if (password === null) return [];
      await sleep(350);
      // Root has no password to guess (its shadow entry is locked). The way up is sudo.
      if (target !== "owner" || (await sha256Hex(password)) !== OWNER_HASH) return err("su: Authentication failure");
      ctx.setUser("owner");
      ctx.setCwd(homeOf("owner"));
      return [[muted(`you are ${OWNER} now. look around: `), cmd("ls -la")]];
    },
  },

  sudo: {
    run: (args, ctx) => {
      const line = args.join(" ");
      if (line === "hire-me") {
        return [
          [muted(`[sudo] password for ${USERS[ctx.user].name}: ********`)],
          [accent("access granted.")],
          "good call. here's how to reach me:",
          "",
          ...contactLines(),
          "",
          [muted("or scroll to the end: "), cmd("goto contact")],
        ];
      }
      if (ctx.user === "root") return err("sudo: you are already root.");
      if (ctx.user === "guest") {
        return args[0] === "-l"
          ? err(`Sorry, user guest may not run sudo on ${HOSTNAME}.`)
          : err("guest is not in the sudoers file. This incident will be reported.");
      }
      if (args[0] === "-l") {
        return [
          `Matching Defaults entries for ${OWNER} on ${HOSTNAME}:`,
          "    env_reset, mail_badpass",
          "",
          `User ${OWNER} may run the following commands on ${HOSTNAME}:`,
          [{ t: "    (root) NOPASSWD: " }, accent(SUDO_RULE)],
        ];
      }
      if (!args.length) return err("usage: sudo -l | sudo <command>");
      // sudo matches the rule against the whole command line, and * matches
      // anything, slashes and dots included. That is the bug.
      const canonical = args[0] === "cat" ? ["/usr/bin/cat", ...args.slice(1)].join(" ") : line;
      if (!globToRegExp(SUDO_RULE).test(canonical) || args.length < 2) {
        return err(`Sorry, user ${OWNER} is not allowed to execute '${canonical}' as root on ${HOSTNAME}.`);
      }
      return args.slice(1).flatMap((name) => {
        const read = readFile("cat", name, ctx, "root");
        return "error" in read ? read.error : read.lines;
      });
    },
  },

  john: { run: (args, ctx) => crack(args, ctx, "john") },
  hashcat: { run: (args, ctx) => crack(args, ctx, "hashcat") },

  curl: {
    run: async (args) => {
      const path = args.find((a) => !a.startsWith("-")) ?? "/";
      if (!args.includes("-I")) return err("curl: only -I (headers) is installed. try: curl -I /");
      // Same-origin paths only. "//host" and backslashes would leave the site.
      if (!/^\/(?!\/)[\w\-./?=&%~]*$/.test(path)) return err("curl: this one only talks to this site. try: curl -I /");
      try {
        const res = await fetch(path, { method: "HEAD", cache: "no-store", redirect: "manual" });
        const pairs: [string, string][] = [];
        res.headers.forEach((value, name) => pairs.push([name, value]));
        pairs.sort(([a], [b]) => a.localeCompare(b));
        return [
          `HTTP/1.1 ${res.status} ${res.statusText}`,
          ...pairs.map(([name, value]): Line => [
            muted(`${name}: `),
            { t: value.length > 140 ? `${value.slice(0, 140)}…` : value },
          ]),
        ];
      } catch {
        return err("curl: could not reach that path");
      }
    },
  },

  base64: {
    run: (args, ctx) => {
      const decode = args.includes("-d") || args.includes("--decode");
      const input = inputText("base64", args.filter((a) => !a.startsWith("-")), ctx);
      if ("error" in input) return input.error;
      try {
        if (!decode) return [btoa(String.fromCharCode(...new TextEncoder().encode(input.text)))];
        const bytes = Uint8Array.from(atob(input.text.replace(/\s+/g, "")), (c) => c.charCodeAt(0));
        return new TextDecoder().decode(bytes).replace(/\n$/, "").split("\n");
      } catch {
        return err("base64: invalid input");
      }
    },
  },

  rot13: {
    run: (args, ctx) => {
      const input = inputText("rot13", args, ctx);
      if ("error" in input) return input.error;
      return input.text
        .replace(/[a-z]/gi, (ch) => {
          const base = ch <= "Z" ? 65 : 97;
          return String.fromCharCode(((ch.charCodeAt(0) - base + 13) % 26) + base);
        })
        .split("\n");
    },
  },

  pin: { run: (_, ctx) => pinGame(ctx) },

  echo: { run: (args) => [args.join(" ")] },
  date: { run: () => [new Date().toString()] },
  hostname: { run: () => [HOSTNAME] },
  uname: { run: (args) => [args.includes("-a") ? `Linux ${HOSTNAME} 6.6.6-bb #1 SMP PREEMPT x86_64 GNU/Linux` : "Linux"] },
  history: { run: (_, ctx) => ctx.history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`) },

  neofetch: {
    run: (_, ctx) => {
      const s = useSiteStore.getState();
      const uptime = Math.round(performance.now() / 1000);
      const art = ["  ┌──────────┐ ", "  │ >_       │ ", "  │          │ ", "  └──┬────┬──┘ ", "   ▔▔▔▔▔▔▔▔   ", "              "];
      const info: Segment[][] = [
        [accent(`${USERS[ctx.user].name}@${HOSTNAME}`)],
        [muted("os      "), { t: "build/break 1.0" }],
        [muted("shell   "), { t: "bb-sh" }],
        [muted("mode    "), s.mode === "break" ? alert(s.mode) : accent(s.mode)],
        [muted("theme   "), { t: s.palette }],
        [muted("uptime  "), { t: `${uptime}s · flags ${s.flags.length}/${FLAG_TOTAL}` }],
      ];
      return art.map((a, i): Line => [accent(a), ...info[i]]);
    },
  },

  rm: { run: () => err("rm: read-only filesystem. it's a portfolio, not prod.") },
  vim: { run: () => [[muted("you're safe. vim isn't installed, so you'll never have to exit it.")]] },
  clear: {
    run: (_, ctx) => {
      ctx.clear();
      return [];
    },
  },
  exit: {
    run: (_, ctx) => {
      // Like a real shell: leaving a su session drops back to the user underneath.
      if (ctx.user !== "guest") {
        ctx.setUser("guest");
        ctx.setCwd(homeOf("guest"));
        return [[muted("logout")]];
      }
      ctx.close();
      return [];
    },
  },
};

/** Command names for tab completion (hidden jokes stay hidden). */
export const COMPLETABLE = [
  "help", "whoami", "id", "ls", "cd", "pwd", "cat", "head", "wc", "tree", "find", "grep", "open", "nmap", "git",
  "contact", "goto", "mode", "theme", "submit", "ctf", "hint", "su", "sudo", "john", "curl", "base64", "rot13",
  "pin", "echo", "date", "uname", "history", "neofetch", "clear", "exit",
];

/** Argument suggestions for a command, given where the shell is and who is typing. */
export function completeArgs(command: string, partial: string, cwd: string, user: User): string[] {
  switch (command) {
    case "open":
      return [...projects.map((p) => p.slug), "github", "linkedin"];
    case "goto":
      return SCENE_IDS;
    case "mode":
      return ["build", "break"];
    case "theme":
      return PALETTES;
    case "nmap":
      return ["skills", "localhost"];
    case "git":
      return ["log"];
    case "su":
      return [OWNER, "root", "guest"];
    case "hint":
      return ["more"];
    default: {
      // Complete the last path segment inside whichever directory has been typed so far.
      const slash = partial.lastIndexOf("/");
      const typedDir = slash >= 0 ? partial.slice(0, slash + 1) : "";
      const result = lookup(resolvePath(cwd, typedDir || ".", user), user);
      if ("error" in result || result.node.type !== "dir") return [];
      return Object.entries(result.node.children).map(([n, c]) => `${typedDir}${n}${c.type === "dir" ? "/" : ""}`);
    }
  }
}

/** Splits a command line on spaces, keeping "quoted strings" together. */
export function tokenize(input: string): string[] {
  return Array.from(input.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g), (m) => m[1] ?? m[2] ?? m[3]);
}

/** Splits a line into pipe stages, ignoring | inside quotes. */
export function splitPipes(input: string): string[] {
  return (input.match(/(?:"[^"]*"|'[^']*'|[^|])+/g) ?? []).map((stage) => stage.trim()).filter(Boolean);
}

/**
 * Runs one command line, pipes included, and returns what to print.
 * Flags that appear in the output are credited automatically.
 */
export async function runLine(line: string, ctx: Omit<ShellContext, "stdin">): Promise<Line[]> {
  if (!session.startedAt) session.startedAt = performance.now();
  session.commands++;

  let lines: Line[] = [];
  let stdin: string | null = null;
  for (const stage of splitPipes(line)) {
    const [name, ...args] = tokenize(stage);
    const command = Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : null;
    if (!command) return err(`bb-sh: command not found: ${name}. try 'help'`);
    lines = await command.run(args, { ...ctx, stdin });
    stdin = lines.map(lineText).join("\n");
  }
  return [...lines, ...(await captureFlags(linesText(lines)))];
}
