import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getCurrentTeacherClassIds,
  loadCurrentAppUser,
  loadCurrentStudentProfile,
} from "../src/lib/auth/currentUserProfiles";

type Row = Record<string, unknown>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  assert(
    actual === expected,
    `${message}. Attendu: ${String(expected)}. Reçu: ${String(actual)}.`
  );
}

function assertArrayEquals(actual: unknown[], expected: unknown[], message: string) {
  assertEquals(JSON.stringify(actual), JSON.stringify(expected), message);
}

function assertNotMatches(source: string, pattern: RegExp, message: string) {
  assert(!pattern.test(source), message);
}

class FakeQuery {
  private filters: { column: string; value: unknown }[] = [];

  constructor(private readonly rows: Row[]) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  private matchingRows() {
    return this.rows.filter((row) =>
      this.filters.every((filter) => row[filter.column] === filter.value)
    );
  }

  async single() {
    const rows = this.matchingRows();

    if (rows.length !== 1) {
      return {
        data: null,
        error: { message: `Expected one row, got ${rows.length}` },
      };
    }

    return { data: rows[0], error: null };
  }

  async maybeSingle() {
    const rows = this.matchingRows();

    if (rows.length > 1) {
      return {
        data: null,
        error: { message: `Expected at most one row, got ${rows.length}` },
      };
    }

    return { data: rows[0] ?? null, error: null };
  }

  then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: Row[]; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve({ data: this.matchingRows(), error: null }).then(
      onfulfilled,
      onrejected
    );
  }
}

function createFakeClient(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      return new FakeQuery(tables[table] ?? []);
    },
  };
}

async function assertStudentResolvedByAuthUuid() {
  const authUser = {
    id: "auth-student-1",
    email: "changed.student@example.test",
    app_metadata: { role: "eleve" },
  };
  const client = createFakeClient({
    app_users: [
      {
        id: "auth-student-1",
        email: "old.student@example.test",
        role: "student",
        is_active: true,
      },
    ],
    students: [
      {
        id: "student-profile-1",
        user_id: "auth-student-1",
        first_name: "Ada",
        last_name: "Lovelace",
      },
      {
        id: "student-profile-without-user-id",
        user_id: null,
        first_name: "Sans",
        last_name: "Compte",
      },
    ],
  });

  const result = await loadCurrentStudentProfile(client, authUser);

  assertEquals(
    result.student?.id,
    "student-profile-1",
    "L'élève courant doit être retrouvé par students.user_id = authUser.id"
  );
  assertEquals(
    result.appUser?.email,
    "old.student@example.test",
    "Un changement d'email Auth ne doit pas casser le rattachement"
  );
}

async function assertTeacherResolvedByAuthUuid() {
  const authUser = {
    id: "auth-teacher-1",
    email: "changed.teacher@example.test",
    app_metadata: { role: "professeur" },
  };
  const client = createFakeClient({
    app_users: [
      {
        id: "auth-teacher-1",
        email: "old.teacher@example.test",
        role: "teacher",
        is_active: true,
      },
    ],
    teachers: [{ id: "teacher-profile-1", user_id: "auth-teacher-1" }],
    class_teachers: [
      { teacher_id: "teacher-profile-1", class_id: "class-a" },
      { teacher_id: "teacher-profile-1", class_id: "class-b" },
      { teacher_id: "another-teacher", class_id: "class-c" },
    ],
  });

  const classIds = await getCurrentTeacherClassIds(client, authUser);

  assertArrayEquals(
    classIds,
    ["class-a", "class-b"],
    "Le professeur courant doit être retrouvé par teachers.user_id = authUser.id"
  );
}

async function assertAdminWithoutTeacherOrStudentProfileIsAccepted() {
  const authUser = {
    id: "auth-admin-1",
    email: "admin@example.test",
    app_metadata: { role: "admin" },
  };
  const client = createFakeClient({
    app_users: [
      {
        id: "auth-admin-1",
        email: "admin@example.test",
        role: "admin",
        is_active: true,
      },
    ],
    students: [],
    teachers: [],
  });

  const appUser = await loadCurrentAppUser(client, authUser);

  assertEquals(
    appUser?.role,
    "admin",
    "Un admin actif doit être accepté sans profil students ou teachers"
  );
}

async function assertAuthWithoutAppUserIsRejectedCleanly() {
  const authUser = {
    id: "auth-without-app-user",
    email: "orphan@example.test",
    app_metadata: { role: "eleve" },
  };
  const client = createFakeClient({
    app_users: [],
    students: [
      {
        id: "student-same-email-legacy",
        user_id: null,
        email: "orphan@example.test",
      },
    ],
  });

  const result = await loadCurrentStudentProfile(client, authUser);

  assertEquals(
    result.student,
    null,
    "Un compte Auth sans app_users ne doit pas récupérer un profil par email"
  );
  assertEquals(
    result.errorMessage,
    "Aucun profil élève actif n’est associé à ce compte.",
    "L'erreur doit être claire quand app_users est absent"
  );
}

async function assertStudentWithoutUserIdIsNotAttached() {
  const authUser = {
    id: "auth-student-2",
    email: "student@example.test",
    app_metadata: { role: "eleve" },
  };
  const client = createFakeClient({
    app_users: [
      {
        id: "auth-student-2",
        email: "student@example.test",
        role: "student",
        is_active: true,
      },
    ],
    students: [
      {
        id: "legacy-student-without-user-id",
        user_id: null,
        email: "student@example.test",
      },
    ],
  });

  const result = await loadCurrentStudentProfile(client, authUser);

  assertEquals(
    result.student,
    null,
    "Un élève sans user_id ne doit pas être rattaché arbitrairement par email"
  );
}

function assertNoCurrentProfileLookupByEmailRemains() {
  const correctedFiles = [
    "src/app/page.tsx",
    "src/app/eleve/page.tsx",
    "src/app/eleve/profil/page.tsx",
    "src/app/eleve/fiches/[id]/page.tsx",
    "src/app/fiches/[id]/page.tsx",
    "src/app/api/admin/classes/route.ts",
    "src/app/api/admin/class-teachers/route.ts",
    "src/app/api/admin/evaluations/generate/route.ts",
    "src/app/api/admin/student-registrations/route.ts",
    "src/app/api/admin/student-registrations/export/route.ts",
    "src/app/api/admin/student-registrations/export-xlsx/route.ts",
    "src/app/api/teacher/section-feedback/route.ts",
    "src/lib/auth/currentUserProfiles.ts",
  ];

  for (const file of correctedFiles) {
    const source = readFileSync(join(process.cwd(), file), "utf8");

    assertNotMatches(
      source,
      /\.eq\(["']email["'],\s*(appUser|authUser|teacher)\.email/,
      `${file} ne doit plus rechercher le profil courant par email`
    );
    assertNotMatches(
      source,
      /getTeacherClassIds\([^)]*,\s*(authUser|teacher)\.email\)/,
      `${file} ne doit plus passer l'email Auth au helper professeur`
    );
  }
}

async function main() {
  await assertStudentResolvedByAuthUuid();
  await assertTeacherResolvedByAuthUuid();
  await assertAdminWithoutTeacherOrStudentProfileIsAccepted();
  await assertAuthWithoutAppUserIsRejectedCleanly();
  await assertStudentWithoutUserIdIsNotAttached();
  assertNoCurrentProfileLookupByEmailRemains();

  console.log("Auth UUID linking tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
