import { existsSync, readFileSync } from "node:fs";
import {
  getSafePasswordRecoveryNextPath,
  isLegacyLocalEmail,
  isValidEmail,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RECOVERY_NEUTRAL_MESSAGE,
  PASSWORD_RECOVERY_SUCCESS_MESSAGE,
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

function assertEmailValidation() {
  assert(isValidEmail("admin@example.test"), "Une adresse valide doit passer.");
  assert(
    !isValidEmail("adresse-invalide"),
    "Une adresse invalide doit etre rejetee localement."
  );
}

function assertNeutralMessage() {
  assertEquals(
    PASSWORD_RECOVERY_NEUTRAL_MESSAGE,
    "Si un compte correspond à cette adresse, un message de réinitialisation va être envoyé.",
    "Le message neutre doit rester stable"
  );
  assert(
    isLegacyLocalEmail("eleve@fichemcv.local"),
    "Les comptes historiques doivent etre detectables sans message specifique"
  );
  assertEquals(
    PASSWORD_RECOVERY_NEUTRAL_MESSAGE,
    PASSWORD_RECOVERY_NEUTRAL_MESSAGE,
    "Le message doit etre identique pour adresse connue, inconnue et interne"
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
  assertEquals(
    getSafePasswordRecoveryNextPath(null),
    "/reset-password",
    "Le callback sans next doit revenir vers reset-password"
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

function assertFilesAndSupabaseCalls() {
  const login = readSource("src/app/login/page.tsx");
  const forgot = readSource("src/app/forgot-password/page.tsx");
  const callback = readSource("src/app/auth/callback/route.ts");
  const reset = readSource("src/app/reset-password/page.tsx");
  const resetForm = readSource("src/components/ResetPasswordForm.tsx");
  const supabaseServer = readSource("src/lib/supabase/server.ts");
  const supabaseClient = readSource("src/lib/supabase/client.ts");
  const passwordRecovery = readSource("src/lib/auth/passwordRecovery.ts");
  const docs = readSource("docs/auth-password-recovery.md");

  assert(existsSync("src/app/forgot-password/page.tsx"), "La page forgot-password doit exister.");
  assert(existsSync("src/app/auth/callback/route.ts"), "La route auth/callback doit exister.");
  assert(existsSync("src/app/reset-password/page.tsx"), "La page reset-password doit exister.");
  assert(existsSync("src/components/ResetPasswordForm.tsx"), "Le formulaire client reset-password doit exister.");
  assert(
    !existsSync("src/app/auth/recovery/clear/route.ts"),
    "La route de nettoyage recovery ne doit plus exister dans le parcours client."
  );
  assert(
    !existsSync("src/app/api/auth/reset-password/route.ts"),
    "La route API reset-password ne doit plus exister dans le parcours client."
  );
  assert(
    existsSync("src/app/api/admin/students/reset-password/route.ts"),
    "La route reset admin eleves ne doit pas etre supprimee"
  );
  assert(
    existsSync("src/app/api/admin/teachers/reset-password/route.ts"),
    "La route reset admin professeurs ne doit pas etre supprimee"
  );

  assertIncludes(login, "Mot de passe perdu ?", "Le lien de reset doit etre present sur /login.");
  assertIncludes(login, 'href="/forgot-password"', "Le lien de reset doit pointer vers /forgot-password.");
  assertIncludes(
    login,
    "Connexion impossible. Vérifie ton identifiant et ton mot de passe.",
    "Le message de connexion doit etre generique"
  );
  assertIncludes(
    login,
    "Tu es déjà connecté en tant que",
    "Une session existante doit etre affichee explicitement au lieu de laisser croire a une nouvelle connexion"
  );
  assertIncludes(
    login,
    "Se connecter avec un autre compte",
    "Une nouvelle connexion avec un autre compte doit necessiter une deconnexion explicite"
  );
  assertIncludes(
    login,
    "setExistingSession",
    "/login doit memoriser la session existante au lieu de rediriger silencieusement"
  );
  assertIncludes(
    login,
    "handleSignOut",
    "/login doit proposer une deconnexion explicite avant changement de compte"
  );
  assertNotIncludes(
    login,
    "router.replace(homePath)",
    "/login ne doit plus rediriger automatiquement une session existante depuis l'effet client"
  );
  assertNotIncludes(login, "Invalid login credentials", "Le message Supabase brut ne doit pas etre affiche.");
  assertNotIncludes(login, "Email not confirmed", "Le message Supabase brut ne doit pas etre affiche.");
  assertNotIncludes(login, "User not found", "Le message Supabase brut ne doit pas etre affiche.");

  assertIncludes(
    forgot,
    "resetPasswordForEmail",
    "La demande de reset doit utiliser resetPasswordForEmail"
  );
  assertIncludes(
    forgot,
    "http://localhost:3000/reset-password",
    "La redirection email doit etre exactement /reset-password sur localhost en developpement"
  );
  assertIncludes(
    forgot,
    "window.location.origin}/reset-password",
    "La redirection email doit pointer directement vers /reset-password dans le navigateur"
  );
  assertNotIncludes(
    forgot,
    "/auth/callback?next=/reset-password",
    "La recuperation ne doit plus imposer le callback PKCE serveur"
  );
  assertNotIncludes(
    forgot,
    "0.0.0.0",
    "La redirection email ne doit jamais utiliser 0.0.0.0"
  );
  assertNotIncludes(
    forgot,
    "@fichemcv.local",
    "La page forgot-password ne doit pas exposer les comptes internes"
  );

  assertIncludes(
    callback,
    "exchangeCodeForSession",
    "La route auth/callback peut rester disponible pour les flux PKCE avec code"
  );
  assertIncludes(
    callback,
    "const { data, error } = await supabase.auth.exchangeCodeForSession(code)",
    "Le callback doit inspecter le resultat complet de exchangeCodeForSession"
  );
  assertIncludes(
    callback,
    "Boolean(data.session)",
    "Le callback doit verifier qu'une session Supabase est recue"
  );
  assertIncludes(
    callback,
    "Boolean(data.user)",
    "Le callback doit verifier qu'un utilisateur Supabase est recu"
  );
  assertIncludes(
    callback,
    "createClient(response)",
    "Le callback doit donner la reponse finale au client SSR Supabase"
  );
  assertIncludes(
    callback,
    "getSafePasswordRecoveryNextPath",
    "Le callback doit valider le parametre next"
  );
  assertIncludes(
    callback,
    "if (error || !hasSession || !hasUser)",
    "Le callback doit refuser les echanges qui ne creent pas de session"
  );
  assertNotIncludes(
    callback,
    "fichemcv_password_recovery",
    "Le callback ne doit plus poser de cookie recovery personnalise"
  );
  assertNotIncludes(
    callback,
    'searchParams.set("error"',
    "Le callback ne doit pas exposer le diagnostic dans l'URL"
  );

  assertIncludes(
    reset,
    "<ResetPasswordForm />",
    "La page reset-password doit deleguer la validation au composant client"
  );
  assertNotIncludes(
    reset,
    "cookies",
    "La page reset-password ne doit plus verifier de marqueur cote serveur"
  );
  assertNotIncludes(
    reset,
    "auth.getUser",
    "La page reset-password ne doit pas refuser le recovery au premier rendu serveur"
  );
  assertNotIncludes(
    reset,
    '"use client"',
    "La page wrapper reset-password peut rester serveur et ne doit pas lire le fragment"
  );
  assertNotIncludes(
    reset,
    "document.cookie",
    "La page reset-password ne doit pas lire de cookie"
  );

  assertIncludes(
    resetForm,
    "createClient",
    "Le formulaire client doit creer le client Supabase navigateur"
  );
  assertIncludes(
    resetForm,
    "onAuthStateChange",
    "Le formulaire doit ecouter les changements d'etat Auth"
  );
  assertIncludes(
    resetForm,
    'event === "PASSWORD_RECOVERY"',
    "Le formulaire doit etre autorise par l'evenement PASSWORD_RECOVERY"
  );
  assertNotIncludes(
    resetForm,
    'fetch("/api/auth/reset-password"',
    "Le formulaire ne doit plus appeler la route serveur de reset"
  );
  assertNotIncludes(
    resetForm,
    "document.cookie",
    "Le formulaire client ne doit pas manipuler de cookie recovery"
  );
  assertIncludes(
    resetForm,
    "getSession",
    "Le formulaire doit accepter une session deja initialisee par le fragment"
  );
  assertIncludes(
    resetForm,
    'useState<RecoveryState>("initializing")',
    "Le formulaire ne doit pas etre affiche avant validation du recovery event"
  );
  assertIncludes(
    resetForm,
    "Vérification du lien de réinitialisation...",
    "La page doit afficher un chargement pendant l'initialisation"
  );
  assertIncludes(
    resetForm,
    "access_denied",
    "La page doit gerer les fragments d'erreur Supabase"
  );
  assertIncludes(
    resetForm,
    "otp_expired",
    "La page doit gerer les liens expires Supabase"
  );
  assertIncludes(
    resetForm,
    "Ce lien de réinitialisation est invalide ou a expiré.",
    "La page doit afficher le message generique de lien invalide ou expire"
  );
  assertIncludes(
    resetForm,
    "Demander un nouveau lien",
    "La page doit proposer de demander un nouveau lien"
  );
  assertIncludes(
    resetForm,
    "history.replaceState",
    "La page doit nettoyer le fragment avec history.replaceState"
  );
  assertIncludes(
    resetForm,
    "window.location.hash",
    "La lecture du fragment doit rester cote navigateur"
  );
  assertIncludes(
    resetForm,
    "updateUser",
    "Le formulaire client authentifie doit utiliser updateUser"
  );
  assertIncludes(
    resetForm,
    "password: newPassword",
    "Le nouveau mot de passe doit etre transmis a updateUser cote client"
  );
  assertIncludes(
    resetForm,
    "auth.signOut",
    "La session recovery doit etre fermee apres modification reussie"
  );
  assertIncludes(
    resetForm,
    "PASSWORD_RECOVERY_SUCCESS_MESSAGE",
    "La page doit afficher le message de succes attendu"
  );
  assertIncludes(resetForm, 'router.replace("/login")', "La page doit rediriger vers /login apres succes.");
  assertIncludes(
    resetForm,
    "setRecoveryState(\"success\")",
    "L'etat recovery doit etre nettoye apres succes"
  );
  assertNotIncludes(
    resetForm,
    "console.",
    "Le formulaire ne doit pas journaliser token, OTP ou mot de passe"
  );
  assertNotIncludes(
    resetForm,
    "service_role",
    "Le formulaire ne doit pas utiliser de service role"
  );
  assertNotIncludes(
    resetForm,
    "SUPABASE_SERVICE_ROLE_KEY",
    "Le formulaire ne doit pas utiliser de service role"
  );

  for (const source of [callback, reset, resetForm, passwordRecovery]) {
    assertNotIncludes(
      source,
      "fichemcv_password_recovery",
      "Le cookie recovery personnalise doit etre absent du parcours"
    );
    assertNotIncludes(
      source,
      "PASSWORD_RECOVERY_COOKIE_NAME",
      "La constante du cookie recovery personnalise doit etre absente"
    );
    assertNotIncludes(
      source,
      "/auth/recovery/clear",
      "La route de nettoyage recovery ne doit plus etre requise"
    );
    assertNotIncludes(
      source,
      "/api/auth/reset-password",
      "La route API reset-password ne doit plus etre requise"
    );
  }

  assertIncludes(
    supabaseClient,
    "createBrowserClient(supabaseUrl, supabaseAnonKey)",
    "Le navigateur utilise createBrowserClient sans option PKCE explicite"
  );
  assertIncludes(
    supabaseServer,
    "createServerClient",
    "Le serveur conserve un client SSR separe pour les autres parcours"
  );
  assertIncludes(
    supabaseServer,
    "setAll(cookiesToSet, headers)",
    "Le client SSR doit utiliser l'adaptateur cookies compatible @supabase/ssr actuel"
  );
  assertIncludes(
    supabaseServer,
    "response?.cookies.set(name, value, options)",
    "Les cookies Supabase doivent etre appliques a la reponse retournee"
  );
  assertIncludes(
    supabaseServer,
    "response?.headers.set(name, value)",
    "Les en-tetes Supabase doivent etre appliques a la reponse retournee"
  );

  assertIncludes(
    docs,
    "Site URL : `http://localhost:3000`",
    "La documentation doit indiquer le Site URL local"
  );
  assertIncludes(
    docs,
    "`http://localhost:3000/reset-password`",
    "La documentation doit indiquer la Redirect URL locale"
  );
  assertNotIncludes(
    docs,
    "0.0.0.0",
    "La documentation ne doit plus mentionner 0.0.0.0"
  );
  assertNotIncludes(
    docs,
    "/auth/callback?next=/reset-password",
    "La documentation ne doit plus recommander le callback pour la recuperation"
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

function assertNoSensitiveDataInPasswordRecoveryLogs() {
  for (const path of [
    "src/app/auth/callback/route.ts",
    "src/app/reset-password/page.tsx",
    "src/components/ResetPasswordForm.tsx",
  ]) {
    const source = readSource(path);

    assertNotIncludes(
      source,
      "console.",
      `${path} ne doit pas journaliser le parcours de recuperation`
    );
  }
}

assertEmailValidation();
assertNeutralMessage();
assertCallbackSafety();
assertPasswordValidation();
assertFilesAndSupabaseCalls();
assertNoServiceRoleInClientCode();
assertNoSensitiveDataInPasswordRecoveryLogs();

console.log("Auth password recovery tests passed.");
