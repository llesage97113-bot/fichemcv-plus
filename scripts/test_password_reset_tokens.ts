import {
  PASSWORD_RESET_RECENT_LIMIT_PER_HOUR,
  PASSWORD_RESET_RESEND_COOLDOWN_SECONDS,
  PASSWORD_RESET_TOKEN_BYTES,
  PASSWORD_RESET_TOKEN_TTL_MINUTES,
  buildPasswordResetEmail,
  buildPasswordResetUrl,
  classifyPasswordResetToken,
  generatePasswordResetToken,
  getPasswordResetCooldownStart,
  getPasswordResetExpiresAt,
  getPasswordResetHourStart,
  hashPasswordResetToken,
  isValidPasswordResetTokenFormat,
  normalizePasswordResetRpcStatus,
  shouldUseCustomRecoveryForIdentifier,
} from "../src/lib/auth/passwordResetTokens";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  assert(
    actual === expected,
    `${message}. Attendu: ${String(expected)}. Recu: ${String(actual)}.`
  );
}

const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
process.env.NEXT_PUBLIC_APP_URL = "https://app.example.test/";

const token = generatePasswordResetToken();
const tokenHash = hashPasswordResetToken(token);
const now = new Date("2026-06-26T12:00:00.000Z");

assertEquals(PASSWORD_RESET_TOKEN_BYTES, 32, "Le jeton doit utiliser 32 octets.");
assertEquals(PASSWORD_RESET_TOKEN_TTL_MINUTES, 30, "Le TTL doit etre de 30 minutes.");
assertEquals(
  PASSWORD_RESET_RESEND_COOLDOWN_SECONDS,
  60,
  "Le delai minimal doit etre de 60 secondes."
);
assertEquals(
  PASSWORD_RESET_RECENT_LIMIT_PER_HOUR,
  5,
  "La limite horaire doit etre de 5 demandes."
);
assert(isValidPasswordResetTokenFormat(token), "Le jeton doit etre au format base64url attendu.");
assertEquals(token.length, 43, "Un jeton de 32 octets base64url sans padding doit faire 43 caracteres.");
assert(tokenHash !== token, "Le hash stocke doit etre different du jeton brut.");
assertEquals(tokenHash.length, 64, "Le hash SHA-256 hex doit faire 64 caracteres.");
assert(
  /^[a-f0-9]{64}$/.test(tokenHash),
  "Le hash SHA-256 doit etre encode en hexadecimal minuscule."
);

assertEquals(
  getPasswordResetExpiresAt(now).toISOString(),
  "2026-06-26T12:30:00.000Z",
  "L'expiration doit etre calculee a 30 minutes."
);
assertEquals(
  getPasswordResetCooldownStart(now).toISOString(),
  "2026-06-26T11:59:00.000Z",
  "Le cooldown doit regarder 60 secondes en arriere."
);
assertEquals(
  getPasswordResetHourStart(now).toISOString(),
  "2026-06-26T11:00:00.000Z",
  "La limite horaire doit regarder une heure en arriere."
);

assertEquals(classifyPasswordResetToken(null, now), "invalid", "Un jeton absent est invalide.");
assertEquals(
  classifyPasswordResetToken(
    { expires_at: "2026-06-26T12:30:00.000Z", consumed_at: null },
    now
  ),
  "valid",
  "Un jeton actif doit etre valide."
);
assertEquals(
  classifyPasswordResetToken(
    { expires_at: "2026-06-26T11:59:59.000Z", consumed_at: null },
    now
  ),
  "expired",
  "Un jeton expire doit etre classe expire."
);
assertEquals(
  classifyPasswordResetToken(
    { expires_at: "2026-06-26T12:30:00.000Z", consumed_at: "2026-06-26T12:01:00.000Z" },
    now
  ),
  "consumed",
  "Un jeton consomme doit etre classe consomme."
);

assert(shouldUseCustomRecoveryForIdentifier("prenom.nom@fichemcv.local"), "Un identifiant interne doit utiliser le parcours personnalise.");
assert(
  !shouldUseCustomRecoveryForIdentifier("personne@example.test"),
  "Une adresse Auth reelle doit conserver le parcours natif."
);

const resetUrl = buildPasswordResetUrl(token);
assert(
  resetUrl.startsWith("https://app.example.test/reset-password?token="),
  "Le lien doit pointer vers /reset-password avec un token."
);
assert(!resetUrl.includes("user_id"), "Le lien ne doit pas contenir user_id.");
assert(!resetUrl.includes("fichemcv.local"), "Le lien ne doit pas contenir l'identifiant interne.");
assert(resetUrl.includes(encodeURIComponent(token)), "Le lien doit contenir le jeton brut.");

const email = buildPasswordResetEmail(resetUrl);
assert(email.subject.includes("FicheMCV+"), "L'objet doit identifier FicheMCV+.");
assert(email.text.includes("30 minutes"), "Le texte doit mentionner l'expiration.");
assert(email.text.includes("une seule fois"), "Le texte doit mentionner l'usage unique.");
assert(email.text.includes(resetUrl), "Le texte doit inclure le lien de reset.");
assert(!email.text.includes("user_id"), "Le mail ne doit pas inclure d'UUID utilisateur.");
assert(!email.html?.includes("user_id"), "Le HTML ne doit pas inclure d'UUID utilisateur.");

assertEquals(normalizePasswordResetRpcStatus("success"), "success", "Le statut success doit passer.");
assertEquals(normalizePasswordResetRpcStatus("expired"), "expired", "Le statut expired doit passer.");
assertEquals(normalizePasswordResetRpcStatus("unexpected"), "invalid", "Un statut inconnu doit devenir invalid.");

if (previousAppUrl === undefined) {
  delete process.env.NEXT_PUBLIC_APP_URL;
} else {
  process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
}

console.log("Password reset token tests passed.");
