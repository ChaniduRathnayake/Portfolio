import { profile } from "@/content/profile";

/** Shared types and small helpers for the terminal. */

export type Tone = "accent" | "muted" | "alert";

/**
 * A run of output text. `href` makes it a link; `run` makes it a button that
 * types and runs that command, so the shell also works by tapping.
 */
export type Segment = { t: string; tone?: Tone; href?: string; run?: string };

/** One output line: plain text or a run of styled segments. */
export type Line = string | Segment[];

export const muted = (t: string): Segment => ({ t, tone: "muted" });
export const accent = (t: string): Segment => ({ t, tone: "accent" });
export const alert = (t: string): Segment => ({ t, tone: "alert" });
export const link = (href: string, label = href): Segment => ({ t: label, href });
export const cmd = (command: string, label = command): Segment => ({ t: label, run: command });
export const err = (t: string): Line[] => [[alert(t)]];

export const lineText = (line: Line): string => (typeof line === "string" ? line : line.map((s) => s.t).join(""));
export const linesText = (lines: Line[]): string => lines.map(lineText).join("\n");

/** Accounts on the box. "owner" is me; its login name comes from the profile. */
export type User = "guest" | "owner" | "root";

export const USERS: Record<User, { name: string; uid: number; home: string; groups: string }> = {
  guest: { name: "guest", uid: 1001, home: "/home/guest", groups: "1001(guest)" },
  owner: { name: profile.handle, uid: 1000, home: `/home/${profile.handle}`, groups: `1000(${profile.handle}),27(sudo)` },
  root: { name: "root", uid: 0, home: "/root", groups: "0(root)" },
};

export const HOSTNAME = "build-break";

export type FsNode = { owner: User; /** Readable by everyone, not just the owner and root. */ open: boolean } & (
  | { type: "dir"; children: Record<string, FsNode> }
  | { type: "file"; read: () => Line[] }
);

export const file = (read: () => Line[], owner: User = "root", open = true): FsNode => ({ type: "file", read, owner, open });
export const dir = (children: Record<string, FsNode>, owner: User = "root", open = true): FsNode => ({
  type: "dir",
  children,
  owner,
  open,
});
