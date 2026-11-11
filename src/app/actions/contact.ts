"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { profile } from "@/content/profile";
import { CONTACT_LIMITS, MESSAGE_MIN, type ContactField, type ContactState } from "@/lib/contact";

/**
 * Contact form handler. Defence in layers, cheapest first:
 *   1. honeypot field: bots that fill it get a fake success
 *   2. length and format validation on every field
 *   3. per-IP rate limit (in memory: best effort, per server instance)
 *   4. Cloudflare Turnstile, when configured
 * Next.js already rejects Server Action calls whose Origin doesn't match the host.
 * The message goes out as plain text, never HTML, with the visitor as reply-to.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const recent = new Map<string, number[]>();

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > MAX_PER_WINDOW;
}

async function passesTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Not configured: skip the check.
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    });
    const result = (await res.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}

export async function sendMessage(_previous: ContactState, formData: FormData): Promise<ContactState> {
  const values: Record<ContactField, string> = {
    // Collapse whitespace in the name so it can't smuggle line breaks into the subject.
    name: field(formData, "name").replace(/\s+/g, " "),
    email: field(formData, "email"),
    message: field(formData, "message"),
  };

  if (field(formData, "company")) {
    return { status: "sent", message: "Sent. I'll reply to the address you gave." };
  }

  const fieldErrors: ContactState["fieldErrors"] = {};
  if (!values.name) fieldErrors.name = "Tell me who you are.";
  if (!EMAIL.test(values.email)) fieldErrors.email = "That email address doesn't look right.";
  if (values.message.length < MESSAGE_MIN) fieldErrors.message = `A little more detail, please (${MESSAGE_MIN} characters minimum).`;
  for (const key of Object.keys(CONTACT_LIMITS) as ContactField[]) {
    if (values[key].length > CONTACT_LIMITS[key]) fieldErrors[key] = `Keep this under ${CONTACT_LIMITS[key]} characters.`;
  }
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Check the highlighted fields.", fieldErrors, values };
  }

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return { status: "error", message: "That's a few messages in a short time. Try again in ten minutes.", values };
  }
  if (!(await passesTurnstile(field(formData, "cf-turnstile-response"), ip))) {
    return { status: "error", message: "The bot check didn't pass. Try again.", values };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    return {
      status: "error",
      message: `The form isn't connected yet. Email me directly at ${profile.links.email}.`,
      values,
    };
  }

  const { error } = await new Resend(apiKey).emails.send({
    from: process.env.CONTACT_FROM_EMAIL || "Portfolio <onboarding@resend.dev>",
    to,
    replyTo: values.email,
    subject: `Portfolio message from ${values.name}`,
    text: `${values.message}\n\n--\n${values.name} <${values.email}>`,
  });
  if (error) {
    return { status: "error", message: `Couldn't send just now. Email me at ${profile.links.email} instead.`, values };
  }
  return { status: "sent", message: "Sent. I'll reply to the address you gave." };
}
