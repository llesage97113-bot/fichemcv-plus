import {
  INTERNAL_LOGIN_DOMAIN,
  normalizeLoginIdentifier,
  normalizeShortLoginIdentifier,
} from "./loginIdentifier";

export const STUDENT_LOGIN_DIGITS = 4;
export const STUDENT_LOGIN_MAX_ATTEMPTS = 50;

export type IdentifierAvailabilityClient = {
  from(table: string): {
    select(columns: string, options?: unknown): IdentifierAvailabilityQuery;
  };
  auth?: {
    admin?: {
      listUsers(params?: {
        page?: number;
        perPage?: number;
      }): Promise<{
        data?: {
          users?: { email?: string | null }[];
          nextPage?: number | null;
          lastPage?: number | null;
        };
        error?: unknown;
      }>;
      getUserById?(userId: string): Promise<{
        data?: {
          user?: { id: string; email?: string | null } | null;
        };
        error?: { message?: string } | null;
      }>;
    };
  };
};

type IdentifierAvailabilityQuery = {
  eq(column: string, value: unknown): IdentifierAvailabilityQuery;
  maybeSingle(): Promise<{ data: unknown; error: unknown }>;
  single?(): Promise<{ data: unknown; error: unknown }>;
};

type IdentifierMutationQuery = {
  select(columns: string): IdentifierMutationQuery;
  single(): Promise<{ data: unknown; error: { message?: string } | null }>;
};

export type ExistingStudentIdentifierClient = {
  from(table: string): {
    select(columns: string, options?: unknown): IdentifierAvailabilityQuery;
    insert(values: unknown): IdentifierMutationQuery;
  };
  auth?: IdentifierAvailabilityClient["auth"];
};

export type ExistingStudentShortIdentifierResult =
  | {
      ok: true;
      identifier: string;
      authEmail: string;
      legacyLoginEmail: string | null;
      userId: string;
      studentId: string;
    }
  | {
      ok: false;
      status: number;
      message: string;
    };

export function normalizeStudentLoginBase(firstName: string) {
  const normalized = firstName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’\-\s]+/g, "")
    .replace(/[^a-z0-9]/g, "");

  return normalized || "eleve";
}

export function buildInternalStudentEmail(identifier: string) {
  return `${identifier}@${INTERNAL_LOGIN_DOMAIN}`;
}

export function buildStudentIdentifierCandidate(
  firstName: string,
  randomDigits = Math.floor(Math.random() * 10 ** STUDENT_LOGIN_DIGITS)
) {
  return `${normalizeStudentLoginBase(firstName)}${String(randomDigits).padStart(
    STUDENT_LOGIN_DIGITS,
    "0"
  )}`;
}

export async function isStudentIdentifierAvailable(
  client: IdentifierAvailabilityClient,
  identifier: string
) {
  const email = buildInternalStudentEmail(identifier);

  const { data: reservedIdentifier } = await client
    .from("student_login_identifiers")
    .select("identifier")
    .eq("identifier", identifier)
    .maybeSingle();

  if (reservedIdentifier) {
    return false;
  }

  const { data: existingAppUser } = await client
    .from("app_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingAppUser) {
    return false;
  }

  const existsInAuth = await doesAuthEmailExist(client, email);

  return !existsInAuth;
}

async function doesAuthEmailExist(
  client: IdentifierAvailabilityClient,
  email: string
) {
  const perPage = 200;
  const maxPages = 20;

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await client.auth?.admin?.listUsers({
      page,
      perPage,
    });

    if (!response) {
      return false;
    }

    if (response.error) {
      throw new Error("Impossible de vérifier les utilisateurs Auth.");
    }

    const users = response.data?.users ?? [];

    if (
      users.some((user) => user.email?.toLowerCase() === email.toLowerCase())
    ) {
      return true;
    }

    const nextPage = response.data?.nextPage ?? null;
    const lastPage = response.data?.lastPage ?? null;

    if (nextPage && nextPage > page) {
      continue;
    }

    if (lastPage && page < lastPage) {
      continue;
    }

    if (users.length < perPage) {
      return false;
    }
  }

  return false;
}

export async function generateUniqueStudentLoginIdentifier(
  client: IdentifierAvailabilityClient,
  firstName: string,
  makeCandidate: (firstName: string) => string = buildStudentIdentifierCandidate
) {
  for (let attempt = 0; attempt < STUDENT_LOGIN_MAX_ATTEMPTS; attempt += 1) {
    const identifier = makeCandidate(firstName);

    if (await isStudentIdentifierAvailable(client, identifier)) {
      return identifier;
    }
  }

  throw new Error("Impossible de générer un identifiant élève unique.");
}

export async function resolveAuthEmailForLoginIdentifier(
  client: IdentifierAvailabilityClient,
  identifier: string
) {
  const normalized = normalizeLoginIdentifier(identifier);

  if (!normalized) {
    return "";
  }

  const shortIdentifier = normalizeShortLoginIdentifier(normalized);

  const { data } = await client
    .from("student_login_identifiers")
    .select("auth_email")
    .eq("identifier", shortIdentifier)
    .maybeSingle();

  const row = (data ?? null) as { auth_email?: string | null } | null;

  return row?.auth_email ? row.auth_email.toLowerCase() : normalized;
}

export async function createShortIdentifierForExistingStudent(
  client: ExistingStudentIdentifierClient,
  studentId: string,
  makeCandidate?: (firstName: string) => string
): Promise<ExistingStudentShortIdentifierResult> {
  const { data: studentData, error: studentError } = await client
    .from("students")
    .select("id, user_id, first_name, last_name")
    .eq("id", studentId)
    .maybeSingle();

  const student = (studentData ?? null) as
    | {
        id?: string | null;
        user_id?: string | null;
        first_name?: string | null;
      }
    | null;

  if (studentError || !student?.id) {
    return {
      ok: false,
      status: 404,
      message: "Élève introuvable.",
    };
  }

  if (!student.user_id) {
    return {
      ok: false,
      status: 400,
      message: "Aucun compte Auth n’est rattaché à cet élève.",
    };
  }

  const { data: appUserData, error: appUserError } = await client
    .from("app_users")
    .select("id, email, role, is_active, legacy_login_email")
    .eq("id", student.user_id)
    .maybeSingle();

  const appUser = (appUserData ?? null) as
    | {
        id?: string | null;
        email?: string | null;
        role?: string | null;
        is_active?: boolean | null;
        legacy_login_email?: string | null;
      }
    | null;

  if (appUserError || !appUser?.id) {
    return {
      ok: false,
      status: 404,
      message: "Compte applicatif introuvable pour cet élève.",
    };
  }

  if (appUser.role !== "student" && appUser.role !== "eleve") {
    return {
      ok: false,
      status: 403,
      message: "L’utilisateur rattaché n’est pas un élève.",
    };
  }

  const authResponse = await client.auth?.admin?.getUserById?.(appUser.id);

  if (authResponse?.error || !authResponse?.data?.user) {
    return {
      ok: false,
      status: 404,
      message: "Compte Supabase Auth introuvable pour cet élève.",
    };
  }

  const authEmail =
    authResponse.data.user.email?.toLowerCase() ||
    appUser.email?.toLowerCase() ||
    appUser.legacy_login_email?.toLowerCase() ||
    null;

  if (!authEmail) {
    return {
      ok: false,
      status: 400,
      message: "Email Auth historique introuvable pour cet élève.",
    };
  }

  const { data: existingIdentifier } = await client
    .from("student_login_identifiers")
    .select("identifier, auth_email")
    .eq("user_id", appUser.id)
    .maybeSingle();

  const existing = (existingIdentifier ?? null) as
    | { identifier?: string | null; auth_email?: string | null }
    | null;

  if (existing?.identifier) {
    return {
      ok: false,
      status: 409,
      message: "Un identifiant court existe déjà pour cet élève.",
    };
  }

  const identifier = await generateUniqueStudentLoginIdentifier(
    client,
    student.first_name ?? "eleve",
    makeCandidate
  );

  const { data: createdData, error: insertError } = await client
    .from("student_login_identifiers")
    .insert({
      identifier,
      auth_email: authEmail,
      user_id: appUser.id,
    })
    .select("identifier, auth_email, user_id")
    .single();

  if (insertError || !createdData) {
    return {
      ok: false,
      status: 409,
      message:
        insertError?.message ??
        "Création de l’identifiant court impossible pour le moment.",
    };
  }

  return {
    ok: true,
    identifier,
    authEmail,
    legacyLoginEmail: appUser.legacy_login_email ?? authEmail,
    userId: appUser.id,
    studentId: student.id,
  };
}
