import { profile } from "@/content/profile";
import { accent, cmd, dir, file, muted, USERS, type FsNode, type Line } from "./types";

/**
 * The box: a small boot2root that lives in the terminal's filesystem.
 * You start as guest and finish by reading /root/root.txt. Four flags,
 * each behind a technique that works the same way on a real Linux host:
 *
 *   1. enumeration   `ls -la` finds a hidden directory under /opt/backup
 *   2. decoding      a "credentials" file is base64 over rot13, not encrypted
 *   3. cracking      /etc/shadow is world-readable; `john` really hashes the
 *                    wordlist with SHA-256 until one matches, then `su`
 *   4. escalation    sudo allows `cat /var/log/*`, and the * also matches ../
 *
 * The game runs in the browser, so its files ship in the bundle. The flag
 * text is XOR-ed so it doesn't show up in a plain search of the JavaScript.
 */

const OWNER = USERS.owner.name;

/** SHA-256 of the owner account's password. The password is in the wordlist below. */
export const OWNER_HASH = "203b70b5ae883932161bbd0bded9357e763e63afce98b16230be33f0b94c2cc5";

/** A short slice of the usual suspects. `john` hashes these one by one. */
export const WORDLIST = [
  "123456", "password", "12345678", "qwerty", "123456789", "12345", "1234", "111111", "1234567", "dragon",
  "123123", "baseball", "abc123", "football", "monkey", "letmein", "696969", "shadow", "master", "666666",
  "qwertyuiop", "123321", "mustang", "1234567890", "michael", "654321", "superman", "1qaz2wsx", "7777777",
  "121212", "000000", "qazwsx", "123qwe", "killer", "trustno1", "jordan", "jennifer", "zxcvbnm", "asdfgh",
  "hunter", "buster", "soccer", "harley", "batman", "andrew", "tigger", "sunshine", "iloveyou", "charlie",
  "robert", "thomas", "hockey", "ranger", "daniel", "starwars", "klaster", "112233", "george", "computer",
];

export const WORDLIST_PATH = "/usr/share/wordlists/common.txt";

const XOR_KEY = "bb-sh";

function reveal(encoded: string): string {
  const bytes = atob(encoded);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length));
  return out;
}

const FLAG_ENUMERATION = "JC5sNBMGUlkVWQ5RXiwAUwYeLAZSFkVCBgU9HUYV";
const FLAG_CRACKING = "JC5sNBMQUVgAWwY9XUcbERUdAQwRPU4BXAEJchVcERZyQ18f";
const FLAG_ROOT = "JC5sNBMRF0lDNxVTQRcLVhBJLBwQVltAGhFWQSwaUlJZLFhaHw==";

/** Stage 2 as it sits on disk: base64 of a rot13'd note that contains the flag. */
const CREDS_B64 = [
  "c3ludDogU1lOVHszYXAwcTFhdF8xZl9hMGdfM2FwZWxjZzEwYV8wNn0KYWJnciBn",
  "YiBmcnlzOiAvcmdwL2Z1bnFiaiB2ZiBqYmV5cS1lcm5xbm95ciBudG52YS4Kc3Zr",
  "IGd1ciBjcmV6dmZmdmJhZiBvcnNiZXIgZmJ6cmJhciBlaGFmIHdidWEgYmEgdmcu",
  "Cg==",
];

export const BOX_README: Line[] = [
  [accent("the box")],
  "",
  "this shell is also a small boot2root. you are guest. the goal is to",
  "read /root/root.txt. there are four flags on the way, and each one",
  "sits behind a mistake people really make on real servers.",
  "",
  [muted("progress  "), cmd("ctf")],
  [muted("a nudge   "), cmd("hint")],
  "",
  [muted("start the way every test starts: look around properly.")],
];

/** Files and directories the box adds to the filesystem. */
export const boxTree = {
  opt: dir({
    backup: dir({
      "nightly.log": file(() => [
        "[01:00:01] backup started",
        "[01:00:07] /home archived",
        "[01:00:09] snapshot written to .snapshot/",
        "[01:00:09] backup finished, 0 errors",
      ]),
      ".snapshot": dir({
        "flag.txt": file(() => [reveal(FLAG_ENUMERATION)]),
        "creds.b64": file(() => CREDS_B64),
      }),
    }),
  }),

  shadow: file(() => [
    "root:!:20403:0:99999:7:::",
    `${OWNER}:$sha256$${OWNER_HASH}:20403:0:99999:7:::`,
    "guest::20403:0:99999:7:::",
  ]),

  sudoers: file(() => [], "root", false),

  usr: dir({
    share: dir({
      wordlists: dir({
        "common.txt": file(() => WORDLIST),
      }),
    }),
  }),

  authLog: file(() => [
    `Nov 10 22:14:03 build-break su: pam_unix(su:session): session opened for user ${OWNER}`,
    `Nov 10 22:14:41 build-break sudo: ${OWNER} : TTY=pts/0 ; PWD=/home/${OWNER} ; USER=root ; COMMAND=/usr/bin/cat /var/log/auth.log`,
    "Nov 10 22:15:02 build-break sudo: pam_unix(sudo:session): session closed for user root",
  ]),

  ownerHome: dir(
    {
      "user.txt": file(() => [reveal(FLAG_CRACKING)], "owner", false),
      "notes.txt": file(
        () => [
          "todo",
          "- change my password. it was in the first wordlist anyone would try.",
          "- tighten the sudo rule for reading logs. /var/log/* is too generous.",
          `- reply to everyone who got this far: ${profile.links.email}`,
        ],
        "owner",
        false,
      ),
      ".bash_history": file(() => ["sudo -l", "sudo cat /var/log/auth.log", "vim notes.txt", ":wq"], "owner", false),
    },
    "owner",
    false,
  ),

  rootHome: dir(
    {
      "root.txt": file(() => [reveal(FLAG_ROOT)], "root", false),
    },
    "root",
    false,
  ),
} satisfies Record<string, FsNode>;

/** What guest's shell history gives away. */
export const GUEST_HISTORY = [
  "ls -la /opt/backup",
  "cat /etc/passwd",
  "base64 -d notes.b64",
  "vim notes.txt",
  ":q",
  ":q!",
  ":wq!!!",
  "sudo hire-me",
];

/** The sudo rule on the box, as `sudo -l` prints it. */
export const SUDO_RULE = "/usr/bin/cat /var/log/*";

/** Two hints per stage: a nudge, then nearly the answer. Order matches the box flags in src/lib/ctf.ts. */
export const BOX_HINTS: { nudge: string; more: string }[] = [
  {
    nudge: "plain ls hides dotfiles. your own shell history shows where someone has been: cat ~/.bash_history",
    more: "ls -la /opt/backup, then look inside the directory it was hiding.",
  },
  {
    nudge: "the file next to the first flag is encoded twice. neither layer is encryption, and pipes work here.",
    more: "cat /opt/backup/.snapshot/creds.b64 | base64 -d | rot13",
  },
  {
    nudge: "the note pointed at /etc/shadow. a hash and a wordlist are all john needs.",
    more: `john /etc/shadow, then su ${OWNER} with what it finds, then cat ~/user.txt`,
  },
  {
    nudge: "ask sudo what you're allowed to run: sudo -l. a * in a rule matches more than its author meant.",
    more: "sudo cat /var/log/../../root/root.txt",
  },
];

/** Hints for the four flags hidden around the site, in the order of src/lib/ctf.ts. */
export const SITE_HINTS = [
  "this page has a source. read it.",
  "developers leave things in the console.",
  "servers talk in headers. try: curl -I /",
  "people still write things on sticky notes. base64 -d is installed.",
];

/** Per-visit stats for the finish line. Not persisted. */
export const session = { startedAt: 0, commands: 0 };
