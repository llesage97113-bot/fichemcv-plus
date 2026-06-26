export type AuthUserIdentity = {
  id: string;
  email?: string | null;
  app_metadata?: unknown;
};

export type AppUserRole = "admin" | "teacher" | "student";

export type AppUserProfile = {
  id: string;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
};

export type StudentProfile = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  candidate_number?: string | null;
  student_code?: string | null;
  registration_status?: string | null;
};

export type TeacherProfile = {
  id: string;
};

type SupabaseLike = {
  from(table: string): {
    select(columns: string): unknown;
  };
};

type QueryLike = {
  eq(column: string, value: unknown): QueryLike;
  single(): Promise<{ data: unknown; error: { message?: string } | null }>;
  maybeSingle(): Promise<{ data: unknown; error: { message?: string } | null }>;
};

function asQuery(value: unknown): QueryLike {
  return value as QueryLike;
}

function asExecutableQuery(value: unknown) {
  return value as Promise<{ data: unknown; error: { message?: string } | null }> & {
    eq(column: string, value: unknown): Promise<{
      data: unknown;
      error: { message?: string } | null;
    }>;
  };
}

export function isExpectedActiveAppUser(
  appUser: AppUserProfile | null,
  expectedRole?: AppUserRole
) {
  if (!appUser?.is_active) {
    return false;
  }

  return expectedRole ? appUser.role === expectedRole : true;
}

export async function loadCurrentAppUser(
  client: SupabaseLike,
  authUser: AuthUserIdentity,
  expectedRole?: AppUserRole
) {
  let query = asQuery(
    client.from("app_users").select("id, email, role, is_active")
  )
    .eq("id", authUser.id)
    .eq("is_active", true);

  if (expectedRole) {
    query = query.eq("role", expectedRole);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message ?? "Compte utilisateur introuvable.");
  }

  const appUser = (data ?? null) as AppUserProfile | null;
  return isExpectedActiveAppUser(appUser, expectedRole) ? appUser : null;
}

export async function loadCurrentStudentProfile(
  client: SupabaseLike,
  authUser: AuthUserIdentity,
  columns = "id, first_name, last_name, candidate_number, student_code, registration_status"
) {
  const appUser = await loadCurrentAppUser(client, authUser, "student");

  if (!appUser) {
    return {
      appUser: null,
      student: null,
      errorMessage: "Aucun profil élève actif n’est associé à ce compte.",
    };
  }

  const { data, error } = await asQuery(client.from("students").select(columns))
    .eq("user_id", authUser.id)
    .single();

  if (error || !data) {
    return {
      appUser,
      student: null,
      errorMessage: "Aucune fiche élève n’est rattachée à ce compte.",
    };
  }

  return {
    appUser,
    student: data as StudentProfile,
    errorMessage: "",
  };
}

export async function loadCurrentTeacherProfile(
  client: SupabaseLike,
  authUser: AuthUserIdentity
) {
  const appUser = await loadCurrentAppUser(client, authUser, "teacher");

  if (!appUser) {
    return null;
  }

  const { data, error } = await asQuery(client.from("teachers").select("id"))
    .eq("user_id", authUser.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as TeacherProfile;
}

export async function getCurrentTeacherClassIds(
  client: SupabaseLike,
  authUser: AuthUserIdentity
) {
  const teacherProfile = await loadCurrentTeacherProfile(client, authUser);

  const teacherClassesResult: { data: unknown } = teacherProfile
    ? await asExecutableQuery(client.from("class_teachers").select("class_id"))
        .eq("teacher_id", teacherProfile.id)
    : { data: null };

  const teacherClasses = teacherClassesResult.data;

  const rows = Array.isArray(teacherClasses)
    ? teacherClasses
    : teacherClasses
      ? [teacherClasses]
      : [];

  return Array.from(
    new Set(
      rows
        .map((item) => String((item as { class_id?: string | null }).class_id ?? ""))
        .filter(Boolean)
    )
  );
}
