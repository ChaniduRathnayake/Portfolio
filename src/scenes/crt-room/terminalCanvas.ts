import * as THREE from "three";
import { profile } from "@/content/profile";
import type { Mode } from "@/lib/store";

/**
 * Draws what the CRT shows onto a 2D canvas, in greyscale. The CRT shader
 * does all the colouring and dithering, so here white = lit phosphor.
 *
 * The canvas is only redrawn when the visible text changes (a typed
 * character, the cursor blinking), so it costs nothing between those moments.
 */

const W = 1024;
const H = 768;
const PAD = 56;
const CHARS_PER_SECOND = 38;
const PROMPT = `guest@${profile.handle}:~$ `;

/** A command typed at the prompt, then its output. */
type Entry = { cmd: string; out: string[] };

/** What the CRT types on each side of the site. */
const SESSIONS: Record<Mode, Entry[]> = {
  build: [
    { cmd: "whoami", out: [profile.name, "network security engineer"] },
    { cmd: "./harden --check", out: ["[ok] csp nonce   [ok] hsts", "[ok] nosniff     [ok] no trackers"] },
    { cmd: "", out: [] },
  ],
  break: [
    { cmd: "nmap -sV build-break", out: ["22/tcp   open  ssh", "443/tcp  open  https"] },
    { cmd: "./root-the-box", out: ["[*] 4 flags on the site", "[*] 4 more in the shell", "[!] press ` to start"] },
    { cmd: "", out: [] },
  ],
};

/** The glass is a click target (see CrtHotspot); say so in the words of the device in hand. */
const footer = () =>
  window.matchMedia("(pointer: coarse)").matches ? "tap this screen for a shell  ·  scroll to enter" : "click this screen for a shell  ·  scroll to enter";

export class TerminalCanvas {
  readonly texture: THREE.CanvasTexture;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private font = "monospace";
  private portrait: HTMLCanvasElement | null = null;
  private mode: Mode = "build";
  /** When typing began, in seconds; -1 until the CRT has powered on. */
  private startedAt = -1;
  private lastKey = "";

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext("2d")!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    // Greyscale data, not a colour image: no sRGB conversion.
    this.texture.colorSpace = THREE.NoColorSpace;
    this.texture.anisotropy = 4;
  }

  setFont(family: string) {
    this.font = family;
    this.lastKey = "";
  }

  setPortrait(image: HTMLImageElement) {
    this.portrait = preparePortrait(image, 288, 352);
    this.lastKey = "";
  }

  /** Switches session; once powered, types it again from the start. */
  setMode(mode: Mode, now: number) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (this.startedAt >= 0) this.startedAt = now;
    this.lastKey = "";
  }

  /**
   * Call every frame with seconds. Typing starts shortly after power-on
   * (poweredAt, -1 while off). Redraws only when something visible changed.
   */
  update(now: number, poweredAt: number) {
    if (this.startedAt < 0 && poweredAt >= 0) this.startedAt = poweredAt + 0.8;
    const elapsed = this.startedAt < 0 ? 0 : now - this.startedAt;
    const typed = Math.max(0, Math.floor(elapsed * CHARS_PER_SECOND));
    const cursorOn = Math.floor(now * 1.8) % 2 === 0;
    const key = `${Math.min(typed, 4000)}|${cursorOn}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.draw(typed, cursorOn);
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
  }

  private draw(typedChars: number, cursorOn: boolean) {
    const { ctx } = this;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "top";

    // Title bar.
    ctx.font = `500 19px ${this.font}`;
    ctx.fillStyle = "#9a9a9a";
    ctx.fillText(`tty1  ${profile.handle}@build-break`, PAD, 38);
    const tag = this.mode.toUpperCase();
    ctx.fillText(tag, W - PAD - ctx.measureText(tag).width, 38);
    ctx.fillRect(PAD, 70, W - PAD * 2, 2);

    // Portrait, left column.
    let textX = PAD;
    if (this.portrait) {
      ctx.drawImage(this.portrait, PAD, 104);
      ctx.fillStyle = "#7a7a7a";
      ctx.font = `400 15px ${this.font}`;
      ctx.fillText("portrait.jpg", PAD, 104 + 352 + 12);
      textX = PAD + 288 + 40;
    }

    // Typed session, right column.
    const maxWidth = W - PAD - textX;
    ctx.font = `400 22px ${this.font}`;
    const lineH = 36;
    let y = 108;
    let budget = typedChars;
    let cursor: { x: number; y: number } | null = null;

    for (const entry of SESSIONS[this.mode]) {
      ctx.fillStyle = "#ffffff";
      const visibleCmd = entry.cmd.slice(0, Math.max(0, budget));
      ctx.fillText(PROMPT + visibleCmd, textX, y);
      cursor = { x: textX + ctx.measureText(PROMPT + visibleCmd).width, y };
      // An empty command is the final idle prompt; stop there with the cursor.
      if (!entry.cmd || budget < entry.cmd.length) break;
      budget -= entry.cmd.length + 6; // a short pause before the output appears
      y += lineH;
      if (budget < 0) break;

      ctx.fillStyle = "#b8b8b8";
      for (const line of entry.out.flatMap((l) => wrap(ctx, l, maxWidth))) {
        ctx.fillText(line, textX, y);
        y += lineH;
      }
      y += 10;
      budget -= 10;
      cursor = null;
    }

    if (cursor && cursorOn) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cursor.x + 2, cursor.y + 1, 13, 25);
    }

    ctx.fillStyle = "#8a8a8a";
    ctx.font = `400 16px ${this.font}`;
    ctx.fillText(footer(), PAD, H - PAD - 8);
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Crops the photo to the box (cover), converts it to high-contrast greyscale
 * and darkens the edges so the face reads once the shader dithers it.
 */
function preparePortrait(image: HTMLImageElement, w: number, h: number): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;

  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  // The file is already cropped to the subject; keep the face slightly above centre.
  const sx = THREE.MathUtils.clamp(image.naturalWidth * 0.5 - sw / 2, 0, image.naturalWidth - sw);
  const sy = THREE.MathUtils.clamp(image.naturalHeight * 0.45 - sh / 2, 0, image.naturalHeight - sh);
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, w, h);

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const x = (i / 4) % w;
    const y = Math.floor(i / 4 / w);
    const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
    const dx = (x / w - 0.5) * 1.6;
    const dy = (y / h - 0.45) * 1.3;
    const vignette = THREE.MathUtils.clamp(1.25 - Math.sqrt(dx * dx + dy * dy), 0, 1);
    const v = THREE.MathUtils.clamp((lum - 0.12) / 0.72, 0, 1) ** 1.1 * vignette * 255;
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  ctx.putImageData(data, 0, 0);
  return out;
}
