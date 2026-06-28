import crypto from "node:crypto";
import { isInternalRecoveryEmail } from "./recoveryEmail";

export const PASSWORD_RESET_TOKEN_BYTES = 32;
export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;
export const PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = 60;
export const PASSWORD_RESET_RECENT_LIMIT_PER_HOUR = 5;

export type PasswordResetTokenStatus =
  | "valid"
  | "invalid"
  | "expired"
  | "consumed";

export type PasswordResetClaimStatus =
  | "success"
  | "invalid"
  | "expired"
  | "consumed";

export type PasswordResetTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

export function generatePasswordResetToken() {
  return crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");
}

export function hashPasswordResetToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function isValidPasswordResetTokenFormat(rawToken: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(rawToken);
}

export function getPasswordResetExpiresAt(now = new Date()) {
  return new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);
}

export function getPasswordResetCooldownStart(now = new Date()) {
  return new Date(now.getTime() - PASSWORD_RESET_RESEND_COOLDOWN_SECONDS * 1000);
}

export function getPasswordResetHourStart(now = new Date()) {
  return new Date(now.getTime() - 60 * 60 * 1000);
}

export function classifyPasswordResetToken(
  token: Pick<PasswordResetTokenRow, "expires_at" | "consumed_at"> | null,
  now = new Date()
): PasswordResetTokenStatus {
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

export function normalizePasswordResetRpcStatus(
  value: unknown
): PasswordResetClaimStatus {
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

export function buildPasswordResetUrl(rawToken: string) {
  const origin = getAppOrigin();
  const url = new URL("/reset-password", origin);
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

export function getNativePasswordRecoveryRedirectTo(origin: string) {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000/reset-password";
  }

  return `${origin.replace(/\/+$/, "")}/reset-password`;
}

export function shouldUseCustomRecoveryForIdentifier(identifier: string) {
  return isInternalRecoveryEmail(identifier);
}

export function buildPasswordResetEmail(resetUrl: string) {
  const subject = "FicheMCV+ — Réinitialisation de ton mot de passe";
  const text = [
    "Bonjour,",
    "",
    "Une demande de réinitialisation de mot de passe a été effectuée pour ton compte FicheMCV+.",
    "",
    "Clique sur le lien ci-dessous pour choisir un nouveau mot de passe.",
    "",
    resetUrl,
    "",
    "Ce lien expire dans 30 minutes et ne peut être utilisé qu’une seule fois.",
    "",
    "Si tu n’es pas à l’origine de cette demande, tu peux ignorer ce message.",
  ].join("\n");
  const html = [
    "<p>Bonjour,</p>",
    "<p>Une demande de réinitialisation de mot de passe a été effectuée pour ton compte FicheMCV+.</p>",
    "<p>Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>",
    `<p><a href="${escapeHtml(resetUrl)}">Réinitialiser mon mot de passe</a></p>`,
    "<p>Ce lien expire dans 30 minutes et ne peut être utilisé qu’une seule fois.</p>",
    "<p>Si tu n’es pas à l’origine de cette demande, tu peux ignorer ce message.</p>",
  ].join("");

  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
