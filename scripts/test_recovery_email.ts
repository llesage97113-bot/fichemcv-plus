import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  compareRecoveryEmails,
  isInternalRecoveryEmail,
  normalizeRecoveryEmail,
  RECOVERY_EMAIL_ALREADY_REGISTERED_MESSAGE,
  RECOVERY_EMAIL_CONFLICT_MESSAGE,
  RECOVERY_EMAIL_GENERIC_ERROR_MESSAGE,
  RECOVERY_EMAIL_INTERNAL_MESSAGE,
  RECOVERY_EMAIL_INVALID_MESSAGE,
  RECOVERY_EMAIL_MISMATCH_MESSAGE,
  RECOVERY_EMAIL_SUCCESS_MESSAGE,
  saveRecoveryEmailForUser,
  validateRecoveryEmail,
} from "../src/lib/auth/recoveryEmail";

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

function getValidationMessage(result: unknown) {
  assert(
    typeof result === "object" &&
      result !== null &&
      "message" in result &&
      typeof (result as { message?: unknown }).message === "string",
    "Le résultat de validation doit contenir un message d'erreur"
  );

  return (result as { message: string }).message;
}

class FakeQuery {
  private filters: { column: string; value: unknown; operator: "eq" | "neq" }[] = [];

  constructor(
    private readonly tables: Record<string, Row[]>,
    private readonly table: string,
    private readonly action: "select" | "insert" | "update",
    private readonly values?: unknown
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value, operator: "eq" });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ column, value, operator: "neq" });
    return this;
  }

  private rows() {
    return this.tables[this.table] ?? [];
  }

  private matchingRows() {
    return this.rows().filter((row) =>
      this.filters.every((filter) =>
        filter.operator === "eq"
          ? row[filter.column] === filter.value
          : row[filter.column] !== filter.value
      )
    );
  }

  async maybeSingle() {
    const rows = this.matchingRows();

    if (rows.length > 1) {
      return { data: null, error: { message: `Expected one row, got ${rows.length}` } };
    }

    return { data: rows[0] ?? null, error: null };
  }

  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    if (this.action === "insert") {
      const inserted = Array.isArray(this.values) ? this.values : [this.values];
      this.tables[this.table] = [
        ...this.rows(),
        ...inserted.map((row, index) => ({
          id: `inserted-${this.rows().length + index + 1}`,
          ...(row as Row),
        })),
      ];

      return Promise.resolve({ data: inserted, error: null }).then(onfulfilled, onrejected);
    }

    if (this.action === "update") {
      let updated = 0;

      this.tables[this.table] = this.rows().map((row) => {
        const matches = this.filters.every((filter) =>
          filter.operator === "eq"
            ? row[filter.column] === filter.value
            : row[filter.column] !== filter.value
        );

        if (!matches) {
          return row;
        }

        updated += 1;
        return { ...row, ...(this.values as Row) };
      });

      return Promise.resolve({ data: { count: updated }, error: null }).then(
        onfulfilled,
        onrejected
      );
    }

    return Promise.resolve({ data: this.matchingRows(), error: null }).then(
      onfulfilled,
      onrejected
    );
  }
}

function createFakeClient(tables: Record<string, Row[]>) {
  return {
    tables,
    from(table: string) {
      return {
        select() {
          return new FakeQuery(tables, table, "select");
        },
        insert(values: unknown) {
          return new FakeQuery(tables, table, "insert", values);
        },
        update(values: unknown) {
          return new FakeQuery(tables, table, "update", values);
        },
      };
    },
  };
}

function assertValidation() {
  assertEquals(
    normalizeRecoveryEmail("  ADA.LOVELACE@Example.FR  "),
    "ada.lovelace@example.fr",
    "L'email doit être trimé et normalisé en minuscules"
  );

  assert(validateRecoveryEmail("ada@example.fr").ok, "Un email valide doit passer");
  const invalidEmail = validateRecoveryEmail("adresse-invalide");
  if (invalidEmail.ok) {
    throw new Error("Un email invalide doit échouer");
  }
  assertEquals(
    getValidationMessage(invalidEmail),
    RECOVERY_EMAIL_INVALID_MESSAGE,
    "Un email invalide doit renvoyer le message utilisateur attendu"
  );
  const mismatchedEmail = compareRecoveryEmails("ada@example.fr", "grace@example.fr");
  if (mismatchedEmail.ok) {
    throw new Error("Une confirmation différente doit échouer");
  }
  assertEquals(
    getValidationMessage(mismatchedEmail),
    RECOVERY_EMAIL_MISMATCH_MESSAGE,
    "Une confirmation différente doit être refusée"
  );
  const internalEmail = validateRecoveryEmail("eleve@fichemcv.local");
  if (internalEmail.ok) {
    throw new Error("Un email interne doit échouer");
  }
  assertEquals(
    getValidationMessage(internalEmail),
    RECOVERY_EMAIL_INTERNAL_MESSAGE,
    "Un email @fichemcv.local doit être refusé"
  );
  assert(
    isInternalRecoveryEmail("test@auth.fichemcv.internal"),
    "Un domaine interne équivalent doit être refusé"
  );
}

async function assertCreationUsesAuthUserIdOnly() {
  const client = createFakeClient({
    app_users: [
      {
        id: "auth-user-1",
        is_active: true,
        account_status: "active",
      },
    ],
    user_contacts: [],
  });

  const result = await saveRecoveryEmailForUser(
    client,
    "auth-user-1",
    "ada@example.fr"
  );

  assert(result.ok, "Le premier email doit être créé");
  assertEquals(result.message, RECOVERY_EMAIL_SUCCESS_MESSAGE, "Le succès doit être propre");
  assertEquals(
    client.tables.user_contacts.length,
    1,
    "Un seul contact doit être créé"
  );
  assertEquals(
    client.tables.user_contacts[0].user_id,
    "auth-user-1",
    "Le contact doit être lié à authUser.id"
  );
  assertEquals(
    client.tables.user_contacts[0].verified_at,
    null,
    "Le contact créé doit rester non vérifié"
  );
  assertEquals(
    client.tables.user_contacts[0].is_primary,
    true,
    "Le premier email doit être principal"
  );
}

async function assertAccountGuards() {
  const missing = createFakeClient({ app_users: [], user_contacts: [] });
  const missingResult = await saveRecoveryEmailForUser(
    missing,
    "auth-without-app-user",
    "ada@example.fr"
  );
  assertEquals(
    missingResult.message,
    RECOVERY_EMAIL_GENERIC_ERROR_MESSAGE,
    "Un compte Auth sans app_users doit être refusé sans détail technique"
  );

  const disabled = createFakeClient({
    app_users: [{ id: "disabled-user", is_active: false, account_status: "disabled" }],
    user_contacts: [],
  });
  const disabledResult = await saveRecoveryEmailForUser(
    disabled,
    "disabled-user",
    "ada@example.fr"
  );
  assertEquals(
    disabledResult.message,
    RECOVERY_EMAIL_GENERIC_ERROR_MESSAGE,
    "Un compte désactivé doit être refusé sans détail technique"
  );
}

async function assertDuplicateRules() {
  const sameUser = createFakeClient({
    app_users: [{ id: "auth-user-1", is_active: true, account_status: "active" }],
    user_contacts: [
      {
        id: "contact-1",
        user_id: "auth-user-1",
        contact_type: "email",
        contact_value: "ada@example.fr",
        normalized_value: "ada@example.fr",
        is_primary: true,
        verified_at: null,
      },
    ],
  });
  const sameUserResult = await saveRecoveryEmailForUser(
    sameUser,
    "auth-user-1",
    "ada@example.fr"
  );
  assertEquals(
    sameUserResult.message,
    RECOVERY_EMAIL_ALREADY_REGISTERED_MESSAGE,
    "Le doublon du même compte doit être signalé proprement"
  );

  const otherUser = createFakeClient({
    app_users: [{ id: "auth-user-1", is_active: true, account_status: "active" }],
    user_contacts: [
      {
        id: "contact-2",
        user_id: "other-user",
        contact_type: "email",
        contact_value: "ada@example.fr",
        normalized_value: "ada@example.fr",
        is_primary: true,
        verified_at: null,
      },
    ],
  });
  const otherUserResult = await saveRecoveryEmailForUser(
    otherUser,
    "auth-user-1",
    "ada@example.fr"
  );
  assertEquals(
    otherUserResult.message,
    RECOVERY_EMAIL_CONFLICT_MESSAGE,
    "Le doublon externe doit être refusé sans identifier l'autre compte"
  );
  assertNotIncludes(
    otherUserResult.message,
    "other-user",
    "Le message de conflit ne doit pas exposer l'identité de l'autre compte"
  );
}

async function assertReplacementAndSecondaryRules() {
  const replaceable = createFakeClient({
    app_users: [{ id: "auth-user-1", is_active: true, account_status: "active" }],
    user_contacts: [
      {
        id: "unverified-email",
        user_id: "auth-user-1",
        contact_type: "email",
        contact_value: "old@example.fr",
        normalized_value: "old@example.fr",
        is_primary: true,
        verified_at: null,
      },
    ],
  });
  await saveRecoveryEmailForUser(replaceable, "auth-user-1", "new@example.fr");
  assertEquals(
    replaceable.tables.user_contacts.length,
    1,
    "Un email non vérifié unique doit être remplacé sans seconde ligne"
  );
  assertEquals(
    replaceable.tables.user_contacts[0].normalized_value,
    "new@example.fr",
    "Le remplacement doit mettre à jour la valeur normalisée"
  );

  const secondary = createFakeClient({
    app_users: [{ id: "auth-user-1", is_active: true, account_status: "active" }],
    user_contacts: [
      {
        id: "verified-email",
        user_id: "auth-user-1",
        contact_type: "email",
        contact_value: "verified@example.fr",
        normalized_value: "verified@example.fr",
        is_primary: true,
        verified_at: "2026-06-25T10:00:00Z",
      },
    ],
  });
  await saveRecoveryEmailForUser(secondary, "auth-user-1", "new@example.fr");
  assertEquals(
    secondary.tables.user_contacts.length,
    2,
    "Un email vérifié peut recevoir un email non vérifié secondaire"
  );
  assertEquals(
    secondary.tables.user_contacts[1].is_primary,
    false,
    "L'email ajouté après un vérifié doit être secondaire"
  );

  const blocked = createFakeClient({
    app_users: [{ id: "auth-user-1", is_active: true, account_status: "active" }],
    user_contacts: [
      {
        id: "verified-email",
        user_id: "auth-user-1",
        contact_type: "email",
        contact_value: "verified@example.fr",
        normalized_value: "verified@example.fr",
        is_primary: true,
        verified_at: "2026-06-25T10:00:00Z",
      },
      {
        id: "pending-email",
        user_id: "auth-user-1",
        contact_type: "email",
        contact_value: "pending@example.fr",
        normalized_value: "pending@example.fr",
        is_primary: false,
        verified_at: null,
      },
    ],
  });
  const blockedResult = await saveRecoveryEmailForUser(
    blocked,
    "auth-user-1",
    "third@example.fr"
  );
  assertEquals(
    blockedResult.message,
    RECOVERY_EMAIL_CONFLICT_MESSAGE,
    "Un second email non vérifié doit être refusé si un vérifié existe déjà"
  );
}

function assertSourceFiles() {
  const routePath = "src/app/api/account/recovery-email/route.ts";
  const formPath = "src/components/RecoveryEmailForm.tsx";
  const pagePath = "src/app/compte/page.tsx";
  const route = readFileSync(join(process.cwd(), routePath), "utf8");
  const form = readFileSync(join(process.cwd(), formPath), "utf8");
  const page = readFileSync(join(process.cwd(), pagePath), "utf8");

  assert(existsSync(routePath), "La route serveur dédiée doit exister");
  assertIncludes(route, "export async function POST", "La route doit accepter POST");
  assertIncludes(route, "supabase.auth.getUser()", "La route doit récupérer l'utilisateur courant");
  assertIncludes(route, "user.id", "La route doit utiliser authUser.id pour l'écriture");
  assertIncludes(route, "createAdminClient", "La route serveur peut utiliser le service role");
  assertNotIncludes(route, "updateUser({ email", "La route ne doit pas modifier auth.users.email");
  assertNotIncludes(route, "verified_at: new Date", "La route ne doit pas marquer l'email vérifié");
  assertNotIncludes(route, "token", "La route ne doit pas créer de token");
  assertNotIncludes(route, "otp", "La route ne doit pas créer d'OTP");

  assertIncludes(form, "email,", "Le formulaire doit transmettre email");
  assertIncludes(form, "confirmEmail,", "Le formulaire doit transmettre confirmEmail");
  assertNotIncludes(form, "user_id", "Le formulaire ne doit jamais transmettre user_id");
  assertNotIncludes(form, "auth_user_id", "Le formulaire ne doit jamais transmettre auth_user_id");
  assertNotIncludes(form, "app_user_id", "Le formulaire ne doit jamais transmettre app_user_id");
  assertNotIncludes(form, "role", "Le formulaire ne doit jamais transmettre role");
  assertNotIncludes(form, "verified_at", "Le formulaire ne doit jamais transmettre verified_at");
  assertNotIncludes(form, "is_primary", "Le formulaire ne doit jamais transmettre is_primary");
  assertNotIncludes(form, "from(\"user_contacts\")", "Le composant client ne doit pas écrire directement");
  assertNotIncludes(form, "createAdminClient", "Le composant client ne doit pas utiliser le service role");
  assertNotIncludes(form, "SUPABASE_SERVICE_ROLE_KEY", "Le composant client ne doit pas exposer le service role");
  assertIncludes(form, "router.refresh()", "Le formulaire doit rafraîchir /compte après succès");

  assertIncludes(page, "RecoveryEmailForm", "Le formulaire doit être présent dans /compte");
  assertIncludes(
    page,
    "L’adresse enregistrée ne sera utilisable pour la récupération",
    "La page doit expliquer la vérification future"
  );
  assertIncludes(page, "Téléphone bientôt disponible", "Le téléphone doit rester futur");
  assertIncludes(page, "getMaskedAccountContact", "Les contacts doivent être affichés masqués");
  assertIncludes(page, "getReadableContactVerification", "Le statut Vérifié/Non vérifié doit être affiché");
  assertIncludes(page, "getReadableContactPriority", "Le statut principal/secondaire doit être affiché");
}

async function main() {
  assertValidation();
  await assertCreationUsesAuthUserIdOnly();
  await assertAccountGuards();
  await assertDuplicateRules();
  await assertReplacementAndSecondaryRules();
  assertSourceFiles();

  console.log("Recovery email tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
