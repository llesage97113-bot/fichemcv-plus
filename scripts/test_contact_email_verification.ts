import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTACT_VERIFICATION_RECENT_LIMIT_PER_HOUR,
  CONTACT_VERIFICATION_RESEND_COOLDOWN_SECONDS,
  CONTACT_VERIFICATION_TOKEN_BYTES,
  CONTACT_VERIFICATION_TOKEN_TTL_MINUTES,
  buildRecoveryEmailVerificationEmail,
  buildRecoveryEmailVerificationUrl,
  classifyContactVerificationToken,
  generateContactVerificationToken,
  getContactVerificationCooldownStart,
  getContactVerificationExpiresAt,
  hashContactVerificationToken,
  isValidContactVerificationTokenFormat,
  maskVerificationEmailContact,
} from "../src/lib/auth/contactVerification";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  assert(actual === expected, `${message}. Attendu: ${String(expected)}. Reçu: ${String(actual)}.`);
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

function readProjectFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function assertTokenHelpers() {
  const token = generateContactVerificationToken();
  assertEquals(CONTACT_VERIFICATION_TOKEN_BYTES, 32, "Le jeton doit utiliser 32 octets");
  assert(isValidContactVerificationTokenFormat(token), "Le jeton doit être URL-safe");
  assertMatches(token, /^[A-Za-z0-9_-]{43}$/, "Le jeton doit être en base64url");
  assertMatches(hashContactVerificationToken(token), /^[a-f0-9]{64}$/, "Le hash doit être SHA-256 hexadécimal");

  const now = new Date("2026-06-26T10:00:00.000Z");
  assertEquals(CONTACT_VERIFICATION_TOKEN_TTL_MINUTES, 30, "La durée de vie doit être de 30 minutes");
  assertEquals(getContactVerificationExpiresAt(now).toISOString(), "2026-06-26T10:30:00.000Z", "L'expiration doit être calculée");
  assertEquals(CONTACT_VERIFICATION_RESEND_COOLDOWN_SECONDS, 60, "Le cooldown doit être de 60 secondes");
  assertEquals(getContactVerificationCooldownStart(now).toISOString(), "2026-06-26T09:59:00.000Z", "Le cooldown doit être calculé");
  assertEquals(CONTACT_VERIFICATION_RECENT_LIMIT_PER_HOUR, 5, "La limite horaire doit exister");
  assertEquals(classifyContactVerificationToken({ expires_at: "2026-06-26T10:31:00.000Z", consumed_at: null }, now), "valid", "Un jeton actif doit être valide");
  assertEquals(classifyContactVerificationToken({ expires_at: "2026-06-26T10:00:00.000Z", consumed_at: null }, now), "expired", "Un jeton expiré doit être refusé");
  assertEquals(classifyContactVerificationToken({ expires_at: "2026-06-26T10:31:00.000Z", consumed_at: "2026-06-26T10:01:00.000Z" }, now), "consumed", "Un jeton consommé doit être refusé");
  assertEquals(
    maskVerificationEmailContact({
      id: "contact",
      contact_type: "email",
      contact_value: "laurent.dupont@gmail.com",
      normalized_value: "laurent.dupont@gmail.com",
      verified_at: null,
    }),
    "la•••••t@gmail.com",
    "L'adresse doit être masquée"
  );
}

function assertEmailContent() {
  const previous = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  const url = buildRecoveryEmailVerificationUrl(generateContactVerificationToken());
  const email = buildRecoveryEmailVerificationEmail(url);
  process.env.NEXT_PUBLIC_APP_URL = previous;

  assertIncludes(url, "http://localhost:3000/verify-recovery-email?token=", "Le lien local doit pointer vers localhost");
  assertNotIncludes(url, "0.0.0.0", "Le lien ne doit pas utiliser 0.0.0.0");
  assertIncludes(email.subject, "FicheMCV+", "L'objet doit identifier FicheMCV+");
  assertIncludes(email.text, "Ce lien expire dans 30 minutes.", "Le texte doit annoncer l'expiration");
  assertIncludes(email.html ?? "", "Vérifier mon adresse email", "Le HTML doit contenir le bouton");
}

function assertMigration() {
  const migration = readProjectFile("supabase/migrations/20260626_add_user_contact_verification_tokens.sql");
  const lower = migration.toLowerCase();
  assertIncludes(migration, "create table if not exists public.user_contact_verification_tokens", "La table de jetons doit exister");
  for (const column of ["id uuid primary key default gen_random_uuid()", "user_contact_id uuid not null", "token_hash text not null unique", "expires_at timestamptz not null", "consumed_at timestamptz null", "created_at timestamptz not null default now()"]) {
    assertIncludes(migration, column, `Colonne manquante: ${column}`);
  }
  assertIncludes(migration, "references public.user_contacts(id)", "La FK doit viser user_contacts");
  assertIncludes(migration, "on delete cascade", "La FK doit être en cascade");
  assertIncludes(migration, "check (expires_at > created_at)", "L'expiration doit être contrainte");
  assertIncludes(migration, "user_contact_verification_tokens_contact_idx", "L'index contact doit exister");
  assertIncludes(migration, "user_contact_verification_tokens_expires_at_idx", "L'index expiration doit exister");
  assertIncludes(migration, "enable row level security", "La RLS doit être activée");
  assertNotIncludes(lower, "create policy", "Aucune policy client ne doit être créée");
  assertIncludes(migration, "for update", "La RPC doit verrouiller les lignes");
  assertIncludes(migration, "set verified_at = coalesce", "La RPC doit renseigner verified_at");
  assertIncludes(migration, "set consumed_at = v_now", "La RPC doit consommer le jeton");
  assertIncludes(migration, "from public, anon, authenticated", "La RPC ne doit pas être exécutable par les rôles clients");
  assertIncludes(migration, "to service_role", "La RPC doit être réservée au service role");
}

function assertRoutesAndComponents() {
  const sendRoute = readProjectFile("src/app/api/account/recovery-email/send-verification/route.ts");
  const confirmRoute = readProjectFile("src/app/api/account/recovery-email/confirm-verification/route.ts");
  const page = readProjectFile("src/app/verify-recovery-email/page.tsx");
  const accountPage = readProjectFile("src/app/compte/page.tsx");
  const sendButton = readProjectFile("src/components/RecoveryEmailVerificationButton.tsx");
  const confirmButton = readProjectFile("src/components/VerifyRecoveryEmailConfirmButton.tsx");

  assertIncludes(sendRoute, "export async function POST", "L'envoi doit être en POST");
  assertIncludes(sendRoute, "supabase.auth.getUser()", "L'envoi doit exiger une session");
  assertIncludes(sendRoute, '.eq("id", user.id)', "app_users doit être lié à authUser.id");
  assertIncludes(sendRoute, '.eq("user_id", user.id)', "Le contact doit appartenir à l'utilisateur");
  assertIncludes(sendRoute, '.eq("contact_type", "email")', "Le contact doit être email");
  assertIncludes(sendRoute, "contact.verified_at", "Un contact déjà vérifié doit être refusé");
  assertIncludes(sendRoute, "generateContactVerificationToken", "La route doit générer un jeton");
  assertIncludes(sendRoute, "token_hash: tokenHash", "La route doit stocker le hash");
  assertIncludes(sendRoute, "sendEmail", "La route doit envoyer un email");
  assertIncludes(sendRoute, "getContactVerificationCooldownStart", "Le cooldown 60s doit être vérifié");
  assertIncludes(sendRoute, "getContactVerificationHourStart", "La limite horaire doit être vérifiée");
  assertIncludes(sendRoute, '.is("consumed_at", null)', "Les anciens jetons actifs doivent être invalidés");
  assertIncludes(sendRoute, "contact.contact_value || contact.normalized_value", "L'adresse doit être relue côté serveur");
  for (const forbidden of ["body?.email", "body?.user_id", "body?.token_hash", "body?.expires_at", "updateUser"]) {
    assertNotIncludes(sendRoute, forbidden, `La route d'envoi ne doit pas accepter ${forbidden}`);
  }

  assertIncludes(confirmRoute, "export async function POST", "La confirmation doit être en POST");
  assertIncludes(confirmRoute, "isValidContactVerificationTokenFormat", "La forme du jeton doit être validée");
  assertIncludes(confirmRoute, "hashContactVerificationToken", "Le jeton brut doit être hashé");
  assertIncludes(confirmRoute, "confirm_user_contact_verification_token", "La confirmation doit utiliser la RPC atomique");
  assertNotIncludes(confirmRoute, "updateUser", "La confirmation ne doit pas modifier l'email Auth");

  assertIncludes(page, "searchParams: Promise", "La page doit respecter l'API Next locale");
  assertIncludes(page, "VerifyRecoveryEmailConfirmButton", "Le GET doit proposer une confirmation explicite");
  assertIncludes(page, "classifyContactVerificationToken", "Le GET doit vérifier l'état");
  assertNotIncludes(page, "confirm_user_contact_verification_token", "Le GET ne doit pas consommer le jeton");
  assertNotIncludes(page, "set verified_at", "Le GET ne doit pas modifier verified_at");

  assertIncludes(accountPage, "RecoveryEmailVerificationButton", "/compte doit intégrer le bouton");
  assertIncludes(accountPage, "Adresse disponible pour récupérer ton compte.", "Le texte Vérifié doit annoncer la récupération active");
  assertIncludes(sendButton, "contactId", "Le bouton doit transmettre contactId");
  assertNotIncludes(sendButton, "contact_value", "Le bouton ne doit pas recevoir l'adresse complète");
  assertNotIncludes(sendButton, "createAdminClient", "Le bouton client ne doit pas utiliser le service role");
  assertNotIncludes(sendButton, "SUPABASE_SERVICE_ROLE_KEY", "Le service role ne doit pas être exposé");
  assertIncludes(sendButton, "router.refresh()", "Le bouton doit rafraîchir /compte");
  assertIncludes(confirmButton, "router.replace", "La confirmation doit nettoyer l'URL");
}

function assertMailerAndEnv() {
  const mailer = readProjectFile("src/lib/email/mailer.ts");
  const envExample = readProjectFile(".env.example");
  const gitignore = readProjectFile(".gitignore");
  const packageJson = readProjectFile("package.json");
  assertIncludes(mailer, "nodemailer", "Le transport retenu doit être nodemailer");
  for (const name of ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "MAIL_FROM", "NEXT_PUBLIC_APP_URL"]) {
    assertIncludes(envExample, `${name}=`, `.env.example doit documenter ${name}`);
  }
  assertIncludes(gitignore, ".env*", ".env.local doit rester ignoré");
  assertIncludes(packageJson, "test:contact-email-verification", "La commande ciblée doit exister");
  assertIncludes(packageJson, "nodemailer", "La dépendance nodemailer doit exister");
}

function assertNoAuthEmailMutation() {
  for (const file of [
    "src/app/api/account/recovery-email/send-verification/route.ts",
    "src/app/api/account/recovery-email/confirm-verification/route.ts",
    "src/lib/auth/contactVerification.ts",
    "src/app/verify-recovery-email/page.tsx",
  ]) {
    const source = readProjectFile(file);
    assertNotIncludes(source, "updateUser({ email", `${file} ne doit pas changer auth.users.email`);
    assertNotIncludes(source, "legacy_login_email", `${file} ne doit pas migrer legacy_login_email`);
    assertNotIncludes(source, "app_users.email", `${file} ne doit pas modifier app_users.email`);
  }
}

function main() {
  assert(existsSync(join(process.cwd(), ".env.example")), ".env.example doit exister");
  assertTokenHelpers();
  assertEmailContent();
  assertMigration();
  assertRoutesAndComponents();
  assertMailerAndEnv();
  assertNoAuthEmailMutation();
  console.log("Contact email verification tests passed.");
}

main();
