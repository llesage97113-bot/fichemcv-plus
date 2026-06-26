import crypto from "node:crypto";
import { maskEmailContact } from "./contactDisplay";

export const CONTACT_VERIFICATION_TOKEN_BYTES = 32;
export const CONTACT_VERIFICATION_TOKEN_TTL_MINUTES = 30;
export const CONTACT_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;
export const CONTACT_VERIFICATION_RECENT_LIMIT_PER_HOUR = 5;

export const CONTACT_VERIFICATION_SENT_MESSAGE =
  "Un mail de vérification a été envoyé. Consulte ta boîte de réception.";
export const CONTACT_VERIFICATION_RATE_LIMIT_MESSAGE =
  "Un lien de vérification a déjà été envoyé récemment. Patiente quelques instants avant de réessayer.";
export const CONTACT_VERIFICATION_SEND_ERROR_MESSAGE =
  "Le mail de vérification n’a pas pu être envoyé pour le moment.";

export type ContactVerificationTokenStatus =
  | "valid"
  | "invalid"
  | "expired"
  | "consumed";

export type ContactVerificationRpcStatus =
  | "success"
  | "invalid"
  | "expired"
  | "consumed";

export type ContactVerificationContact = {
  id: string;
  user_id?: string | null;
  contact_type: string | null;
  contact_value: string | null;
  normalized_value: string | null;
  verified_at: string | null;
};

export type ContactVerificationTokenRow = {
  id: string;
  user_contact_id: string;
  token_hash: string;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
  user_contacts?: ContactVerificationContact | ContactVerificationContact[] | null;
};

export function generateContactVerificationToken() {
  return crypto.randomBytes(CONTACT_VERIFICATION_TOKEN_BYTES).toString("base64url");
}

export function hashContactVerificationToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function isValidContactVerificationTokenFormat(rawToken: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(rawToken);
}

export function getContactVerificationExpiresAt(now = new Date()) {
  return new Date(
    now.getTime() + CONTACT_VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000
  );
}

export function getContactVerificationCooldownStart(now = new Date()) {
  return new Date(
    now.getTime() - CONTACT_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000
  );
}

export function getContactVerificationHourStart(now = new Date()) {
  return new Date(now.getTime() - 60 * 60 * 1000);
}

export function buildRecoveryEmailVerificationUrl(rawToken: string) {
  const origin = getAppOrigin();
  const url = new URL("/verify-recovery-email", origin);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

export function getAppOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

export function buildRecoveryEmailVerificationEmail(verificationUrl: string) {
  const subject = "FicheMCV+ — Vérification de ton adresse email";
  const text = [
    "Bonjour,",
    "",
    "Une demande de vérification a été effectuée pour utiliser cette adresse comme adresse de récupération sur FicheMCV+.",
    "",
    "Clique sur le lien ci-dessous pour continuer.",
    "",
    verificationUrl,
    "",
    "Ce lien expire dans 30 minutes.",
    "",
    "Si tu n’es pas à l’origine de cette demande, tu peux ignorer ce message.",
  ].join("\n");
  const html = [
    "<p>Bonjour,</p>",
    "<p>Une demande de vérification a été effectuée pour utiliser cette adresse comme adresse de récupération sur FicheMCV+.</p>",
    "<p>Clique sur le bouton ci-dessous pour continuer.</p>",
    `<p><a href="${escapeHtml(verificationUrl)}">Vérifier mon adresse email</a></p>`,
    "<p>Ce lien expire dans 30 minutes.</p>",
    "<p>Si tu n’es pas à l’origine de cette demande, tu peux ignorer ce message.</p>",
  ].join("");

  return { subject, text, html };
}

export function maskVerificationEmailContact(contact: ContactVerificationContact) {
  return maskEmailContact(contact.contact_value || contact.normalized_value || "");
}

export function classifyContactVerificationToken(
  token: Pick<ContactVerificationTokenRow, "expires_at" | "consumed_at"> | null,
  now = new Date()
): ContactVerificationTokenStatus {
  if (!token) {
    return "invalid";
  }

  if (token.consumed_at) {
    return "consumed";
  }

  if (new Date(token.expires_at).getTime() <= now.getTime()) {
    return "expired";
  }

  return "valid";
}

export function normalizeVerificationRpcStatus(value: unknown): ContactVerificationRpcStatus {
  if (
    value === "success" ||
    value === "invalid" ||
    value === "expired" ||
    value === "consumed"
  ) {
    return value;
  }

  return "invalid";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
