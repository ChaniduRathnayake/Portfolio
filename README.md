# Build / Break

Portfolio of Chanidu Rathnayake. *I build software. Then I try to break it.*

One continuous, scroll-driven camera move through real-time three.js scenes, a
working terminal you can drive the whole site from, a four-flag CTF, and
security headers that hold up to a scan.

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
| `src/content/profile.ts` | name, role, links, about, skills (`nmap skills`), experience (`git log`), education, certifications |
| `src/content/projects.ts` | projects (`ls projects`, `open <slug>`, the Work section) |

Values in `[SQUARE BRACKETS]` are placeholders still waiting for real info.

**Photo:** save it as `public/images/portrait.jpg`. It appears dithered on the
CRT and as a tinted photo in the contact section. Both skip it if the file is missing.

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
│   ├── layout.tsx           fonts, pre-paint script (nonce'd), header, terminal
│   ├── page.tsx             the scroll: one <section data-scene> per scene
│   ├── security/page.tsx    "a hardened site, as proof"
│   └── globals.css          design tokens (single source of colour), UI primitives
├── proxy.ts                 per-request CSP nonce (Next 16 "proxy", ex-middleware)
│
├── content/                 what the site says (edit these)
│   ├── profile.ts
│   └── projects.ts
│
├── components/              HTML / React UI
│   ├── providers/           AppProviders: Lenis + GSAP ticker, env detection
│   ├── home/                BootSequence, StageLoader (lazy WebGL), SceneTimeline (scroll → camera), CtfInvite
│   ├── contact/             ContactForm (useActionState + Server Action in app/actions/contact.ts)
│   ├── terminal/            Terminal overlay, commands, virtual filesystem
│   └── ui/                  SiteHeader, SectionNav, MobileMenu, SiteFooter, SocialLinks, TechLogo, CspImage
│
├── scenes/                  three.js / react-three-fiber
│   ├── Stage.tsx            the canvas, quality tiers, world setup
│   ├── CameraRig.tsx        one camera along one spline; reduced-motion still shots
│   ├── crt-room/            scene 1: monitor, screen, desk props, dust, sticky note
│   └── code-tunnel/         scene 2: code blocks around the path
│
├── shaders/                 GLSL and post-processing
│   ├── pixelDissolve.ts     THE dissolve: Bayer 8×8 + noise, stepped cell size (commented)
│   ├── crtScreen.ts         phosphor tube: curvature, dither, scanlines, power-on, dissolve
│   ├── fullFrameDither.ts   full-frame pass: crossing, BUILD/BREAK, grain, vignette
│   ├── PixelDissolveEffect.ts
│   └── PostFX.tsx           bloom → dither pass; owns the BUILD/BREAK blend
│
└── lib/                     shared logic, no UI
    ├── scenes.ts            scene order and labels
    ├── spline.ts            camera keyframes, CatmullRomCurve3, per-scene easing
    ├── telemetry.ts         per-frame values shared by DOM and WebGL (not React state)
    ├── store.ts             Zustand: mode, palette, scene, terminal, flags
    ├── theme.ts             CSS tokens → three.js colours
    ├── scroll.ts            Lenis access (scrollTo, pause)
    ├── ctf.ts               flag hashes and checking
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
- **BUILD / BREAK.** The store sets `html[data-mode]`; CSS swaps the accent,
  WebGL eases `telemetry.modeBlend` and the post pass adds chromatic split,
  tearing and red halftone.
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

Four `FLAG{...}` flags: page source, console, response headers, and somewhere
in the 3D room. Submit them in the terminal (press `` ` ``) with `submit`.
