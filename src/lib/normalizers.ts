export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeRegistrationCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "");
}

export function normalizePersonName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeIdentifierPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}
