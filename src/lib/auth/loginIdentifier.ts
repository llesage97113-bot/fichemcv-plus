export const INTERNAL_LOGIN_DOMAIN = "fichemcv.local";

export function normalizeLoginIdentifier(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized.includes("@")) {
    return normalized;
  }

  return `${normalized}@${INTERNAL_LOGIN_DOMAIN}`;
}

export function normalizeShortLoginIdentifier(value: string) {
  const normalized = value.trim().toLowerCase();
  const suffix = `@${INTERNAL_LOGIN_DOMAIN}`;

  if (!normalized) {
    return "";
  }

  return normalized.endsWith(suffix)
    ? normalized.slice(0, -suffix.length)
    : normalized;
}

export function getShortLoginIdentifier(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  const suffix = `@${INTERNAL_LOGIN_DOMAIN}`;

  if (!normalized.endsWith(suffix)) {
    return normalized;
  }

  return normalized.slice(0, -suffix.length);
}
