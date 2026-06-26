import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getMaskedAccountContact,
  getReadableAccountRole,
  getReadableAccountStatus,
  isLegacyAccountIdentifier,
  loadAccountOverview,
} from "../src/lib/auth/accountManagement";
import { maskContactValue } from "../src/lib/auth/contactDisplay";

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

function assertIncludes(source: string, expected: string, message: string) {
  assert(source.includes(expected), message);
}

function assertNotIncludes(source: string, unexpected: string, message: string) {
  assert(!source.includes(unexpected), message);
}

function assertMatches(source: string, pattern: RegExp, message: string) {
  assert(pattern.test(source), message);
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

  order() {
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

async function assertAccountAccessByRole() {
  const roles = [
    ["admin", "admin", "Administrateur"],
    ["teacher", "professeur", "Professeur"],
    ["student", "eleve", "Élève"],
  ] as const;

  for (const [appRole, authRole, expectedLabel] of roles) {
    const authUser = {
      id: `auth-${authRole}`,
      email: `${authRole}@example.test`,
      app_metadata: { role: authRole },
    };
    const client = createFakeClient({
      app_users: [
        {
          id: authUser.id,
          email: `old-${authRole}@example.test`,
          role: appRole,
          is_active: true,
          account_status: "active",
          legacy_login_email: null,
        },
      ],
      students:
        appRole === "student"
          ? [
              {
                user_id: authUser.id,
                first_name: "Ada",
                last_name: "Lovelace",
              },
            ]
          : [],
      teachers:
        appRole === "teacher"
          ? [
              {
                user_id: authUser.id,
                first_name: "Grace",
                last_name: "Hopper",
              },
            ]
          : [],
      user_contacts: [],
    });

    const { overview, errorMessage } = await loadAccountOverview(client, authUser);

    assert(overview, `${authRole} doit accéder à /compte`);
    assertEquals(errorMessage, "", `${authRole} ne doit pas avoir d'erreur`);
    assertEquals(
      overview.roleLabel,
      expectedLabel,
      `Le rôle ${authRole} doit être affiché avec un libellé lisible`
    );
  }
}

async function assertAuthWithoutAppUserIsRejected() {
  const client = createFakeClient({
    app_users: [],
    students: [
      {
        user_id: "other-user",
        email: "orphan@example.test",
        first_name: "Email",
        last_name: "Match",
      },
    ],
    teachers: [],
    user_contacts: [],
  });

  const { overview, errorMessage } = await loadAccountOverview(client, {
    id: "auth-without-app-user",
    email: "orphan@example.test",
    app_metadata: { role: "eleve" },
  });

  assertEquals(
    overview,
    null,
    "Un compte Auth sans app_users doit être refusé proprement"
  );
  assertIncludes(
    errorMessage,
    "Aucun compte applicatif",
    "Le message de refus doit rester non technique"
  );
}

async function assertContactsAndLegacyStates() {
  const client = createFakeClient({
    app_users: [
      {
        id: "auth-student",
        email: "historique@fichemcv.local",
        role: "student",
        is_active: true,
        account_status: "recovery_required",
        legacy_login_email: "historique@fichemcv.local",
      },
    ],
    students: [
      {
        user_id: "auth-student",
        first_name: "Linus",
        last_name: "Torvalds",
      },
    ],
    teachers: [],
    user_contacts: [
      {
        id: "contact-email-verified",
        user_id: "auth-student",
        contact_type: "email",
        contact_value: "laurent.dupont@gmail.com",
        normalized_value: "laurent.dupont@gmail.com",
        is_primary: true,
        verified_at: "2026-06-25T10:00:00Z",
      },
      {
        id: "contact-email-unverified",
        user_id: "auth-student",
        contact_type: "email",
        contact_value: "secondary@example.test",
        normalized_value: "secondary@example.test",
        is_primary: false,
        verified_at: null,
      },
      {
        id: "contact-phone-verified",
        user_id: "auth-student",
        contact_type: "phone",
        contact_value: "06 12 34 56 42",
        normalized_value: "+33612345642",
        is_primary: true,
        verified_at: "2026-06-25T10:00:00Z",
      },
      {
        id: "other-user-contact",
        user_id: "other-user",
        contact_type: "email",
        contact_value: "other@example.test",
        normalized_value: "other@example.test",
        is_primary: true,
        verified_at: "2026-06-25T10:00:00Z",
      },
    ],
  });

  const { overview } = await loadAccountOverview(client, {
    id: "auth-student",
    email: "historique@fichemcv.local",
    app_metadata: { role: "eleve" },
  });

  assert(overview, "Le compte élève doit être chargé");
  assertEquals(
    overview.accountStatusLabel,
    "Récupération requise",
    "Le statut du compte doit être lisible"
  );
  assert(
    overview.isLegacyAccount,
    "Un compte avec legacy_login_email ou @fichemcv.local doit être historique"
  );
  assertEquals(
    overview.contacts.length,
    3,
    "Seuls les contacts du compte courant doivent être chargés"
  );
  assertEquals(
    getMaskedAccountContact(overview.contacts[0]),
    "la•••••t@gmail.com",
    "L'email doit être masqué"
  );
  assertEquals(
    getMaskedAccountContact(overview.contacts[2]),
    "06 •• •• •• 42",
    "Le téléphone doit être masqué"
  );
}

function assertLabelsAndMasking() {
  assertEquals(
    getReadableAccountRole("admin"),
    "Administrateur",
    "Le rôle admin doit être lisible"
  );
  assertEquals(
    getReadableAccountRole("teacher"),
    "Professeur",
    "Le rôle professeur doit être lisible"
  );
  assertEquals(
    getReadableAccountRole("student"),
    "Élève",
    "Le rôle élève doit être lisible"
  );
  assertEquals(
    getReadableAccountStatus("active"),
    "Actif",
    "Le statut active doit être lisible"
  );
  assertEquals(
    getReadableAccountStatus("pending"),
    "En attente",
    "Le statut pending doit être lisible"
  );
  assertEquals(
    getReadableAccountStatus("suspended"),
    "Suspendu",
    "Le statut suspended doit être lisible"
  );
  assertEquals(
    getReadableAccountStatus("disabled"),
    "Désactivé",
    "Le statut disabled doit être lisible"
  );
  assert(
    isLegacyAccountIdentifier("user@fichemcv.local", null),
    "Un email Auth @fichemcv.local doit être détecté"
  );
  assert(
    isLegacyAccountIdentifier("user@example.test", "legacy@fichemcv.local"),
    "legacy_login_email doit déclencher la détection historique"
  );
  assert(
    !isLegacyAccountIdentifier("user@example.test", null),
    "Un compte migré ne doit pas être signalé historique"
  );
  assertEquals(
    maskContactValue("a@b", "email"),
    "a•••••@b",
    "Un email court doit être masqué sans erreur"
  );
  assertEquals(
    maskContactValue("12", "phone"),
    "••",
    "Un téléphone trop court doit être masqué sans erreur"
  );
}

function assertSourceFiles() {
  const pagePath = "src/app/compte/page.tsx";
  const page = readFileSync(join(process.cwd(), pagePath), "utf8");
  const accountManagement = readFileSync(
    join(process.cwd(), "src/lib/auth/accountManagement.ts"),
    "utf8"
  );
  const passwordForm = readFileSync(
    join(process.cwd(), "src/components/PasswordChangeForm.tsx"),
    "utf8"
  );
  const studentProfile = readFileSync(
    join(process.cwd(), "src/app/eleve/profil/page.tsx"),
    "utf8"
  );
  const navigation = readFileSync(
    join(process.cwd(), "src/components/AppNavigation.tsx"),
    "utf8"
  );

  assert(existsSync(pagePath), "La page /compte doit exister");
  assertIncludes(page, "requireUser()", "/compte doit exiger une session valide");
  assertIncludes(page, "loadAccountOverview", "/compte doit charger le compte courant");
  assertIncludes(
    accountManagement,
    '.eq("id", authUser.id)',
    "app_users doit être lié par app_users.id = authUser.id"
  );
  assertIncludes(
    accountManagement,
    '.eq("user_id", authUserId)',
    "Les profils métier et contacts doivent être liés par user_id courant"
  );
  assertNotIncludes(
    accountManagement,
    '.eq("email"',
    "Aucun rattachement du compte courant ne doit se faire par email"
  );
  assertNotIncludes(
    page,
    "searchParams",
    "/compte ne doit pas accepter de user_id depuis l'URL"
  );
  assertNotIncludes(
    page,
    "params",
    "/compte ne doit pas accepter de user_id depuis les paramètres"
  );
  assertIncludes(
    page,
    "Aucune coordonnée de récupération n’est encore enregistrée.",
    "L'état vide user_contacts doit être affiché"
  );
  assertIncludes(
    page,
    "Ton compte utilise encore un identifiant de connexion interne.",
    "L'encadré compte historique doit être présent"
  );
  assertIncludes(
    page,
    "Identifiant de connexion",
    "La page doit distinguer l'identifiant de connexion"
  );
  assertIncludes(
    page,
    "Adresse email de récupération",
    "La page doit distinguer l'adresse de récupération"
  );
  assertIncludes(
    page,
    "Téléphone bientôt disponible",
    "Le téléphone doit rester préparé comme fonctionnalité future"
  );
  assertIncludes(
    page,
    "RecoveryEmailForm",
    "La page /compte doit intégrer le formulaire d'email de récupération"
  );

  assertIncludes(
    passwordForm,
    "supabase.auth.updateUser",
    "Le changement de mot de passe doit utiliser updateUser côté utilisateur connecté"
  );
  assertIncludes(
    passwordForm,
    "password: newPassword",
    "Le nouveau mot de passe doit être transmis à updateUser"
  );
  assertIncludes(
    passwordForm,
    "Le mot de passe doit contenir au moins 8 caractères.",
    "Un mot de passe trop court doit être refusé"
  );
  assertIncludes(
    passwordForm,
    "Les deux mots de passe ne correspondent pas.",
    "Une confirmation différente doit être refusée"
  );
  assertIncludes(
    passwordForm,
    "Ton mot de passe a été modifié.",
    "Le message de succès attendu doit être affiché"
  );
  assertNotIncludes(
    passwordForm,
    "createAdminClient",
    "Le composant client ne doit pas utiliser le service role"
  );
  assertNotIncludes(
    passwordForm,
    "SUPABASE_SERVICE_ROLE_KEY",
    "Le composant client ne doit pas exposer le service role"
  );
  assertNotIncludes(
    passwordForm,
    "console.",
    "Le composant client ne doit pas journaliser le mot de passe"
  );
  assertNotIncludes(
    passwordForm,
    "auth.signOut",
    "Le changement volontaire doit conserver la session ouverte"
  );

  assertIncludes(
    studentProfile,
    "PasswordChangeForm",
    "Le profil élève doit utiliser le formulaire générique"
  );
  assertMatches(
    navigation,
    /Mon compte/,
    "Le lien Mon compte doit être présent dans la navigation"
  );
  assertIncludes(
    navigation,
    'navigateTo("/compte")',
    "La navigation doit pointer vers /compte"
  );
}

async function main() {
  assertLabelsAndMasking();
  await assertAccountAccessByRole();
  await assertAuthWithoutAppUserIsRejected();
  await assertContactsAndLegacyStates();
  assertSourceFiles();

  console.log("Account management tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
