# Build / Break

Portfolio of Chanidu Rathnayake. *I build secure networks. Then I try to break them.*

One continuous, scroll-driven camera move through real-time three.js scenes,
and a site with two sides. **BUILD** shows the defensive work (firewalls, NAC,
the tools I've written). **BREAK** turns the page red and shows the offensive
work (bug bounty, CTFs, things to attack). Flip between them from the
headline, the header switch, or `mode break` in the terminal.

Things a visitor can do, not just read:

- **The terminal** (press `` ` ``, or click the 3D monitor): a shell over the
  whole site, with a boot2root box to play.
- **Path traversal lab** and **DES lab** (BREAK, Work): working models that run
  in the browser.
- **"Attack this page"** (BUILD, Security): the page tries six injection
  tricks on itself and reports what the browser's CSP blocked.
- **"What you just told me"** (BREAK, Security): the visitor's IP address and
  rough location (from the request, via `src/lib/visitor.ts`) and what their
  browser gave away, down to a fingerprint. Shown back to them and not kept.
  Location needs Vercel's geo headers, so it only appears once deployed there.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the build (needed to test the strict CSP)
npm run lint
```

Node 20+ (developed on Node 24).

## Edit the content

Everything the site says comes from two files. The HTML sections, the terminal
and the CRT screen all read from them.

| File | What's in it |
|---|---|
| `src/content/profile.ts` | name, role, links, about, the per-side headings and intros (`modeCopy`), skills (`nmap skills`), experience (`git log`), education, certifications |
| `src/content/projects.ts` | projects (`ls projects`, `open <slug>`, the Work section) |

Each skill group has a `track`, each certification a `track`, each project a
`side`. That is what decides whether it shows on BUILD, BREAK, or both.

Values in `[SQUARE BRACKETS]` are placeholders still waiting for real info.

**Photo:** `public/images/portrait.jpg` (a 4:5 crop). It appears dithered on
the CRT and tinted in the About section, in full colour on hover. Both skip it
if the file is missing.

**Project screenshots** live in `public/images/projects/`. Each project's
`media` entry in `projects.ts` names its files; anything missing is skipped
(NetUse falls back to its icon). NetUse uses `netuse.webp` (Overview),
`netuse-graph.webp`, `netuse-firewall.webp` and `netuse-speed.webp`.
Don't publish screens that show MAC addresses, hostnames, local IPs or
browsing history (NetUse's System, Alerts, Network, Usage and Routing pages).

**Resume:** put a *redacted* copy (no ID number, birth date, address, phone or
references' contact details) at `public/resume.pdf`, then set `links.resume`
in `profile.ts`. `.gitignore` blocks files named like `*CV*.pdf` so the full CV
doesn't get committed by accident.

## Contact form

Works out of the box in "not connected" mode: it validates, then tells
visitors to email you directly. To deliver messages, copy `.env.example` to
`.env.local` (and to your Vercel project settings) and fill in:

- `RESEND_API_KEY`, `CONTACT_TO_EMAIL`: required to send.
- `CONTACT_FROM_EMAIL`: a sender on a domain you've verified in Resend.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`: optional
  Cloudflare bot check. Setting the site key also opens the CSP to
  `challenges.cloudflare.com`; rebuild after changing it.

Defences in order: honeypot field, validation, per-IP rate limit (3 per 10
minutes, in memory), Turnstile, and Next.js's own Origin check on Server
Actions. Messages are sent as plain text with the visitor as reply-to.

## Folder structure

```
src/
├── app/                     Next.js App Router
│   ├── layout.tsx           fonts, pre-paint script (nonce'd), header, footer, terminal
│   ├── page.tsx             the scroll: one <section data-scene> per scene
│   ├── security/page.tsx    "a hardened site, as proof"
│   ├── not-found.tsx        404
│   ├── actions/contact.ts   contact form Server Action
│   └── globals.css          design tokens (single source of colour), UI primitives
├── proxy.ts                 per-request CSP nonce (Next 16 "proxy", ex-middleware)
│
├── content/                 what the site says (edit these)
│   ├── profile.ts
│   └── projects.ts
│
├── components/              HTML / React UI
│   ├── providers/           AppProviders: Lenis + GSAP ticker, env detection
│   ├── home/                BootSequence, StageLoader (lazy WebGL), SceneTimeline (scroll → camera),
│   │                        ModeControls (headline switch), CrtHotspot (click the 3D monitor), CtfInvite
│   ├── labs/                TraversalLab, DesLab, PolicyTest, Recon
│   ├── contact/             ContactForm (useActionState)
│   ├── terminal/            Terminal (UI), commands (the shell), filesystem (files + permissions),
│   │                        box (the CTF's files, hints, wordlist), types
│   └── ui/                  SiteHeader, MobileMenu, SiteFooter, ByMode (BUILD/BREAK switch in CSS),
│                            TechLogo, ProjectDiagram, ShotViewer (screenshot viewer), InView, CspImage
│
├── scenes/                  three.js / react-three-fiber
│   ├── Stage.tsx            the canvas, quality tiers, world setup
│   ├── CameraRig.tsx        one camera along one spline; reduced-motion still shots
│   ├── crt-room/            scene 1: monitor, screen, desk props, dust, sticky note
│   ├── code-tunnel/         scene 2: code blocks around the path
│   └── network/             scenes 3 to 5: the network graph
│
├── shaders/                 GLSL and post-processing
│   ├── pixelDissolve.ts     THE dissolve: Bayer 8×8 + noise, stepped cell size (commented)
│   ├── crtScreen.ts         phosphor tube: curvature, dither, scanlines, power-on, dissolve
│   ├── fullFrameDither.ts   full-frame pass: crossing, BUILD/BREAK, press ripple, grain, vignette
│   ├── PixelDissolveEffect.ts
│   └── PostFX.tsx           bloom → dither pass; owns the BUILD/BREAK blend
│
└── lib/                     shared logic, no UI
    ├── scenes.ts            scene order and labels
    ├── spline.ts            camera keyframes, CatmullRomCurve3, per-scene easing
    ├── telemetry.ts         per-frame values shared by DOM and WebGL (not React state)
    ├── store.ts             Zustand: mode, palette, scene, terminal, flags
    ├── modeSwitch.ts        flips BUILD/BREAK and keeps your place in the page
    ├── theme.ts             CSS tokens → three.js colours
    ├── scroll.ts            Lenis access (scrollTo, jump, pause)
    ├── ctf.ts               flag hashes and checking
    ├── des.ts               DES with a round-by-round trace, for the lab
    ├── random.ts            seeded PRNG for stable layouts
    ├── contact.ts           contact form state and limits
    └── security/            csp.ts (shared by proxy and /security), headers.ts (header list shown on the site)
```

## How it fits together

- **Scroll → camera.** `SceneTimeline` turns scroll position into a timeline
  value from 0 to 6 using the real section offsets, so the HTML describing a
  scene is always on screen with that scene. `CameraRig` damps toward it and
  samples the spline.
- **The dissolve.** The CRT glass dissolves cell by cell as the camera gets
  within 1.25 units, then a full-frame burst plays as the camera passes
  through. Both use `shaders/pixelDissolve.ts`.
- **BUILD / BREAK.** Content that differs between the two sides is rendered
  for both and shown by `html[data-mode]` in CSS (`ByMode`), so the right side
  is on screen before any JavaScript runs and a repeat visit never flashes.
  Flipping redraws the page in stepped rows (View Transitions) and keeps you
  at the same point in the same section, so the camera doesn't jump. WebGL
  eases `telemetry.modeBlend`; the post pass adds chromatic split, tearing and
  red halftone.
- **Accessibility.** All copy is HTML. The canvas is `aria-hidden`. Reduced
  motion gets native scroll, no boot screen, and a still shot per scene with
  fades. No WebGL2 means no canvas, with the full content still there.

## Security

See `/security` on the running site. In short: nonce-based CSP with
`strict-dynamic`, HSTS (2 years, preload-ready), nosniff, strict referrer,
locked-down Permissions-Policy, no framing, COOP/CORP, no third-party
scripts or fonts, `/.well-known/security.txt`.

Before going live: replace `[YOUR-DOMAIN]` in `public/.well-known/security.txt`,
and only submit the domain to the HSTS preload list once every subdomain
serves HTTPS.

## The CTF

Eight `FLAG{...}` flags in two tracks. Progress is kept in localStorage.

**Around the site (4):** page source, console, response headers, and somewhere
in the 3D room. Submit them in the terminal with `submit FLAG{...}`.

**The box (4):** a small boot2root inside the terminal. You start as `guest`
and finish by reading `/root/root.txt`. Type `ctf` for the scoreboard and
`hint` (then `hint more`) when stuck. The chain, for whoever maintains this:

1. `ls -la /opt/backup` finds a hidden `.snapshot` directory (flag).
2. `cat creds.b64 | base64 -d | rot13` (flag, and a pointer to `/etc/shadow`).
3. `john /etc/shadow` cracks the hash against a wordlist, for real, with
   SHA-256. `su chanidu`, then `cat ~/user.txt` (flag).
4. `sudo -l` shows `(root) NOPASSWD: /usr/bin/cat /var/log/*`. The `*`
   matches `../`, so `sudo cat /var/log/../../root/root.txt` (flag).

Flags printed in the terminal are captured automatically. The box's files live
in `src/components/terminal/box.ts`; the flag text there is XOR-ed so it
doesn't show up in a search of the bundle, and all eight flags are verified
against the SHA-256 hashes in `src/lib/ctf.ts`.
