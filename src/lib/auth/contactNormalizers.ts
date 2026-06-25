export function normalizeContactEmail(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    throw new Error("Adresse email vide.");
  }

  if (normalized.length > 254) {
    throw new Error("Adresse email trop longue.");
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalized)) {
    throw new Error("Adresse email invalide.");
  }

  return normalized;
}

export function normalizeFrenchPhoneNumber(value: string) {
  const compact = value.trim().replace(/[\s().-]+/g, "");

  if (!compact) {
    throw new Error("Numéro de téléphone vide.");
  }

  if (/^0(590|690|691)\d{6}$/.test(compact)) {
    return `+590${compact.slice(1)}`;
  }

  if (/^\+590(590|690|691)\d{6}$/.test(compact)) {
    return compact;
  }

  if (/^00590(590|690|691)\d{6}$/.test(compact)) {
    return `+590${compact.slice(5)}`;
  }

  if (/^069[2-9]\d{6}$/.test(compact)) {
    throw new Error("Numéro de téléphone invalide ou ambigu.");
  }

  if (/^0[67]\d{8}$/.test(compact)) {
    return `+33${compact.slice(1)}`;
  }

  if (/^\+33[67]\d{8}$/.test(compact)) {
    return compact;
  }

  if (/^0033[67]\d{8}$/.test(compact)) {
    return `+33${compact.slice(4)}`;
  }

  throw new Error("Numéro de téléphone invalide ou ambigu.");
}
