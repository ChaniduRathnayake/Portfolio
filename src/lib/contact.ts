/** Shared between the contact form (client) and its Server Action. */

export type ContactField = "name" | "email" | "message";

export interface ContactState {
  status: "idle" | "sent" | "error";
  message: string;
  fieldErrors?: Partial<Record<ContactField, string>>;
  /** Echoed back on error so nothing the visitor typed is lost. */
  values?: Record<ContactField, string>;
}

export const INITIAL_CONTACT_STATE: ContactState = { status: "idle", message: "" };

export const CONTACT_LIMITS: Record<ContactField, number> = { name: 100, email: 254, message: 4000 };

export const MESSAGE_MIN = 10;
