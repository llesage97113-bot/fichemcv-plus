export const PASSWORD_RECOVERY_NEUTRAL_MESSAGE =
  "Si un compte correspond à cette adresse, un message de réinitialisation va être envoyé.";

export const PASSWORD_RECOVERY_SUCCESS_MESSAGE =
  "Ton mot de passe a été modifié. Tu peux maintenant te reconnecter.";

export const PASSWORD_MIN_LENGTH = 8;

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isLegacyLocalEmail(value: string) {
  return value.trim().toLowerCase().endsWith("@fichemcv.local");
}

export function validateNewPassword(
  newPassword: string,
  confirmPassword: string
) {
  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }

  if (newPassword !== confirmPassword) {
    return "Les deux mots de passe ne correspondent pas.";
  }

  return null;
}

export function getSafePasswordRecoveryNextPath(value: string | null) {
  if (!value) {
    return "/reset-password";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/reset-password";
  }

  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) {
    return "/reset-password";
  }

  try {
    const parsed = new URL(value, "http://fichemcv.local");

    if (parsed.origin !== "http://fichemcv.local") {
      return "/reset-password";
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/reset-password";
  }
}
