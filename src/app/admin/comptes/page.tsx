import Link from "next/link";
import AppNavigation from "@/components/AppNavigation";
import AdminAccountsReadOnlyTable, {
  type AdminAccountRow,
} from "@/components/AdminAccountsReadOnlyTable";
import { requireRole } from "@/lib/auth/requireUser";
import { createAdminClient } from "@/lib/supabase/admin";

type AppUserRecord = {
  id: string;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
};

type StudentRecord = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  candidate_number: string | null;
  student_code: string | null;
  registration_status: string | null;
  classes?:
    | {
        name: string | null;
        school_year: string | null;
      }
    | {
        name: string | null;
        school_year: string | null;
      }[]
    | null;
};

type TeacherRecord = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getRoleLabel(role: string | null) {
  if (role === "student") return "Élève";
  if (role === "teacher") return "Professeur";
  return role || "Rôle inconnu";
}

function normalizeRole(role: string | null): AdminAccountRow["role"] {
  if (role === "student" || role === "teacher") {
    return role;
  }

  return "other";
}

function getAccountType(email: string | null): AdminAccountRow["accountType"] {
  if (!email) {
    return "missing";
  }

  return email.toLowerCase().endsWith("@fichemcv.local")
    ? "internal"
    : "real";
}

function buildClassName(student: StudentRecord | null) {
  const classItem = firstRelation(student?.classes);

  if (!classItem) {
    return "";
  }

  return [classItem.name, classItem.school_year].filter(Boolean).join(" — ");
}

function buildSearchableText(account: Omit<AdminAccountRow, "searchableText">) {
  return [
    account.firstName,
    account.lastName,
    account.roleLabel,
    account.identifier,
    account.className,
    account.studentCode,
    account.candidateNumber,
    account.registrationStatus,
    account.profileStatusLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildAppUserRow(
  appUser: AppUserRecord,
  student: StudentRecord | null,
  teacher: TeacherRecord | null
): AdminAccountRow {
  const role = normalizeRole(appUser.role);
  const expectedProfile =
    role === "student" ? student : role === "teacher" ? teacher : null;
  const hasExpectedProfile = Boolean(expectedProfile);
  const firstName = student?.first_name ?? teacher?.first_name ?? "";
  const lastName = student?.last_name ?? teacher?.last_name ?? "";
  const identifier = appUser.email ?? teacher?.email ?? "";
  const profileStatus: AdminAccountRow["profileStatus"] =
    role === "other" ? "unknown" : hasExpectedProfile ? "linked" : "missing";
  const profileStatusLabel =
    role === "other"
      ? "Profil non attendu"
      : hasExpectedProfile
        ? "Profil relié"
        : "Profil métier manquant";

  const rowWithoutSearch = {
    id: `app-user-${appUser.id}`,
    source: "app_user" as const,
    role,
    roleLabel: getRoleLabel(appUser.role),
    firstName,
    lastName,
    identifier,
    isActive: appUser.is_active,
    accountType: getAccountType(identifier),
    className: buildClassName(student),
    studentCode: student?.student_code ?? "",
    candidateNumber: student?.candidate_number ?? "",
    registrationStatus: student?.registration_status ?? "",
    profileStatus,
    profileStatusLabel,
  };

  return {
    ...rowWithoutSearch,
    searchableText: buildSearchableText(rowWithoutSearch),
  };
}

function buildOrphanStudentRow(student: StudentRecord): AdminAccountRow {
  const rowWithoutSearch = {
    id: `orphan-student-${student.id}`,
    source: "orphan_student" as const,
    role: "student" as const,
    roleLabel: "Élève",
    firstName: student.first_name ?? "",
    lastName: student.last_name ?? "",
    identifier: "",
    isActive: null,
    accountType: "missing" as const,
    className: buildClassName(student),
    studentCode: student.student_code ?? "",
    candidateNumber: student.candidate_number ?? "",
    registrationStatus: student.registration_status ?? "",
    profileStatus: "orphan" as const,
    profileStatusLabel: "Profil élève sans compte",
  };

  return {
    ...rowWithoutSearch,
    searchableText: buildSearchableText(rowWithoutSearch),
  };
}

function buildOrphanTeacherRow(teacher: TeacherRecord): AdminAccountRow {
  const rowWithoutSearch = {
    id: `orphan-teacher-${teacher.id}`,
    source: "orphan_teacher" as const,
    role: "teacher" as const,
    roleLabel: "Professeur",
    firstName: teacher.first_name ?? "",
    lastName: teacher.last_name ?? "",
    identifier: teacher.email ?? "",
    isActive: null,
    accountType: getAccountType(teacher.email),
    className: "",
    studentCode: "",
    candidateNumber: "",
    registrationStatus: "",
    profileStatus: "orphan" as const,
    profileStatusLabel: "Profil professeur sans compte",
  };

  return {
    ...rowWithoutSearch,
    searchableText: buildSearchableText(rowWithoutSearch),
  };
}

export default async function AdminAccountsPage() {
  await requireRole("admin");

  const admin = createAdminClient();

  const [appUsersResult, studentsResult, teachersResult] = await Promise.all([
    admin
      .from("app_users")
      .select("id, email, role, is_active")
      .order("email", { ascending: true }),
    admin
      .from("students")
      .select(
        `
        id,
        user_id,
        first_name,
        last_name,
        candidate_number,
        student_code,
        registration_status,
        classes (
          name,
          school_year
        )
      `
      )
      .order("last_name", { ascending: true }),
    admin
      .from("teachers")
      .select("id, user_id, first_name, last_name, email")
      .order("email", { ascending: true }),
  ]);

  const appUsers = (appUsersResult.data ?? []) as AppUserRecord[];
  const students = (studentsResult.data ?? []) as StudentRecord[];
  const teachers = (teachersResult.data ?? []) as TeacherRecord[];

  const appUserIds = new Set(appUsers.map((appUser) => appUser.id));
  const studentsByUserId = new Map(
    students
      .filter((student) => Boolean(student.user_id))
      .map((student) => [String(student.user_id), student])
  );
  const teachersByUserId = new Map(
    teachers
      .filter((teacher) => Boolean(teacher.user_id))
      .map((teacher) => [String(teacher.user_id), teacher])
  );

  const accountRows = appUsers.map((appUser) =>
    buildAppUserRow(
      appUser,
      studentsByUserId.get(appUser.id) ?? null,
      teachersByUserId.get(appUser.id) ?? null
    )
  );

  const orphanStudentRows = students
    .filter((student) => !student.user_id || !appUserIds.has(student.user_id))
    .map(buildOrphanStudentRow);
  const orphanTeacherRows = teachers
    .filter((teacher) => !teacher.user_id || !appUserIds.has(teacher.user_id))
    .map(buildOrphanTeacherRow);

  const accounts = [
    ...accountRows,
    ...orphanStudentRows,
    ...orphanTeacherRows,
  ].sort((a, b) => {
    const classCompare = a.className.localeCompare(b.className);
    if (classCompare !== 0) return classCompare;

    const lastNameCompare = a.lastName.localeCompare(b.lastName);
    if (lastNameCompare !== 0) return lastNameCompare;

    return a.identifier.localeCompare(b.identifier);
  });

  const stats = {
    totalAccounts: appUsers.length,
    studentAccounts: appUsers.filter((appUser) => appUser.role === "student")
      .length,
    teacherAccounts: appUsers.filter((appUser) => appUser.role === "teacher")
      .length,
    activeAccounts: appUsers.filter((appUser) => appUser.is_active).length,
    inactiveAccounts: appUsers.filter((appUser) => !appUser.is_active).length,
    internalAccounts: appUsers.filter(
      (appUser) => getAccountType(appUser.email) === "internal"
    ).length,
    profileIssues: accounts.filter(
      (account) =>
        account.profileStatus === "missing" || account.profileStatus === "orphan"
    ).length,
  };

  const hasErrors =
    appUsersResult.error || studentsResult.error || teachersResult.error;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <AppNavigation maxWidth="6xl" />

      <section className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center rounded-lg border border-slate-800 px-3 py-2 text-sm text-purple-300 hover:bg-slate-900 hover:text-purple-200"
        >
          ← Retour à l’administration
        </Link>

        <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm">
          <p className="mb-2 text-sm uppercase tracking-wide text-purple-300">
            Administration
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Gestion des comptes
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Vue technique en lecture seule des comptes FicheMCV+. Cette page
            vérifie les rattachements entre les comptes de connexion et les
            profils métier sans proposer d’action sensible.
          </p>
        </header>

        {hasErrors && (
          <section className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
            <p className="font-semibold text-red-200">
              Certaines données n’ont pas pu être chargées.
            </p>
            <div className="mt-2 space-y-1 text-sm text-red-100/80">
              {appUsersResult.error && <p>{appUsersResult.error.message}</p>}
              {studentsResult.error && <p>{studentsResult.error.message}</p>}
              {teachersResult.error && <p>{teachersResult.error.message}</p>}
            </div>
          </section>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Total comptes
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-100">
              {stats.totalAccounts}
            </p>
            <p className="mt-1 text-sm text-slate-400">Lignes app_users</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Élèves
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-200">
              {stats.studentAccounts}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Comptes app_users student
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Professeurs
            </p>
            <p className="mt-2 text-3xl font-bold text-sky-200">
              {stats.teacherAccounts}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Comptes app_users teacher
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Profils à vérifier
            </p>
            <p className="mt-2 text-3xl font-bold text-red-200">
              {stats.profileIssues}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Manquants ou sans compte
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Actifs
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-200">
              {stats.activeAccounts}
            </p>
            <p className="mt-1 text-sm text-slate-400">is_active = true</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Inactifs
            </p>
            <p className="mt-2 text-3xl font-bold text-red-200">
              {stats.inactiveAccounts}
            </p>
            <p className="mt-1 text-sm text-slate-400">is_active = false</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 md:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Comptes internes
            </p>
            <p className="mt-2 text-3xl font-bold text-purple-200">
              {stats.internalAccounts}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Identifiants se terminant par @fichemcv.local
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="font-semibold text-amber-100">
            Périmètre volontairement limité
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-100/80">
            La récupération du mot de passe doit rester autonome depuis la page
            de connexion. Aucun professeur ne peut définir ou réinitialiser un
            mot de passe élève depuis cette interface.
          </p>
        </section>

        <AdminAccountsReadOnlyTable accounts={accounts} />
      </section>
    </main>
  );
}
