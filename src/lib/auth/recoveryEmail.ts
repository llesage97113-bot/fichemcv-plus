import { normalizeContactEmail } from "./contactNormalizers";

export const RECOVERY_EMAIL_SUCCESS_MESSAGE =
  "Ton adresse email de récupération a été enregistrée. Elle devra maintenant être vérifiée.";
export const RECOVERY_EMAIL_INVALID_MESSAGE = "Saisis une adresse email valide.";
export const RECOVERY_EMAIL_MISMATCH_MESSAGE =
  "Les deux adresses email ne correspondent pas.";
export const RECOVERY_EMAIL_INTERNAL_MESSAGE =
  "Cette adresse ne peut pas être utilisée comme adresse de récupération.";
export const RECOVERY_EMAIL_ALREADY_REGISTERED_MESSAGE =
  "Cette adresse email est déjà enregistrée sur ton compte.";
export const RECOVERY_EMAIL_CONFLICT_MESSAGE =
  "Cette adresse email ne peut pas être utilisée pour ce compte.";
export const RECOVERY_EMAIL_GENERIC_ERROR_MESSAGE =
  "L’adresse email n’a pas pu être enregistrée pour le moment.";

export type RecoveryEmailErrorCode =
  | "invalid"
  | "mismatch"
  | "internal"
  | "already_registered"
  | "conflict"
  | "unauthorized"
  | "account_missing"
  | "account_disabled"
  | "generic";

export type RecoveryEmailValidationResult =
  | { ok: true; email: string }
  | { ok: false; code: RecoveryEmailErrorCode; message: string };

export type RecoveryEmailContact = {
  id: string;
  user_id: string;
  contact_type: string | null;
  contact_value: string | null;
  normalized_value: string | null;
  is_primary: boolean | null;
  verified_at: string | null;
};

export type RecoveryEmailAppUser = {
  id: string;
  is_active: boolean | null;
  account_status: string | null;
};

export type RecoveryEmailClient = {
  from(table: string): {
    select(columns: string): RecoveryEmailQuery;
    insert(values: unknown): RecoveryEmailQuery;
    update(values: unknown): RecoveryEmailQuery;
  };
};

export type RecoveryEmailQuery = {
  eq(column: string, value: unknown): RecoveryEmailQuery;
  neq(column: string, value: unknown): RecoveryEmailQuery;
  maybeSingle(): Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  then<TResult1 = { data: unknown; error: { message?: string; code?: string } | null }, TResult2 = never>(
    onfulfilled?:
      | ((
          value: { data: unknown; error: { message?: string; code?: string } | null }
        ) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2>;
};

export function normalizeRecoveryEmail(value: string) {
  return normalizeContactEmail(value);
}

export function isInternalRecoveryEmail(normalizedEmail: string) {
  const domain = normalizedEmail.split("@")[1]?.toLowerCase() ?? "";

  return (
    domain === "fichemcv.local" ||
    domain === "fichemcv.test" ||
    domain === "fichemcv.internal" ||
    domain === "local.fichemcv" ||
    domain.endsWith(".fichemcv.local") ||
    domain.endsWith(".fichemcv.internal")
  );
}

export function validateRecoveryEmail(value: string): RecoveryEmailValidationResult {
  try {
    const email = normalizeRecoveryEmail(value);

    if (isInternalRecoveryEmail(email)) {
      return { ok: false, code: "internal", message: RECOVERY_EMAIL_INTERNAL_MESSAGE };
    }

    return { ok: true, email };
  } catch {
    return { ok: false, code: "invalid", message: RECOVERY_EMAIL_INVALID_MESSAGE };
  }
}

export function compareRecoveryEmails(
  email: string,
  confirmEmail: string
): RecoveryEmailValidationResult {
  const emailValidation = validateRecoveryEmail(email);
  const confirmValidation = validateRecoveryEmail(confirmEmail);

  if (!emailValidation.ok || !confirmValidation.ok) {
    return !emailValidation.ok ? emailValidation : confirmValidation;
  }

  if (emailValidation.email !== confirmValidation.email) {
    return {
      ok: false,
      code: "mismatch",
      message: RECOVERY_EMAIL_MISMATCH_MESSAGE,
    };
  }

  return { ok: true, email: emailValidation.email };
}

export function canAddRecoveryContact(appUser: RecoveryEmailAppUser) {
  if (appUser.is_active === false) {
    return false;
  }

  return !["disabled", "suspended"].includes(String(appUser.account_status ?? ""));
}

export async function saveRecoveryEmailForUser(
  client: RecoveryEmailClient,
  authUserId: string,
  normalizedEmail: string
): Promise<{ ok: true; message: string } | { ok: false; code: RecoveryEmailErrorCode; message: string }> {
  const { data: appUserData, error: appUserError } = await client
    .from("app_users")
    .select("id, is_active, account_status")
    .eq("id", authUserId)
    .maybeSingle();

  if (appUserError) {
    return { ok: false, code: "generic", message: RECOVERY_EMAIL_GENERIC_ERROR_MESSAGE };
  }

  const appUser = (appUserData ?? null) as RecoveryEmailAppUser | null;

  if (!appUser) {
    return { ok: false, code: "account_missing", message: RECOVERY_EMAIL_GENERIC_ERROR_MESSAGE };
  }

  if (!canAddRecoveryContact(appUser)) {
    return { ok: false, code: "account_disabled", message: RECOVERY_EMAIL_GENERIC_ERROR_MESSAGE };
  }

  const { data: duplicateData, error: duplicateError } = await client
    .from("user_contacts")
    .select("id, user_id, contact_type, contact_value, normalized_value, is_primary, verified_at")
    .eq("contact_type", "email")
    .eq("normalized_value", normalizedEmail)
    .maybeSingle();

  if (duplicateError) {
    return { ok: false, code: "generic", message: RECOVERY_EMAIL_GENERIC_ERROR_MESSAGE };
  }

  const duplicate = (duplicateData ?? null) as RecoveryEmailContact | null;

  if (duplicate?.user_id === authUserId) {
    return {
      ok: false,
      code: "already_registered",
      message: RECOVERY_EMAIL_ALREADY_REGISTERED_MESSAGE,
    };
  }

  if (duplicate) {
    return {
      ok: false,
      code: "conflict",
      message: RECOVERY_EMAIL_CONFLICT_MESSAGE,
    };
  }

  const { data: contactsData, error: contactsError } = await client
    .from("user_contacts")
    .select("id, user_id, contact_type, contact_value, normalized_value, is_primary, verified_at")
    .eq("user_id", authUserId)
    .eq("contact_type", "email");

  if (contactsError) {
    return { ok: false, code: "generic", message: RECOVERY_EMAIL_GENERIC_ERROR_MESSAGE };
  }

  const contacts = (Array.isArray(contactsData) ? contactsData : []) as RecoveryEmailContact[];
  const verifiedContacts = contacts.filter((contact) => Boolean(contact.verified_at));
  const unverifiedContacts = contacts.filter((contact) => !contact.verified_at);
  const hasPrimaryEmail = contacts.some((contact) => Boolean(contact.is_primary));

  if (unverifiedContacts.length > 0 && verifiedContacts.length > 0) {
    return {
      ok: false,
      code: "conflict",
      message: RECOVERY_EMAIL_CONFLICT_MESSAGE,
    };
  }

  if (unverifiedContacts.length > 0) {
    const [contactToReplace] = unverifiedContacts;
    const { error: updateError } = await client
      .from("user_contacts")
      .update({
        contact_value: normalizedEmail,
        normalized_value: normalizedEmail,
        verified_at: null,
        is_primary: !hasPrimaryEmail || Boolean(contactToReplace.is_primary),
      })
      .eq("id", contactToReplace.id)
      .eq("user_id", authUserId);

    if (updateError) {
      return { ok: false, code: "generic", message: RECOVERY_EMAIL_GENERIC_ERROR_MESSAGE };
    }

    return { ok: true, message: RECOVERY_EMAIL_SUCCESS_MESSAGE };
  }

  const { error: insertError } = await client.from("user_contacts").insert({
    user_id: authUserId,
    contact_type: "email",
    contact_value: normalizedEmail,
    normalized_value: normalizedEmail,
    verified_at: null,
    is_primary: !hasPrimaryEmail,
  });

  if (insertError) {
    return { ok: false, code: "generic", message: RECOVERY_EMAIL_GENERIC_ERROR_MESSAGE };
  }

  return { ok: true, message: RECOVERY_EMAIL_SUCCESS_MESSAGE };
}
