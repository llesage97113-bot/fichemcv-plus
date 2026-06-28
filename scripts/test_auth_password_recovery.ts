import { existsSync, readFileSync, readdirSync } from "node:fs";
import {
  getSafePasswordRecoveryNextPath,
  isLegacyLocalEmail,
  isValidEmail,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RECOVERY_SUCCESS_MESSAGE,
  PASSWORD_RESET_REQUEST_PUBLIC_MESSAGE,
  validateNewPassword,
} from "../src/lib/auth/passwordRecovery";

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

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

function assertIncludes(source: string, expected: string, message: string) {
  assert(source.includes(expected), message);
}

function assertNotIncludes(source: string, forbidden: string, message: string) {
  assert(!source.includes(forbidden), message);
}

function assertLessThan(actual: number, expected: number, message: string) {
  assert(
    actual < expected,
    `${message}. ${String(actual)} doit etre inferieur a ${String(expected)}.`
  );
}

function assertEmailValidation() {
  assert(isValidEmail("admin@example.test"), "Une adresse valide doit passer.");
  assert(
    isValidEmail("prenom.nom@fichemcv.local"),
    "Un identifiant interne au format email doit passer."
  );
  assert(
    !isValidEmail("adresse-invalide"),
    "Une adresse invalide doit etre rejetee localement."
  );
}

function assertNeutralMessage() {
  assertEquals(
    PASSWORD_RESET_REQUEST_PUBLIC_MESSAGE,
    "Si un compte correspondant existe et dispose d’une adresse de récupération vérifiée, un courriel a été envoyé.",
    "Le message public Patch 7 doit rester stable"
  );
  assert(
    isLegacyLocalEmail("eleve@fichemcv.local"),
    "Les comptes historiques doivent etre detectables sans message specifique"
  );
}

function assertCallbackSafety() {
  assertEquals(
    getSafePasswordRecoveryNextPath("/reset-password"),
    "/reset-password",
    "Le callback doit accepter le chemin interne de reset"
  );
  assertEquals(
    getSafePasswordRecoveryNextPath("https://evil.example/reset-password"),
    "/reset-password",
    "Le callback doit rejeter une URL externe absolue"
  );
  assertEquals(
    getSafePasswordRecoveryNextPath("//evil.example/reset-password"),
    "/reset-password",
    "Le callback doit rejeter une URL externe protocole-relative"
  );
}

function assertPasswordValidation() {
  assertEquals(
    PASSWORD_MIN_LENGTH,
    8,
    "La longueur minimale doit rester coherente avec la politique actuelle"
  );
  assertEquals(
    validateNewPassword("motdepasse", "motdepasse"),
    null,
    "Un nouveau mot de passe valide doit etre accepte"
  );
  assertEquals(
    validateNewPassword("motdepasse", "different"),
    "Les deux mots de passe ne correspondent pas.",
    "Deux mots de passe differents doivent etre rejetes"
  );
  assertEquals(
    validateNewPassword("court", "court"),
    "Le mot de passe doit contenir au moins 8 caractères.",
    "Un mot de passe trop court doit etre rejete"
  );
}

function assertHybridPasswordRecoveryFiles() {
  const login = readSource("src/app/login/page.tsx");
  const forgot = readSource("src/app/forgot-password/page.tsx");
  const callback = readSource("src/app/auth/callback/route.ts");
  const reset = readSource("src/app/reset-password/page.tsx");
  const resetForm = readSource("src/components/ResetPasswordForm.tsx");
  const requestRoute = readSource("src/app/api/auth/request-password-reset/route.ts");
  const confirmRoute = readSource("src/app/api/auth/confirm-password-reset/route.ts");
  const tokenHelpers = readSource("src/lib/auth/passwordResetTokens.ts");
  const migration = readSource(
    "supabase/migrations/20260626170000_add_user_password_reset_tokens.sql"
  );
  const docs = readSource("docs/auth-password-recovery.md");

  assert(existsSync("src/app/forgot-password/page.tsx"), "La page forgot-password doit exister.");
  assert(existsSync("src/app/auth/callback/route.ts"), "La route auth/callback doit exister.");
  assert(existsSync("src/app/reset-password/page.tsx"), "La page reset-password doit exister.");
  assert(existsSync("src/components/ResetPasswordForm.tsx"), "Le formulaire reset-password doit exister.");
  assert(
    existsSync("src/app/api/auth/request-password-reset/route.ts"),
    "La route de demande Patch 7 doit exister."
  );
  assert(
    existsSync("src/app/api/auth/confirm-password-reset/route.ts"),
    "La route de confirmation Patch 7 doit exister."
  );
  assert(
    existsSync("supabase/migrations/20260626170000_add_user_password_reset_tokens.sql"),
    "La migration Patch 7 doit utiliser un timestamp unique."
  );
  assert(
    !existsSync("supabase/migrations/20260626_add_user_password_reset_tokens.sql"),
    "L'ancien nom de migration Patch 7 ne doit plus exister."
  );
  assertMigrationVersionIsUnique("20260626170000");

  assertIncludes(login, 'href="/forgot-password"', "Le lien de reset doit pointer vers /forgot-password.");
  assertNotIncludes(login, "Invalid login credentials", "Le message Supabase brut ne doit pas etre affiche.");

  assertIncludes(
    forgot,
    'fetch("/api/auth/request-password-reset"',
    "La demande de reset doit passer par la route serveur Patch 7"
  );
  assertIncludes(
    forgot,
    "PASSWORD_RESET_REQUEST_PUBLIC_MESSAGE",
    "La page doit afficher le message public neutre Patch 7"
  );
  assertNotIncludes(
    forgot,
    "resetPasswordForEmail",
    "La page client ne doit plus declencher directement le reset Supabase"
  );
  assertNotIncludes(
    forgot,
    "adresse interne",
    "La page forgot-password ne doit pas detailler le traitement des comptes internes"
  );

  assertIncludes(
    requestRoute,
    "resetPasswordForEmail",
    "La route serveur doit conserver le parcours Supabase natif pour les adresses Auth reelles"
  );
  assertIncludes(
    requestRoute,
    "shouldUseCustomRecoveryForIdentifier",
    "La route serveur doit router les identifiants internes vers le parcours personnalise"
  );
  assertIncludes(
    requestRoute,
    "user_contacts",
    "La route doit rechercher une adresse de recuperation"
  );
  assertIncludes(
    requestRoute,
    '.not("verified_at", "is", null)',
    "La route doit exiger une adresse de recuperation verifiee"
  );
  assertIncludes(
    requestRoute,
    "generatePasswordResetToken",
    "La route doit generer un jeton applicatif"
  );
  assertIncludes(
    requestRoute,
    "hashPasswordResetToken",
    "La route doit stocker uniquement le hash du jeton"
  );
  assertIncludes(
    requestRoute,
    "PASSWORD_RESET_RECENT_LIMIT_PER_HOUR",
    "La route doit appliquer une limite horaire"
  );
  assertIncludes(
    requestRoute,
    "MIN_PUBLIC_RESPONSE_MS",
    "La route doit appliquer un delai minimal commun aux reponses rapides"
  );
  assertIncludes(
    requestRoute,
    "PUBLIC_RESPONSE_JITTER_MS",
    "La route doit ajouter une legere variation aleatoire commune"
  );
  assertIncludes(
    requestRoute,
    "getPasswordResetCooldownStart",
    "La route doit appliquer un delai minimal entre deux demandes"
  );
  assertNotIncludes(
    requestRoute,
    "console.",
    "La route ne doit pas journaliser le jeton ou l'identifiant"
  );

  assertIncludes(
    reset,
    "loadCustomTokenState",
    "La page reset-password doit classifier les jetons applicatifs sans mutation"
  );
  assertIncludes(
    resetForm,
    "custom-ready",
    "Le formulaire doit accepter le parcours applicatif"
  );
  assertIncludes(
    resetForm,
    'fetch("/api/auth/confirm-password-reset"',
    "Le formulaire doit envoyer le jeton applicatif a une route serveur"
  );
  assertIncludes(
    resetForm,
    'event === "PASSWORD_RECOVERY"',
    "Le parcours Supabase natif doit rester supporte"
  );
  assertIncludes(
    resetForm,
    "updateUser",
    "Le parcours Supabase natif doit continuer a utiliser updateUser cote session recovery"
  );
  assertNotIncludes(
    resetForm,
    "SUPABASE_SERVICE_ROLE_KEY",
    "Le formulaire ne doit pas utiliser de service role"
  );
  assertNotIncludes(resetForm, "console.", "Le formulaire ne doit pas journaliser le mot de passe.");

  assertIncludes(
    confirmRoute,
    "consume_user_password_reset_token",
    "La confirmation doit consommer le jeton atomiquement avant updateUserById"
  );
  assertIncludes(
    confirmRoute,
    "updateUserById",
    "La confirmation doit modifier le mot de passe via Supabase Admin"
  );
  assertLessThan(
    confirmRoute.indexOf("consume_user_password_reset_token"),
    confirmRoute.indexOf("updateUserById"),
    "La consommation definitive doit preceder updateUserById"
  );
  assertNotIncludes(
    confirmRoute,
    "complete_user_password_reset_token",
    "La confirmation ne doit plus appeler de RPC de completion"
  );
  assertNotIncludes(
    confirmRoute,
    "claim_nonce",
    "La confirmation ne doit plus utiliser de nonce de claim"
  );
  assertNotIncludes(
    confirmRoute,
    "tokenId",
    "La confirmation ne doit plus dependre d'un token_id apres consommation"
  );
  assertIncludes(
    confirmRoute,
    "MESSAGES.generic",
    "Un echec updateUserById apres consommation doit retourner un message generique"
  );
  assertNotIncludes(confirmRoute, "console.", "La confirmation ne doit pas journaliser de secret.");

  assertIncludes(tokenHelpers, "randomBytes(PASSWORD_RESET_TOKEN_BYTES)", "Le jeton doit utiliser crypto.randomBytes.");
  assertIncludes(tokenHelpers, '.toString("base64url")', "Le jeton doit etre encode en base64url.");
  assertIncludes(tokenHelpers, 'createHash("sha256")', "Le hash doit utiliser SHA-256.");
  assertIncludes(tokenHelpers, "PASSWORD_RESET_TOKEN_TTL_MINUTES = 30", "Le TTL doit etre de 30 minutes.");
  assertNotIncludes(tokenHelpers, "searchParams.set(\"user", "L'URL ne doit pas inclure l'UUID utilisateur.");

  assertIncludes(migration, "create table if not exists public.user_password_reset_tokens", "La table dediee doit etre creee.");
  assertIncludes(migration, "token_hash text not null unique", "Le hash du jeton doit etre unique.");
  assertNotIncludes(migration, "claimed_at", "La colonne claimed_at doit etre absente.");
  assertNotIncludes(migration, "claim_nonce", "La colonne claim_nonce doit etre absente.");
  assertNotIncludes(migration, "claim_expires_at", "La colonne claim_expires_at doit etre absente.");
  assertIncludes(migration, "alter table public.user_password_reset_tokens enable row level security", "La RLS doit etre activee.");
  assertIncludes(migration, "No SELECT/INSERT/UPDATE/DELETE policy is created", "Aucune policy client ne doit etre creee.");
  assertIncludes(migration, "consume_user_password_reset_token", "La fonction de consommation doit exister.");
  assertNotIncludes(migration, "complete_user_password_reset_token", "La fonction de completion doit etre supprimee.");
  assertNotIncludes(migration, "claim_user_password_reset_token", "La fonction claim separee doit etre supprimee.");
  assertIncludes(migration, "for update", "La fonction doit verrouiller la ligne de jeton.");
  assertLessThan(
    migration.indexOf("set consumed_at = v_now"),
    migration.indexOf("return query select 'success'::text, v_token.user_id"),
    "La RPC doit marquer le jeton consomme avant de retourner le succes"
  );
  assertIncludes(
    migration,
    "where user_id = v_token.user_id",
    "La RPC doit invalider les autres jetons actifs du meme utilisateur"
  );
  assertIncludes(migration, "revoke all on function public.consume_user_password_reset_token(text)\n  from public, anon, authenticated", "La RPC doit etre inaccessible aux roles client.");
  assertIncludes(migration, "grant execute on function public.consume_user_password_reset_token(text)\n  to service_role", "L'execution doit etre reservee au service role.");
  assertNotIncludes(migration, "grant execute on function public.consume_user_password_reset_token(text)\n  to authenticated", "La RPC de reset ne doit pas etre accordee aux clients authentifies.");
  assertNotIncludes(migration, "grant execute on function public.consume_user_password_reset_token(text)\n  to anon", "La RPC de reset ne doit pas etre accordee au role anon.");

  assertIncludes(
    docs,
    "20260626170000_add_user_password_reset_tokens.sql",
    "La documentation doit pointer vers la migration renommee"
  );
  assertIncludes(
    docs,
    "SMTP synchrone peut",
    "La documentation doit mentionner honnetement la limite temporelle restante"
  );
  assertIncludes(
    docs,
    "asynchrone serait la solution de production",
    "La documentation doit indiquer la solution de production pour le timing"
  );

  assertIncludes(callback, "exchangeCodeForSession", "Le callback PKCE existant doit rester disponible.");
}

function assertPasswordResetTokenRpcFixMigration() {
  const migrationName = readdirSync("supabase/migrations").find((name) =>
    name.endsWith("_fix_password_reset_token_rpc_ambiguity.sql")
  );

  assert(
    migrationName,
    "La migration corrective de l'ambiguite user_id du reset password doit exister."
  );

  const migration = readSource(`supabase/migrations/${migrationName}`);

  assertIncludes(
    migration,
    "create or replace function public.consume_user_password_reset_token(",
    "La migration corrective doit remplacer la RPC de consommation."
  );
  assertIncludes(
    migration,
    "from public.user_password_reset_tokens as reset_token",
    "La lecture du jeton doit utiliser un alias explicite."
  );
  assertIncludes(
    migration,
    "update public.user_password_reset_tokens as reset_token",
    "Les updates de jetons doivent utiliser un alias explicite."
  );
  assertIncludes(
    migration,
    "select reset_token.*",
    "La selection du jeton doit etre qualifiee par l'alias."
  );
  assertIncludes(
    migration,
    "reset_token.token_hash = p_token_hash",
    "La recherche par hash doit qualifier token_hash."
  );
  assertIncludes(
    migration,
    "reset_token.consumed_at is null",
    "Les tests consumed_at doivent etre qualifies."
  );
  assertIncludes(
    migration,
    "reset_token.expires_at <= v_now",
    "Les tests expires_at doivent etre qualifies."
  );
  assertIncludes(
    migration,
    "reset_token.id = v_token.id",
    "La consommation du jeton courant doit qualifier id."
  );
  assertIncludes(
    migration,
    "reset_token.user_id = v_token.user_id",
    "L'invalidation des autres jetons doit qualifier user_id."
  );
  assertNotIncludes(
    migration,
    "where user_id = v_token.user_id",
    "La forme ambigue user_id = v_token.user_id ne doit plus exister."
  );
  assertIncludes(
    migration,
    "revoke all on function public.consume_user_password_reset_token(text)\n  from public, anon, authenticated",
    "La migration corrective doit revoquer les roles client."
  );
  assertIncludes(
    migration,
    "grant execute on function public.consume_user_password_reset_token(text)\n  to service_role",
    "La migration corrective doit reserver l'execution au service role."
  );
  assertNotIncludes(
    migration,
    "grant execute on function public.consume_user_password_reset_token(text)\n  to authenticated",
    "La migration corrective ne doit pas accorder la RPC aux clients authentifies."
  );
  assertNotIncludes(
    migration,
    "grant execute on function public.consume_user_password_reset_token(text)\n  to anon",
    "La migration corrective ne doit pas accorder la RPC au role anon."
  );
}

function assertMigrationVersionIsUnique(expectedVersion: string) {
  const migrations = readdirSync("supabase/migrations").filter((name) =>
    name.endsWith(".sql")
  );
  const matching = migrations.filter((name) => name.startsWith(`${expectedVersion}_`));

  assertEquals(
    matching.length,
    1,
    `La version de migration Patch 7 ${expectedVersion} doit etre unique`
  );
}

function assertNoServiceRoleInClientCode() {
  for (const path of [
    "src/app/login/page.tsx",
    "src/app/forgot-password/page.tsx",
    "src/components/ResetPasswordForm.tsx",
    "src/lib/supabase/client.ts",
  ]) {
    const source = readSource(path);
    assertNotIncludes(
      source,
      "SUPABASE_SERVICE_ROLE_KEY",
      `${path} ne doit pas utiliser le service role cote client`
    );
    assertNotIncludes(
      source,
      "createAdminClient",
      `${path} ne doit pas utiliser le client admin cote client`
    );
  }
}

assertEmailValidation();
assertNeutralMessage();
assertCallbackSafety();
assertPasswordValidation();
assertHybridPasswordRecoveryFiles();
assertPasswordResetTokenRpcFixMigration();
assertNoServiceRoleInClientCode();
assert(PASSWORD_RECOVERY_SUCCESS_MESSAGE.length > 0, "Le message de succes doit exister.");

console.log("Auth password recovery tests passed.");
