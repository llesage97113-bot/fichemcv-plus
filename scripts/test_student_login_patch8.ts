import { existsSync, readFileSync } from "node:fs";
import {
  getShortLoginIdentifier,
  normalizeLoginIdentifier,
} from "../src/lib/auth/loginIdentifier";
import {
  buildInternalStudentEmail,
  buildStudentIdentifierCandidate,
  createShortIdentifierForExistingStudent,
  generateUniqueStudentLoginIdentifier,
  isStudentIdentifierAvailable,
  normalizeStudentLoginBase,
  resolveAuthEmailForLoginIdentifier,
} from "../src/lib/auth/studentLoginIdentifier";
import {
  hasRecoveryEmailContact,
  hasVerifiedRecoveryEmail,
} from "../src/lib/auth/accountManagement";

type Row = Record<string, unknown>;

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

function assertIncludes(source: string, expected: string, message: string) {
  assert(source.includes(expected), message);
}

function assertNotIncludes(source: string, unexpected: string, message: string) {
  assert(!source.includes(unexpected), message);
}

class FakeQuery {
  private filters: { column: string; value: unknown }[] = [];
  private insertedRow: Row | null = null;

  constructor(private readonly rows: Row[]) {}

  select() {
    return this;
  }

  insert(values: Row) {
    this.insertedRow = values;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  async maybeSingle() {
    const rows = this.rows.filter((row) =>
      this.filters.every((filter) => row[filter.column] === filter.value)
    );

    return { data: rows[0] ?? null, error: null };
  }

  async single() {
    if (this.insertedRow) {
      if (
        this.rows.some((row) => row.identifier === this.insertedRow?.identifier)
      ) {
        return {
          data: null,
          error: { message: "duplicate identifier" },
        };
      }

      if (
        this.insertedRow.user_id &&
        this.rows.some((row) => row.user_id === this.insertedRow?.user_id)
      ) {
        return {
          data: null,
          error: { message: "duplicate user_id" },
        };
      }

      this.rows.push(this.insertedRow);
      return { data: this.insertedRow, error: null };
    }

    return this.maybeSingle();
  }
}

function createFakeClient(
  tables: Record<string, Row[]>,
  authEmails: string[] = [],
  authUsers: Row[] = []
) {
  return {
    from(table: string) {
      return new FakeQuery(tables[table] ?? []);
    },
    auth: {
      admin: {
        async listUsers(params?: { page?: number; perPage?: number }) {
          const page = params?.page ?? 1;
          const perPage = 2;
          const start = (page - 1) * perPage;
          const users = authEmails
            .slice(start, start + perPage)
            .map((email) => ({ email }));

          return {
            data: {
              users,
              nextPage: start + perPage < authEmails.length ? page + 1 : null,
              lastPage: Math.max(1, Math.ceil(authEmails.length / perPage)),
            },
            error: null,
          };
        },
        async getUserById(userId: string) {
          const userData = authUsers.find((item) => item.id === userId) ?? null;
          const user = userData
            ? {
                id: String(userData.id),
                email:
                  typeof userData.email === "string" ? userData.email : null,
              }
            : null;

          return {
            data: { user },
            error: user ? null : { message: "not found" },
          };
        },
      },
    },
  };
}

function assertIdentifierNormalization() {
  assertEquals(normalizeStudentLoginBase("Léa"), "lea", "Prénom simple accentué");
  assertEquals(normalizeStudentLoginBase("Jean Luc"), "jeanluc", "Prénom composé avec espace");
  assertEquals(normalizeStudentLoginBase("Jean-Luc"), "jeanluc", "Prénom composé avec tiret");
  assertEquals(normalizeStudentLoginBase("D'Artagnan"), "dartagnan", "Apostrophe supprimée");
  assertEquals(normalizeStudentLoginBase("  Anne   Marie  "), "annemarie", "Espaces multiples supprimés");
  assertEquals(buildStudentIdentifierCandidate("Léa", 4827), "lea4827", "Quatre chiffres ajoutés");
  assertEquals(buildStudentIdentifierCandidate("Luc", 7), "luc0007", "Quatre chiffres paddés");
  assertEquals(buildInternalStudentEmail("lea4827"), "lea4827@fichemcv.local", "Email interne construit");
}

async function assertIdentifierAvailability() {
  const available = createFakeClient({
    app_users: [],
    student_login_identifiers: [],
  });
  assert(
    await isStudentIdentifierAvailable(available, "lea4827"),
    "Un identifiant libre doit être disponible"
  );

  const reserved = createFakeClient({
    app_users: [],
    student_login_identifiers: [{ identifier: "lea4827" }],
  });
  assert(
    !(await isStudentIdentifierAvailable(reserved, "lea4827")),
    "Un identifiant réservé ne doit pas être recyclé"
  );

  const appUserCollision = createFakeClient({
    app_users: [{ email: "lea4827@fichemcv.local" }],
    student_login_identifiers: [],
  });
  assert(
    !(await isStudentIdentifierAvailable(appUserCollision, "lea4827")),
    "Une collision app_users doit être refusée"
  );

  const authCollision = createFakeClient(
    { app_users: [], student_login_identifiers: [] },
    ["lea4827@fichemcv.local"]
  );
  assert(
    !(await isStudentIdentifierAvailable(authCollision, "lea4827")),
    "Une collision Auth doit être refusée"
  );

  const pagedAuthCollision = createFakeClient(
    { app_users: [], student_login_identifiers: [] },
    [
      "user-1@example.fr",
      "user-2@example.fr",
      "user-3@example.fr",
      "lea9999@fichemcv.local",
    ]
  );
  assert(
    !(await isStudentIdentifierAvailable(pagedAuthCollision, "lea9999")),
    "Une collision Auth située sur une page suivante doit être refusée"
  );

  const generated = await generateUniqueStudentLoginIdentifier(
    createFakeClient({
      app_users: [],
      student_login_identifiers: [{ identifier: "lea1111" }],
    }),
    "Léa",
    (() => {
      const candidates = ["lea1111", "lea2222"];
      return () => candidates.shift() ?? "lea3333";
    })()
  );
  assertEquals(generated, "lea2222", "La génération doit retenter après collision");
}

function assertLoginNormalization() {
  assertEquals(normalizeLoginIdentifier(" lea4827 "), "lea4827@fichemcv.local", "Identifiant court accepté");
  assertEquals(normalizeLoginIdentifier(" LEA4827@FICHEMCV.LOCAL "), "lea4827@fichemcv.local", "Identifiant complet accepté");
  assertEquals(normalizeLoginIdentifier(" Ada@Example.FR "), "ada@example.fr", "Adresse réelle conservée");
  assertEquals(
    normalizeLoginIdentifier(" prenom.nom@fichemcv.local "),
    "prenom.nom@fichemcv.local",
    "Ancien identifiant complet inchangé"
  );
  assertEquals(getShortLoginIdentifier("lea4827@fichemcv.local"), "lea4827", "Affichage court possible");
}

async function assertLegacyStudentShortIdentifierCreation() {
  const tables: Record<string, Row[]> = {
    students: [
      {
        id: "student-1",
        user_id: "user-1",
        first_name: "Léa",
        last_name: "Dupont",
      },
    ],
    app_users: [
      {
        id: "user-1",
        email: "lea.dupont@fichemcv.local",
        role: "student",
        is_active: true,
        legacy_login_email: "lea.dupont@fichemcv.local",
      },
    ],
    student_login_identifiers: [],
  };
  const client = createFakeClient(tables, [], [
    { id: "user-1", email: "lea.dupont@fichemcv.local" },
  ]);

  const result = await createShortIdentifierForExistingStudent(
    client,
    "student-1",
    () => "lea4827"
  );

  assert(result.ok, "La création d'identifiant court doit réussir");
  assertEquals(result.identifier, "lea4827", "L'identifiant court est généré");
  assertEquals(result.userId, "user-1", "Le user_id Auth doit être conservé");
  assertEquals(
    result.authEmail,
    "lea.dupont@fichemcv.local",
    "L'email Auth historique doit être conservé"
  );
  assertEquals(
    tables.student_login_identifiers.length,
    1,
    "Une seule réservation doit être créée"
  );
  assertEquals(
    tables.student_login_identifiers[0].auth_email,
    "lea.dupont@fichemcv.local",
    "La réservation pointe vers l'ancien email Auth"
  );

  const resolved = await resolveAuthEmailForLoginIdentifier(client, "lea4827");
  assertEquals(
    resolved,
    "lea.dupont@fichemcv.local",
    "La connexion courte doit retrouver l'email Auth réel"
  );
  assertEquals(
    await resolveAuthEmailForLoginIdentifier(client, "lea.dupont@fichemcv.local"),
    "lea.dupont@fichemcv.local",
    "L'ancien identifiant complet reste fonctionnel"
  );

  const secondResult = await createShortIdentifierForExistingStudent(
    client,
    "student-1",
    () => "lea9999"
  );
  assert(!secondResult.ok, "Un second identifiant doit être refusé");
  assertEquals(
    tables.student_login_identifiers.length,
    1,
    "Le refus de second identifiant ne modifie pas les données"
  );
}

async function assertLegacyStudentShortIdentifierFailures() {
  const nonStudentClient = createFakeClient(
    {
      students: [{ id: "student-2", user_id: "user-2", first_name: "Ada" }],
      app_users: [
        {
          id: "user-2",
          email: "teacher@fichemcv.local",
          role: "teacher",
          is_active: true,
          legacy_login_email: "teacher@fichemcv.local",
        },
      ],
      student_login_identifiers: [],
    },
    [],
    [{ id: "user-2", email: "teacher@fichemcv.local" }]
  );
  const nonStudent = await createShortIdentifierForExistingStudent(
    nonStudentClient,
    "student-2",
    () => "ada1234"
  );
  assert(!nonStudent.ok, "Un utilisateur non élève doit être refusé");

  const missingAuthTables: Record<string, Row[]> = {
    students: [{ id: "student-3", user_id: "user-3", first_name: "Anaïs" }],
    app_users: [
      {
        id: "user-3",
        email: "anais@fichemcv.local",
        role: "student",
        is_active: true,
        legacy_login_email: "anais@fichemcv.local",
      },
    ],
    student_login_identifiers: [],
  };
  const missingAuth = await createShortIdentifierForExistingStudent(
    createFakeClient(missingAuthTables),
    "student-3",
    () => "anais6208"
  );
  assert(!missingAuth.ok, "Un utilisateur Auth inexistant doit être refusé");
  assertEquals(
    missingAuthTables.student_login_identifiers.length,
    0,
    "L'échec ne doit pas créer de réservation"
  );

  const unknownStudent = await createShortIdentifierForExistingStudent(
    createFakeClient({ students: [], app_users: [], student_login_identifiers: [] }),
    "missing-student",
    () => "lea4827"
  );
  assert(!unknownStudent.ok, "Un élève inexistant doit être refusé");
}

function assertRecoveryBannerRules() {
  assert(!hasVerifiedRecoveryEmail([]), "Sans contact, le rappel doit être visible");
  assert(
    !hasVerifiedRecoveryEmail([
      {
        id: "contact-1",
        contact_type: "email",
        contact_value: "ada@example.fr",
        normalized_value: "ada@example.fr",
        is_primary: true,
        can_be_used_for_recovery: true,
        verified_at: null,
      },
    ]),
    "Un contact non vérifié ne suffit pas"
  );
  assert(
    !hasVerifiedRecoveryEmail([
      {
        id: "contact-2",
        contact_type: "email",
        contact_value: "ada@example.fr",
        normalized_value: "ada@example.fr",
        is_primary: true,
        can_be_used_for_recovery: false,
        verified_at: "2026-06-26T10:00:00Z",
      },
    ]),
    "Un contact vérifié sans consentement ne suffit pas"
  );
  assert(
    hasVerifiedRecoveryEmail([
      {
        id: "contact-3",
        contact_type: "email",
        contact_value: "ada@example.fr",
        normalized_value: "ada@example.fr",
        is_primary: true,
        can_be_used_for_recovery: true,
        verified_at: "2026-06-26T10:00:00Z",
      },
    ]),
    "Un contact vérifié avec consentement masque le rappel"
  );
  assert(
    hasRecoveryEmailContact([
      {
        id: "contact-4",
        contact_type: "email",
        contact_value: "ada@example.fr",
        normalized_value: "ada@example.fr",
        is_primary: true,
        can_be_used_for_recovery: true,
        verified_at: null,
      },
    ]),
    "Le bouton doit distinguer vérifier et ajouter"
  );
}

function assertSourceFiles() {
  const register = readFileSync("src/app/api/register-student/route.ts", "utf8");
  const registrationPage = readFileSync("src/app/inscription-eleve/page.tsx", "utf8");
  const login = readFileSync("src/app/login/page.tsx", "utf8");
  const loginRoute = readFileSync("src/app/api/auth/login/route.ts", "utf8");
  const account = readFileSync("src/app/compte/page.tsx", "utf8");
  const forgot = readFileSync("src/app/forgot-password/page.tsx", "utf8");
  const requestReset = readFileSync("src/app/api/auth/request-password-reset/route.ts", "utf8");
  const shortIdentifierRoute = readFileSync(
    "src/app/api/admin/students/short-login-identifier/route.ts",
    "utf8"
  );
  const dashboard = readFileSync("src/app/eleve/page.tsx", "utf8");
  const migrationPath =
    "supabase/migrations/20260626193000_patch8_student_login_and_recovery_consent.sql";
  const correctiveMigrationPath =
    "supabase/migrations/20260628120000_allow_legacy_auth_email_for_short_identifiers.sql";
  const migration = readFileSync(migrationPath, "utf8");
  const correctiveMigration = readFileSync(correctiveMigrationPath, "utf8");

  assert(existsSync(migrationPath), "La migration Patch 8 doit exister");
  assert(
    existsSync(correctiveMigrationPath),
    "La migration corrective des emails Auth historiques doit exister"
  );
  assertIncludes(register, "generateUniqueStudentLoginIdentifier", "La route serveur génère l'identifiant");
  assertIncludes(register, "student_login_identifiers", "La route réserve l'identifiant");
  assertIncludes(register, "validateRecoveryEmail", "L'email réel doit être validé");
  assertIncludes(register, "saveRecoveryEmailForUser", "Le contact doit être créé via le helper Patch 6");
  assertNotIncludes(registrationPage, "generateUniqueStudentLoginIdentifier", "Le client ne génère pas l'identifiant");
  assertIncludes(registrationPage, "Adresse mail personnelle", "Le champ email personnel est affiché");
  assertIncludes(registrationPage, "Utiliser cette adresse pour récupérer mon compte", "Le consentement explicite est affiché");
  assertIncludes(registrationPage, "Elle ne sera pas utilisée comme identifiant", "L'information RGPD est affichée");
  assertIncludes(login, "/api/auth/login", "La connexion doit passer par la route serveur");
  assertNotIncludes(
    login,
    "resolve-login-identifier",
    "Le client ne doit plus appeler de route publique de résolution"
  );
  assert(
    !existsSync("src/app/api/auth/resolve-login-identifier/route.ts"),
    "La route publique de résolution ne doit plus exister"
  );
  assertIncludes(
    loginRoute,
    "resolveAuthEmailForLoginIdentifier",
    "La route serveur doit résoudre l'email Auth réel côté serveur"
  );
  assertIncludes(
    loginRoute,
    "signInWithPassword",
    "La route serveur doit appeler Supabase Auth côté serveur"
  );
  assertIncludes(
    loginRoute,
    "Connexion impossible. Vérifie ton identifiant et ton mot de passe.",
    "La route serveur doit utiliser un échec générique"
  );
  assertNotIncludes(
    loginRoute,
    "authEmail:",
    "La route serveur ne doit pas exposer l'email Auth dans le JSON"
  );
  assertNotIncludes(
    loginRoute,
    "redirectTo",
    "La route serveur ne doit pas exposer d'information dérivée de l'utilisateur"
  );
  assertIncludes(forgot, "normalizeLoginIdentifier", "Le reset normalise les identifiants courts");
  assertIncludes(requestReset, "student_login_identifiers", "Le reset doit résoudre les identifiants courts associés");
  assertIncludes(requestReset, '.eq("can_be_used_for_recovery", true)', "Le reset exige le consentement");
  assertIncludes(shortIdentifierRoute, "createShortIdentifierForExistingStudent", "La route prof doit réutiliser le helper serveur");
  assertIncludes(shortIdentifierRoute, "getCurrentTeacherClassIds", "La route prof doit vérifier l'autorisation classe");
  assertIncludes(account, "Ton nouvel identifiant de connexion est", "La page compte doit afficher l'identifiant court");
  assertIncludes(account, "Ton ancien identifiant reste temporairement utilisable", "La page compte doit afficher l'identifiant historique");
  assertIncludes(dashboard, "Sécurise ton compte", "Le bandeau de rappel doit exister");
  assertIncludes(dashboard, "Vérifier mon adresse", "Le CTA de vérification doit exister");
  assertIncludes(dashboard, "Ajouter une adresse", "Le CTA d'ajout doit exister");
  assertIncludes(migration, "student_login_identifiers", "La table de réservation doit exister");
  assertIncludes(migration, "on delete set null", "La suppression utilisateur ne doit pas recycler l'identifiant");
  assertIncludes(
    migration,
    "check (auth_email = identifier || '@fichemcv.local')",
    "L'ancienne migration appliquée doit rester dans sa logique initiale"
  );
  assertNotIncludes(
    migration,
    "drop constraint student_login_identifiers_auth_email_check",
    "L'ancienne migration ne doit pas être utilisée comme migration rétroactive"
  );
  assertNotIncludes(
    migration,
    "student_login_identifiers_user_id_unique_idx",
    "L'ancienne migration ne doit pas porter l'index correctif"
  );
  assertIncludes(
    correctiveMigration,
    "drop constraint if exists student_login_identifiers_auth_email_check",
    "La migration corrective doit autoriser les emails Auth historiques"
  );
  assertIncludes(
    correctiveMigration,
    "having count(*) > 1",
    "La migration corrective doit protéger contre les doublons user_id"
  );
  assertIncludes(
    correctiveMigration,
    "student_login_identifiers_user_id_unique_idx",
    "Un seul identifiant court doit être associé par user_id"
  );
  assertIncludes(migration, "can_be_used_for_recovery boolean not null default false", "Le consentement doit être stocké");
  assertIncludes(migration, "Backfill limité aux contacts email historiques créés par le formulaire", "Le commentaire de backfill doit être explicite");
  const docs = readFileSync("docs/auth-password-recovery.md", "utf8");
  assertIncludes(docs, "avant Patch 8, les contacts email applicatifs", "La documentation doit justifier le backfill");
}

async function main() {
  assertIdentifierNormalization();
  await assertIdentifierAvailability();
  assertLoginNormalization();
  await assertLegacyStudentShortIdentifierCreation();
  await assertLegacyStudentShortIdentifierFailures();
  assertRecoveryBannerRules();
  assertSourceFiles();

  console.log("Patch 8 student login tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
