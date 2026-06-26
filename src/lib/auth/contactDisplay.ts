export type ContactDisplayType = "email" | "phone" | string | null;

export function maskEmailContact(value: string | null | undefined) {
  const email = String(value ?? "").trim();
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return maskShortValue(email);
  }

  const visibleStart = localPart.slice(0, Math.min(2, localPart.length));
  const visibleEnd = localPart.length > 4 ? localPart.slice(-1) : "";

  return `${visibleStart}${"•".repeat(5)}${visibleEnd}@${domain}`;
}

export function maskPhoneContact(value: string | null | undefined) {
  const rawValue = String(value ?? "").trim();
  const digits = rawValue.replace(/\D/g, "");

  if (digits.length < 4) {
    return maskShortValue(rawValue);
  }

  const ending = digits.slice(-2);
  const prefix = digits.length >= 10 ? digits.slice(0, 2) : digits.slice(0, 1);

  return `${prefix} •• •• •• ${ending}`;
}

export function maskContactValue(
  value: string | null | undefined,
  contactType: ContactDisplayType
) {
  if (contactType === "email") {
    return maskEmailContact(value);
  }

  if (contactType === "phone") {
    return maskPhoneContact(value);
  }

  return maskShortValue(String(value ?? "").trim());
}

function maskShortValue(value: string) {
  if (!value) {
    return "Non renseigné";
  }

  if (value.length <= 2) {
    return "••";
  }

  return `${value.slice(0, 1)}${"•".repeat(Math.min(5, value.length - 1))}`;
}
