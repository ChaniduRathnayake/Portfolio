"use client";

import { useActionState, useEffect } from "react";
import Script from "next/script";
import { sendMessage } from "@/app/actions/contact";
import { CONTACT_LIMITS, INITIAL_CONTACT_STATE, MESSAGE_MIN, type ContactField } from "@/lib/contact";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: { reset: (widget?: string) => void };
  }
}

const FIELDS: { name: ContactField; label: string; type: "text" | "email" | "textarea"; autoComplete: string }[] = [
  { name: "name", label: "Name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "message", label: "Message", type: "textarea", autoComplete: "off" },
];

/**
 * Contact form. Works without JavaScript too: the Server Action runs as a
 * plain form POST and the page re-renders with the result.
 */
export function ContactForm({ nonce }: { nonce?: string }) {
  // React resets the form after each submission, back to `defaultValue`: on
  // error that's the echoed values (nothing lost), after a send it's empty.
  const [state, formAction, pending] = useActionState(sendMessage, INITIAL_CONTACT_STATE);

  // Turnstile tokens are single-use: get a fresh one after every attempt.
  useEffect(() => {
    if (state.status !== "idle") window.turnstile?.reset();
  }, [state]);

  return (
    <form action={formAction} className="contact-form" noValidate>
      {FIELDS.map((f) => {
        const error = state.fieldErrors?.[f.name];
        const common = {
          id: `contact-${f.name}`,
          name: f.name,
          autoComplete: f.autoComplete,
          defaultValue: state.values?.[f.name] ?? "",
          required: true,
          maxLength: CONTACT_LIMITS[f.name],
          "aria-invalid": error ? true : undefined,
          "aria-describedby": error ? `contact-${f.name}-error` : undefined,
        };
        return (
          <div key={f.name} className="field">
            <label htmlFor={common.id}>{f.label}</label>
            {f.type === "textarea" ? (
              <textarea {...common} rows={6} minLength={MESSAGE_MIN} />
            ) : (
              <input {...common} type={f.type} />
            )}
            {error && (
              <p id={`contact-${f.name}-error`} className="field-error">
                {error}
              </p>
            )}
          </div>
        );
      })}

      {/* Honeypot: hidden from people and assistive tech, irresistible to bots. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="contact-company">Company</label>
        <input id="contact-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {TURNSTILE_SITE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" nonce={nonce} />
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-theme="dark" />
        </>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </button>
        <p role="status" aria-live="polite" className={`form-status ${state.status === "error" ? "is-error" : ""}`}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
