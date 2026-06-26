import { maskContactValue } from "./contactDisplay";

export type AccountAuthUser = {
  id: string;
  email?: string | null;
  app_metadata?: unknown;
};

export type AccountRole = "admin" | "professeur" | "eleve" | "unknown";

export type AccountAppUser = {
  id: string;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
  account_status: string | null;
  legacy_login_email: string | null;
};

export type AccountBusinessProfile = {
  firstName: string | null;
  lastName: string | null;
};

export type AccountContact = {
  id: string;
  contact_type: string | null;
  contact_value: string | null;
  normalized_value?: string | null;
  is_primary: boolean | null;
  verified_at: string | null;
};

export type AccountOverview = {
  appUser: AccountAppUser;
  authEmail: string | null;
  role: AccountRole;
  roleLabel: string;
  accountStatusLabel: string;
  identityLabel: string;
  isLegacyAccount: boolean;
  contacts: AccountContact[];
};

type SupabaseLike = {
  from(table: string): {
    select(columns: string): unknown;
  };
};

type QueryLike = {
  eq(column: string, value: unknown): QueryLike;
  order(column: string, options?: unknown): QueryLike;
  single(): Promise<{ data: unknown; error: { message?: string } | null }>;
  maybeSingle(): Promise<{ data: unknown; error: { message?: string } | null }>;
  then<TResult1 = { data: unknown; error: { message?: string } | null }, TResult2 = never>(
    onfulfilled?:
      | ((
          value: { data: unknown; error: { message?: string } | null }
        ) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2>;
};

function asQuery(value: unknown): QueryLike {
  return value as QueryLike;
}

export function getReadableAccountRole(role: string | null | undefined) {
  if (role === "admin") {
    return "Administrateur";
  }

  if (role === "teacher" || role === "professeur") {
    return "Professeur";
  }

  if (role === "student" || role === "eleve") {
    return "Élève";
  }

  return "Rôle inconnu";
}

export function normalizeAccountRole(role: string | null | undefined): AccountRole {
  if (role === "admin") {
    return "admin";
  }

  if (role === "teacher" || role === "professeur") {
    return "professeur";
  }

  if (role === "student" || role === "eleve") {
    return "eleve";
  }

  return "unknown";
}

export function getReadableAccountStatus(status: string | null | undefined) {
  if (status === "active") return "Actif";
  if (status === "pending") return "En attente";
  if (status === "suspended") return "Suspendu";
  if (status === "recovery_required") return "Récupération requise";
  if (status === "disabled") return "Désactivé";
  return "Statut inconnu";
}

export function getReadableContactType(contactType: string | null | undefined) {
  if (contactType === "email") return "Adresse email de récupération";
  if (contactType === "phone") return "Téléphone de récupération";
  return "Coordonnée de récupération";
}

export function getReadableContactVerification(contact: AccountContact) {
  return contact.verified_at ? "Vérifié" : "Non vérifié";
}

export function getReadableContactPriority(contact: AccountContact) {
  return contact.is_primary ? "Contact principal" : "Contact secondaire";
}

export function isLegacyAccountIdentifier(
  authEmail: string | null | undefined,
  legacyLoginEmail: string | null | undefined
) {
  return Boolean(legacyLoginEmail) || String(authEmail ?? "").toLowerCase().endsWith("@fichemcv.local");
}

export function getMaskedAccountContact(contact: AccountContact) {
  return maskContactValue(
    contact.contact_value || contact.normalized_value || "",
    contact.contact_type
  );
}

export function buildAccountIdentity(
  appUser: AccountAppUser,
  profile: AccountBusinessProfile | null,
  authEmail: string | null | undefined
) {
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");

  if (fullName) {
    return fullName;
  }

  if (appUser.email) {
    return appUser.email;
  }

  return authEmail || "Compte utilisateur";
}

export async function loadAccountOverview(
  client: SupabaseLike,
  authUser: AccountAuthUser
) {
  const { data: appUserData, error: appUserError } = await asQuery(
    client
      .from("app_users")
      .select("id, email, role, is_active, account_status, legacy_login_email")
  )
    .eq("id", authUser.id)
    .maybeSingle();

  if (appUserError) {
    throw new Error(appUserError.message ?? "Compte applicatif introuvable.");
  }

  const appUser = (appUserData ?? null) as AccountAppUser | null;

  if (!appUser) {
    return {
      overview: null,
      errorMessage: "Aucun compte applicatif n’est associé à cette session.",
    };
  }

  const role = normalizeAccountRole(appUser.role);
  const profile = await loadBusinessProfile(client, authUser.id, role);
  const contacts = await loadAccountContacts(client, authUser.id);
  const authEmail = authUser.email ?? null;

  return {
    overview: {
      appUser,
      authEmail,
      role,
      roleLabel: getReadableAccountRole(appUser.role),
      accountStatusLabel: getReadableAccountStatus(appUser.account_status),
      identityLabel: buildAccountIdentity(appUser, profile, authEmail),
      isLegacyAccount: isLegacyAccountIdentifier(
        authEmail,
        appUser.legacy_login_email
      ),
      contacts,
    } satisfies AccountOverview,
    errorMessage: "",
  };
}

async function loadBusinessProfile(
  client: SupabaseLike,
  authUserId: string,
  role: AccountRole
) {
  if (role === "eleve") {
    const { data } = await asQuery(
      client.from("students").select("first_name, last_name")
    )
      .eq("user_id", authUserId)
      .maybeSingle();

    const student = (data ?? null) as
      | { first_name?: string | null; last_name?: string | null }
      | null;

    return student
      ? { firstName: student.first_name ?? null, lastName: student.last_name ?? null }
      : null;
  }

  if (role === "professeur") {
    const { data } = await asQuery(
      client.from("teachers").select("first_name, last_name")
    )
      .eq("user_id", authUserId)
      .maybeSingle();

    const teacher = (data ?? null) as
      | { first_name?: string | null; last_name?: string | null }
      | null;

    return teacher
      ? { firstName: teacher.first_name ?? null, lastName: teacher.last_name ?? null }
      : null;
  }

  return null;
}

async function loadAccountContacts(client: SupabaseLike, authUserId: string) {
  const { data, error } = await asQuery(
    client
      .from("user_contacts")
      .select("id, contact_type, contact_value, normalized_value, is_primary, verified_at")
  )
    .eq("user_id", authUserId)
    .order("contact_type", { ascending: true })
    .order("is_primary", { ascending: false });

  if (error) {
    throw new Error(error.message ?? "Coordonnées de récupération indisponibles.");
  }

  return (Array.isArray(data) ? data : []) as AccountContact[];
}
