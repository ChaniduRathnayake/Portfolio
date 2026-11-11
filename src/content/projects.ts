/**
 * Project index. Facts come from each repository's README; anything I could not
 * confirm is a [PLACEHOLDER]. Long-form write-ups move to MDX in Phase 3, keyed
 * by `slug`.
 */
export type ProjectMedia =
  | {
      kind: "screenshot";
      src: string;
      alt: string;
      width: number;
      height: number;
      caption: string;
      /** Shown instead while the screenshot file isn't in /public yet. */
      fallback?: { src: string; alt: string; caption: string };
      /** Extra screens shown as thumbnails; each appears once its file exists. */
      gallery?: { src: string; alt: string; width: number; height: number; caption: string }[];
    }
  /** Something to play with on the page instead of a picture (see src/components/labs). */
  | { kind: "lab"; lab: "traversal" | "des"; caption: string }
  /** Line diagrams drawn in code for projects with no screenshots (see ProjectDiagram.tsx). */
  | { kind: "diagram"; diagram: "feistel" | "traversal" | "scorm" | "nonce" | "chain"; caption: string };

export interface Project {
  slug: string;
  name: string;
  line: string;
  stack: string[];
  /** Which side of the site shows it: BUILD, BREAK, or both (with a view for each). */
  side: "build" | "break" | "both";
  /** Per-side line and media for "both" projects. Falls back to `line` and `media`. */
  views?: Partial<Record<"build" | "break", { line: string; media: ProjectMedia }>>;
  year: string;
  links: { label: string; href: string }[];
  /** A few lines for `open <project>` in the terminal. */
  notes: string[];
  media: ProjectMedia;
}

const gh = (repo: string) => `https://github.com/ChaniduRathnayake/${repo}`;

/** The projects one side of the site shows, each resolved to that side's line and media. */
export function projectsFor(mode: "build" | "break"): (Project & { line: string; media: ProjectMedia })[] {
  return projects
    .filter((p) => p.side === mode || p.side === "both")
    .map((p) => ({ ...p, ...(p.views?.[mode] ?? {}) }));
}

/** Every technology used across all projects, deduplicated, in first-seen order. */
export function projectTechnologies(): string[] {
  return [...new Set(projects.flatMap((p) => p.stack))];
}

export const projects: Project[] = [
  {
    slug: "medisiem",
    name: "MediSIEM",
    line: "A SIEM/IDS for hospital networks that ranks alerts by clinical risk.",
    stack: [
      "Wazuh", "Docker", "Python", "Flask", "scikit-learn", "pandas", "NumPy", "SHAP", "Scapy",
      "React", "TypeScript", "Vite", "Tailwind CSS", "Recharts", "Axios", "React Router", "Socket.IO",
      "Node.js", "Express", "MongoDB", "Mongoose", "JWT", "bcrypt", "Helmet", "TOTP 2FA", "Nodemailer", "Vitest",
    ],
    side: "build",
    year: "2026",
    links: [{ label: "Source", href: gh("Enhancing-SIEMS-for-Healthcare") }],
    notes: [
      "Ingests Wazuh HIDS alerts and live network flows, scores them, and",
      "streams them to a real-time SOC dashboard.",
      "CAAP (Clinically Aware Alert Prioritization) combines a Random Forest,",
      "an Isolation Forest and a K-Means model with clinical-criticality,",
      "active-exploitation and time-of-day scores into one 0–10 Clinical Alert Score.",
      "An exploit on an ICU ventilator at night outranks the same exploit",
      "on an idle admin workstation.",
      "Final-year research project at SLIIT (R26-CS-008). My part is CAAP:",
      "the ML pipeline (train, test, label mapping) and the Flask AI server.",
    ],
    media: {
      kind: "screenshot",
      src: "/images/projects/medisiem-dashboard.webp",
      alt: "MediSIEM admin dashboard: alert totals, a 24-hour alert volume chart, a severity donut, and an alert table ranked by Clinical Alert Score for devices such as an anesthesia machine and a dialysis machine.",
      width: 1896,
      height: 836,
      caption: "Alert queue, ranked by Clinical Alert Score",
    },
  },
  {
    slug: "netuse",
    name: "NetUse",
    line: "A network monitor and per-app firewall for Windows 10 and 11.",
    stack: ["C#", ".NET", "WPF", "Windows Firewall", "Windows QoS", "Inno Setup"],
    side: "build",
    year: "2026",
    links: [{ label: "Source + download", href: gh("NetUse") }],
    notes: [
      "Shows which apps use the connection, how much, and where they connect.",
      "One switch per app blocks traffic through Windows Firewall rules.",
      "Per-app data limits, blocked hours and upload speed limits.",
      "Lists open ports, active connections and devices on the local network.",
      "Routes chosen apps or websites through a network you pick.",
    ],
    media: {
      kind: "screenshot",
      src: "/images/projects/netuse.webp",
      alt: "NetUse overview: live download and upload speed, totals for today, this month and all time, a live traffic chart, Windows Firewall status, and a table of active apps with their incoming and outgoing traffic.",
      width: 1264,
      height: 799,
      caption: "Overview: live traffic, protection status, active apps",
      fallback: { src: "/images/projects/netuse-icon.png", alt: "NetUse app icon", caption: "v1.6.0 · portable, Windows x64" },
      gallery: [
        {
          src: "/images/projects/netuse-graph.webp",
          alt: "NetUse traffic graph: five minutes of incoming and outgoing traffic with WAN and LAN totals.",
          width: 1262,
          height: 796,
          caption: "Traffic graph",
        },
        {
          src: "/images/projects/netuse-firewall.webp",
          alt: "NetUse firewall page: a switch per application to block its traffic, with usage and status for each app.",
          width: 1262,
          height: 798,
          caption: "Per-app firewall",
        },
        {
          src: "/images/projects/netuse-speed.webp",
          alt: "NetUse speed and quality page: download, upload, latency and jitter, plus per-network connection quality.",
          width: 1265,
          height: 803,
          caption: "Speed and quality",
        },
      ],
    },
  },
  {
    slug: "secureaware",
    name: "SecureAware",
    line: "A security-awareness training platform with courses, GRC guides and an admin console.",
    stack: [
      "React", "TypeScript", "Vite", "Tailwind CSS", "Framer Motion", "React Router", "Node.js", "Express",
      "MongoDB", "Mongoose", "JWT", "bcrypt", "Helmet", "express-validator", "Multer", "Cloudinary", "Supabase", "SCORM",
    ],
    side: "build",
    year: "2025",
    links: [{ label: "Source", href: gh("ISPM") }],
    notes: [
      "Courses imported as SCORM packages: zip upload, manifest parsing, playback.",
      "Guides on GRC frameworks, ISO regulations, risk assessment and data",
      "classification, plus a password generator and policy library.",
      "Admin dashboard with user management and an audit log.",
      "Server: JWT auth with bcrypt, helmet, rate limiting, express-validator,",
      "and file uploads through multer to Cloudinary.",
    ],
    media: { kind: "diagram", diagram: "scorm", caption: "From SCORM package to tracked course" },
  },
  {
    slug: "path-traversal-ctf",
    name: "Path traversal CTF",
    line: "A five-stage web challenge that teaches path traversal by making you do it.",
    stack: ["PHP", "HTML", "CSS"],
    side: "break",
    year: "2024",
    links: [{ label: "Source", href: gh("PathTravesalCTF") }],
    notes: [
      "A deliberately vulnerable PHP app, one bypass per stage:",
      "  1. basic path traversal",
      "  2. naive filtering",
      "  3. encoding bypass",
      "  4. hidden folder access",
      "  5. final challenge",
    ],
    media: { kind: "lab", lab: "traversal", caption: "A working model of the bug, in your browser. The real CTF has five stages." },
  },
  {
    slug: "medisiem-site",
    name: "MediSIEM website",
    line: "The public site for MediSIEM, with an interactive CVSS-vs-CAS demo.",
    stack: [
      "React", "TypeScript", "Vite", "Tailwind CSS", "React Router", "Axios", "Lucide", "Node.js", "Express",
      "MongoDB", "Mongoose", "Helmet", "express-validator", "Nodemailer", "Playwright", "axe", "Vercel",
    ],
    side: "build",
    year: "2026",
    links: [
      { label: "Live site", href: "https://medi-siem-website.vercel.app" },
      { label: "Source", href: gh("MediSIEM-Website") },
    ],
    notes: [
      "Marketing site for a research-stage product, so every claim is labelled",
      "as a research-prototype finding.",
      "Typed content files, prerendered routes with per-page meta, sitemap,",
      "and Playwright smoke, form and axe accessibility tests.",
      "Backend uses helmet, express-validator and rate limiting.",
    ],
    media: {
      kind: "screenshot",
      src: "/images/projects/medisiem-site.jpg",
      alt: "MediSIEM website home page with the headline 'Security that knows which device is keeping someone alive.' over a heartbeat line.",
      width: 1440,
      height: 900,
      caption: "medi-siem-website.vercel.app",
    },
  },
  {
    slug: "des-tool",
    name: "DES tool",
    line: "DES from scratch in Python, with ECB and CBC modes and a CLI.",
    stack: ["Python", "psutil"],
    side: "break",
    year: "2025",
    links: [{ label: "Source", href: gh("DES-Tool") }],
    notes: [
      "Implements the Data Encryption Standard by hand: tables, S-boxes, rounds.",
      "ECB and CBC modes, encrypt and decrypt, timing and memory stats.",
      "Educational only. DES is broken, which is the point of studying it.",
    ],
    media: { kind: "lab", lab: "des", caption: "DES running in your browser, one Feistel round at a time" },
  },
  {
    slug: "this-site",
    name: "This site",
    line: "A hardened portfolio with a CTF inside it.",
    stack: ["Next.js", "React", "TypeScript", "three.js", "React Three Fiber", "GLSL", "GSAP", "Lenis", "Zustand", "Tailwind CSS", "Resend", "Vercel"],
    side: "both",
    views: {
      build: {
        line: "The portfolio you're reading, built to hold up to a header scan: a fresh CSP nonce on every request, no third-party scripts, no trackers.",
        media: { kind: "diagram", diagram: "nonce", caption: "One request: where the nonce comes from and what it allows" },
      },
      break: {
        line: "The same site as a target. Four flags hidden in the page, and a small boot2root in the terminal: enumerate, decode, crack a hash, escalate to root.",
        media: { kind: "diagram", diagram: "chain", caption: "The box in the terminal: guest to root in four steps" },
      },
    },
    year: "2026",
    links: [{ label: "How it's hardened", href: "/security" }],
    notes: [
      "Next.js 16 App Router, three.js through React Three Fiber, hand-written GLSL.",
      "Nonce-based CSP with strict-dynamic, HSTS, no inline scripts or styles.",
      "Contact form is a Server Action with validation, a honeypot and rate limiting.",
      "Eight flags: four around the site, four in this shell. Type: ctf",
    ],
    media: { kind: "diagram", diagram: "nonce", caption: "One request: where the nonce comes from and what it allows" },
  },
];
