import { allSkills, education, experience, profile, security } from "@/content/profile";
import { projects, type Project } from "@/content/projects";
import { BOX_README, boxTree, GUEST_HISTORY, SITE_HINTS } from "./box";
import { accent, cmd, dir, file, link, muted, USERS, HOSTNAME, type FsNode, type Line, type User } from "./types";

/**
 * The terminal's read-only virtual filesystem. The portfolio files are
 * generated from /content so the shell never drifts from the rest of the
 * site; the box (./box.ts) adds the files the CTF is played in.
 *
 * Permissions are the short version of Unix: every node has an owner and is
 * either open (world-readable) or not. Root reads everything.
 */

export function projectLines(p: Project): Line[] {
  return [
    [accent(p.name), muted(`  ${p.year} · ${p.side === "both" ? "build + break" : p.side}`)],
    p.line,
    "",
    ...p.notes,
    "",
    [muted("stack   "), { t: p.stack.join(", ") }],
    ...p.links.map((l): Line => [muted(`${l.label.toLowerCase().padEnd(8)}`), link(l.href)]),
  ];
}

export function contactLines(): Line[] {
  return [
    [muted("email     "), link(`mailto:${profile.links.email}`, profile.links.email)],
    [muted("linkedin  "), link(profile.links.linkedin)],
    [muted("github    "), link(profile.links.github)],
  ];
}

export const certificationLines = (): Line[] =>
  security.certifications.map((c): Line => [muted(`${c.issuer.padEnd(12)}`), { t: c.name }]);

function resumeLines(): Line[] {
  const lines: Line[] = [
    [accent(profile.name.toUpperCase())],
    `${profile.role} · ${profile.location}`,
    "",
    [accent("experience")],
  ];
  for (const job of experience) {
    lines.push([muted(job.period.padEnd(16)), { t: `${job.role}, ${job.company}${job.team ? ` (${job.team})` : ""}` }]);
    for (const h of job.highlights) lines.push([muted(`  ${h.area.padEnd(20)}`), { t: h.text }]);
    lines.push("");
  }
  lines.push([accent("education")]);
  for (const ed of education) {
    lines.push([muted(ed.period.padEnd(16)), { t: `${ed.title}, ${ed.place}` }]);
    for (const d of ed.detail) lines.push(`                  ${d}`);
  }
  lines.push("", [accent("certifications")], ...certificationLines());
  lines.push("", [accent("contact")], ...contactLines());
  if (profile.links.resume) lines.push("", [muted("pdf       "), link(profile.links.resume)]);
  return lines;
}

const projectFiles = Object.fromEntries(projects.map((p) => [`${p.slug}.md`, file(() => projectLines(p), "guest")]));

const OWNER = USERS.owner.name;

export const ROOT: FsNode = dir({
  home: dir({
    guest: dir(
      {
        "README.txt": file(() => BOX_README, "guest"),
        "about.txt": file(() => [[accent(profile.name)], ...profile.about], "guest"),
        "resume.txt": file(resumeLines, "guest"),
        "contact.txt": file(contactLines, "guest"),
        "skills.txt": file(
          () =>
            allSkills.flatMap((s): Line[] => [
              [accent(s.title), muted(`  ${s.port}/${s.proto}`)],
              s.items.join(", "),
              [muted(s.detail)],
              "",
            ]),
          "guest",
        ),
        projects: dir(projectFiles, "guest"),
        security: dir(
          {
            "defence.txt": file(() => security.defence, "guest"),
            "practice.txt": file(() => security.practice, "guest"),
            "certifications.txt": file(certificationLines, "guest"),
          },
          "guest",
        ),
        ".bash_history": file(() => GUEST_HISTORY, "guest"),
        ".secrets": dir(
          {
            "hints.txt": file(
              () => [
                "four flags are hidden around the site itself, format FLAG{...}.",
                "found one outside this shell? submit FLAG{...}",
                ...SITE_HINTS.map((hint, i) => `${i + 1}. ${hint}`),
                "",
                [muted("the other four are in here. see: "), cmd("ctf")],
              ],
              "guest",
            ),
          },
          "guest",
        ),
      },
      "guest",
    ),
    [OWNER]: boxTree.ownerHome,
  }),
  root: boxTree.rootHome,
  etc: dir({
    hostname: file(() => [HOSTNAME]),
    motd: file(() => [`welcome to build/break. ${profile.identity.toLowerCase()}`]),
    passwd: file(() => [
      "root:x:0:0:root:/root:/bin/bash",
      `${OWNER}:x:1000:1000:builds things, breaks things:/home/${OWNER}:/bin/zsh`,
      "guest:x:1001:1001:you:/home/guest:/bin/bb-sh",
    ]),
    shadow: boxTree.shadow,
    sudoers: boxTree.sudoers,
  }),
  opt: boxTree.opt,
  usr: boxTree.usr,
  var: dir({
    log: dir({
      "auth.log": boxTree.authLog,
      "experience.log": file(() =>
        experience.map((e): Line => [muted(`[${e.period}] `), { t: `${e.role}, ${e.company}` }]),
      ),
    }),
  }),
});

export const homeOf = (user: User) => USERS[user].home;

/** Resolves a path against cwd. Supports ~, ., .. and absolute paths. */
export function resolvePath(cwd: string, input = "", user: User = "guest"): string {
  const raw = input === "~" || input.startsWith("~/") ? homeOf(user) + input.slice(1) : input;
  const parts = (raw.startsWith("/") ? raw : `${cwd}/${raw}`).split("/");
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return `/${stack.join("/")}`;
}

export const canRead = (node: FsNode, user: User) => node.open || user === "root" || node.owner === user;

export type Lookup = { node: FsNode } | { error: "missing" | "denied" };

/**
 * Walks to a path as `user`. Every directory on the way has to be readable,
 * and so does the node itself, so /root/root.txt is "denied" for guest.
 */
export function lookup(path: string, user: User): Lookup {
  let node: FsNode = ROOT;
  for (const part of path.split("/").filter(Boolean)) {
    if (node.type !== "dir") return { error: "missing" };
    if (!canRead(node, user)) return { error: "denied" };
    if (!Object.hasOwn(node.children, part)) return { error: "missing" };
    node = node.children[part];
  }
  return canRead(node, user) ? { node } : { error: "denied" };
}

/** Finds a file, also trying common extensions so `cat resume` works. */
export function findFile(cwd: string, name: string, user: User): { path: string; result: Lookup } {
  let first: { path: string; result: Lookup } | null = null;
  for (const candidate of [name, `${name}.txt`, `${name}.md`]) {
    const path = resolvePath(cwd, candidate, user);
    const result = lookup(path, user);
    if ("node" in result) return { path, result };
    // "denied" on the exact name is the answer; don't mask it with a ".txt" miss.
    if (!first || (candidate === name && result.error === "denied")) first = { path, result };
    if (candidate === name && result.error === "denied") break;
  }
  return first!;
}

export function displayPath(path: string, user: User = "guest"): string {
  const home = homeOf(user);
  return path === home ? "~" : path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

/** Every node under `path` that `user` can see, depth first, plus the directories that refused. */
export function walk(path: string, user: User): { found: { path: string; node: FsNode }[]; denied: string[] } {
  const found: { path: string; node: FsNode }[] = [];
  const denied: string[] = [];
  const visit = (at: string, node: FsNode) => {
    found.push({ path: at, node });
    if (node.type !== "dir") return;
    if (!canRead(node, user)) {
      denied.push(at);
      return;
    }
    for (const name of Object.keys(node.children).sort()) {
      visit(at === "/" ? `/${name}` : `${at}/${name}`, node.children[name]);
    }
  };
  const start = lookupRaw(path);
  if (start) visit(path, start);
  return { found, denied };
}

/** The node at a path with no permission checks. Only for listing what exists. */
function lookupRaw(path: string): FsNode | null {
  let node: FsNode = ROOT;
  for (const part of path.split("/").filter(Boolean)) {
    if (node.type !== "dir" || !Object.hasOwn(node.children, part)) return null;
    node = node.children[part];
  }
  return node;
}
