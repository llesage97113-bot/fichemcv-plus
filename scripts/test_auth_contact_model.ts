import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeContactEmail,
  normalizeFrenchPhoneNumber,
} from "../src/lib/auth/contactNormalizers";

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

function assertThrows(fn: () => unknown, message: string) {
  let didThrow = false;

  try {
    fn();
  } catch {
    didThrow = true;
  }

  assert(didThrow, message);
}

function assertIncludes(source: string, expected: string, message: string) {
  assert(source.includes(expected), message);
}

function assertMatches(source: string, pattern: RegExp, message: string) {
  assert(pattern.test(source), message);
}

function assertNotIncludes(source: string, unexpected: string, message: string) {
  assert(!source.includes(unexpected), message);
}

function assertEmailNormalization() {
  assertEquals(
    normalizeContactEmail("  JEAN.DUPONT@Example.FR  "),
    "jean.dupont@example.fr",
    "L'email doit être trimé et passé en minuscules"
  );

  assertEquals(
    normalizeContactEmail("prenom.nom+test@sous-domaine.example.fr"),
    "prenom.nom+test@sous-domaine.example.fr",
    "Le domaine ne doit pas être transformé autrement que par la casse"
  );

  assertThrows(
    () => normalizeContactEmail(""),
    "Un email vide doit être rejeté"
  );
  assertThrows(
    () => normalizeContactEmail("prenom.nom"),
    "Un email sans domaine doit être rejeté"
  );
  assertThrows(
    () => normalizeContactEmail("prenom@"),
    "Un email manifestement invalide doit être rejeté"
  );
}

function assertPhoneNormalization() {
  const validCases = [
    ["06 12 34 56 78", "+33612345678"],
    ["07.12.34.56.78", "+33712345678"],
    ["06-12-34-56-78", "+33612345678"],
    ["(+33) 6 12 34 56 78", "+33612345678"],
    ["+33 7 12 34 56 78", "+33712345678"],
    ["0033 6 12 34 56 78", "+33612345678"],
    ["0590 12 34 56", "+590590123456"],
    ["0690.12.34.56", "+590690123456"],
    ["0691-12-34-56", "+590691123456"],
    ["+590 590 12 34 56", "+590590123456"],
    ["+590 690 12 34 56", "+590690123456"],
    ["00590 691 12 34 56", "+590691123456"],
  ] as const;

  for (const [input, expected] of validCases) {
    assertEquals(
      normalizeFrenchPhoneNumber(input),
      expected,
      `Normalisation téléphone incorrecte pour ${input}`
    );
  }

  const invalidCases = [
    "",
    "01 23 45 67 89",
    "06 12 34 56",
    "06 12 34 56 78 90",
    "+33 590 12 34 56",
    "0692 12 34 56",
    "+590 692 12 34 56",
    "590 12 34 56",
    "690 12 34 56",
    "+1 202 555 0101",
  ];

  for (const input of invalidCases) {
    assertThrows(
      () => normalizeFrenchPhoneNumber(input),
      `Le numéro invalide ou ambigu doit être rejeté: ${input}`
    );
  }
}

function assertMigrationSql() {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20260625_prepare_auth_contact_model.sql"
    ),
    "utf8"
  );
  const lowerMigration = migration.toLowerCase();

  for (const column of [
    "account_status text not null default 'active'",
    "legacy_login_email text null",
    "updated_at timestamptz not null default now()",
  ]) {
    assertIncludes(migration, column, `Colonne app_users manquante: ${column}`);
  }

  for (const status of [
    "pending",
    "active",
    "suspended",
    "recovery_required",
    "disabled",
  ]) {
    assertIncludes(
      migration,
      `'${status}'`,
      `Statut account_status manquant: ${status}`
    );
  }

  assertIncludes(
    migration,
    "create table if not exists public.user_contacts",
    "La table user_contacts doit être créée de manière idempotente"
  );

  for (const column of [
    "id uuid primary key default gen_random_uuid()",
    "user_id uuid not null",
    "contact_type text not null",
    "contact_value text not null",
    "normalized_value text not null",
    "is_primary boolean not null default false",
    "verified_at timestamptz null",
  ]) {
    assertIncludes(migration, column, `Colonne user_contacts manquante: ${column}`);
  }

  assertIncludes(
    migration,
    "foreign key (user_id)",
    "La clé étrangère vers app_users.id doit exister"
  );
  assertIncludes(
    migration,
    "references public.app_users(id)",
    "La clé étrangère doit viser public.app_users(id)"
  );
  assertIncludes(
    migration,
    "on delete cascade",
    "La suppression en cascade doit être configurée"
  );
  assertIncludes(
    migration,
    "check (contact_type in ('email', 'phone'))",
    "Les types de contact email et phone doivent être contraints"
  );
  assertIncludes(
    migration,
    "check (btrim(contact_value) <> '')",
    "contact_value vide doit être interdit"
  );
  assertIncludes(
    migration,
    "check (btrim(normalized_value) <> '')",
    "normalized_value vide doit être interdit"
  );
  assertIncludes(
    migration,
    "unique (contact_type, normalized_value)",
    "L'unicité globale des coordonnées normalisées doit être contrainte"
  );
  assertIncludes(
    migration,
    "where is_primary",
    "Une seule coordonnée principale par utilisateur et type doit être contrainte"
  );
  assertIncludes(
    migration,
    "on public.user_contacts (user_id)",
    "L'index user_id doit exister"
  );
  assertIncludes(
    migration,
    "on public.user_contacts (contact_type, normalized_value)",
    "L'index contact_type + normalized_value doit exister"
  );
  assertIncludes(
    migration,
    "alter table public.user_contacts enable row level security",
    "La RLS doit être activée sur user_contacts"
  );

  assertIncludes(
    migration,
    "Users can read their own contacts",
    "La policy SELECT personnelle doit exister"
  );
  assertIncludes(
    migration,
    "for select",
    "La policy personnelle doit autoriser SELECT"
  );
  assertIncludes(
    migration,
    "using (auth.uid() = user_id)",
    "La lecture doit être limitée à l'utilisateur connecté"
  );

  for (const forbiddenPolicy of [
    "create policy \"Users can insert their own unverified contacts\"",
    "create policy \"Users can update their own unverified contacts\"",
    "create policy \"Users can delete their own non-primary contacts\"",
  ]) {
    assertNotIncludes(
      lowerMigration,
      forbiddenPolicy.toLowerCase(),
      `Aucune policy client d'écriture ne doit être créée: ${forbiddenPolicy}`
    );
  }

  for (const command of ["for insert", "for update", "for delete"]) {
    assertNotIncludes(
      lowerMigration,
      command,
      `Aucune policy client ${command.toUpperCase()} ne doit exister sur user_contacts`
    );
  }

  assertIncludes(
    migration,
    "No client INSERT/UPDATE/DELETE policies are created in this patch.",
    "La migration doit documenter que les écritures sont réservées au serveur"
  );
  assertIncludes(
    migration,
    "Writes to user_contacts are temporarily reserved for future server routes",
    "La migration doit expliquer que les routes serveur géreront les mutations"
  );

  assertIncludes(
    migration,
    "protect_app_users_client_admin_fields",
    "Un trigger doit protéger les champs administratifs de app_users"
  );
  assertMatches(
    lowerMigration,
    /new\.account_status\s+is\s+distinct\s+from\s+old\.account_status/,
    "Le trigger doit interdire la modification client de account_status"
  );
  assertMatches(
    lowerMigration,
    /new\.legacy_login_email\s+is\s+distinct\s+from\s+old\.legacy_login_email/,
    "Le trigger doit interdire la modification client de legacy_login_email"
  );
  assertIncludes(
    migration,
    "current_user in ('anon', 'authenticated')",
    "Les triggers doivent identifier les rôles client Supabase/PostgREST"
  );
  assertIncludes(
    migration,
    "current_setting('request.jwt.claim.role', true)",
    "Les triggers doivent aussi vérifier le claim JWT de rôle PostgREST"
  );
  assertIncludes(
    migration,
    "JWT role claim \"anon\"",
    "La migration doit documenter le rôle JWT anon"
  );
  assertIncludes(
    migration,
    "\"authenticated\" after sign-in",
    "La migration doit documenter le rôle JWT authenticated"
  );
  assertIncludes(
    migration,
    "server service role carry an elevated role claim",
    "La migration doit documenter que le service role n'est pas traité comme rôle client"
  );
  assertIncludes(
    migration,
    "public.is_client_api_role()",
    "Les triggers doivent utiliser le helper centralisé de détection client"
  );

  assertIncludes(
    migration,
    "protect_user_contacts_client_fields",
    "Un trigger doit protéger user_id et verified_at pour les rôles clients"
  );
  assertMatches(
    lowerMigration,
    /new\.verified_at\s+is\s+distinct\s+from\s+old\.verified_at/,
    "Le trigger doit interdire la modification client de verified_at"
  );
  assertMatches(
    lowerMigration,
    /new\.user_id\s+is\s+distinct\s+from\s+old\.user_id/,
    "Le trigger doit interdire la modification client de user_id"
  );
  assertIncludes(
    migration,
    "revoke update (account_status) on public.app_users from anon, authenticated",
    "Les rôles clients ne doivent pas pouvoir modifier account_status"
  );
  assertIncludes(
    migration,
    "revoke update (legacy_login_email) on public.app_users from anon, authenticated",
    "Les rôles clients ne doivent pas pouvoir modifier legacy_login_email"
  );
  assertIncludes(
    migration,
    "lower(email) like '%@fichemcv.local'",
    "Seuls les emails legacy @fichemcv.local doivent alimenter legacy_login_email"
  );

  for (const forbidden of [
    "password",
    "token",
    "otp",
    "temporary_password",
    "reset_password",
  ]) {
    assert(
      !lowerMigration.includes(forbidden),
      `La migration ne doit pas contenir de colonne ou logique sensible: ${forbidden}`
    );
  }
}

assertEmailNormalization();
assertPhoneNormalization();
assertMigrationSql();

console.log("Modèle Auth contacts validé.");
