import { readFileSync } from "node:fs";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
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

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

function countMatches(source: string, pattern: RegExp) {
  return source.match(pattern)?.length ?? 0;
}

const passwordInput = readSource("src/components/PasswordInput.tsx");
const loginPage = readSource("src/app/login/page.tsx");
const registrationPage = readSource("src/app/inscription-eleve/page.tsx");
const passwordChangeForm = readSource("src/components/PasswordChangeForm.tsx");
const resetPasswordForm = readSource("src/components/ResetPasswordForm.tsx");

const interactivePasswordFiles = [
  "src/app/login/page.tsx",
  "src/app/inscription-eleve/page.tsx",
  "src/components/PasswordChangeForm.tsx",
  "src/components/ResetPasswordForm.tsx",
];

function assertReusablePasswordInput() {
  assertIncludes(
    passwordInput,
    "useState(false)",
    "Le champ doit etre masque par defaut a chaque montage"
  );
  assertIncludes(
    passwordInput,
    'type={isVisible ? "text" : "password"}',
    "Le composant doit alterner entre password et text"
  );
  assertIncludes(
    passwordInput,
    'type="button"',
    "Le bouton oeil ne doit jamais soumettre le formulaire"
  );
  assertIncludes(
    passwordInput,
    'aria-label={label}',
    "Le bouton doit exposer un libelle accessible dynamique"
  );
  assertIncludes(
    passwordInput,
    'aria-pressed={isVisible}',
    "Le bouton doit exposer son etat d'affichage"
  );
  assertIncludes(
    passwordInput,
    "Afficher le mot de passe",
    "Le libelle d'affichage doit etre present"
  );
  assertIncludes(
    passwordInput,
    "Masquer le mot de passe",
    "Le libelle de masquage doit etre present"
  );
  assertIncludes(
    passwordInput,
    "setIsVisible((current) => !current)",
    "Un second clic doit remasquer le mot de passe"
  );
  assertIncludes(
    passwordInput,
    "{...props}",
    "Les attributs et evenements input existants doivent etre transmis"
  );
  assertIncludes(
    passwordInput,
    "className={`${className} flex items-stretch overflow-hidden p-0 focus-within:border-sky-400`}",
    "Le conteneur doit conserver les classes recues et porter l'apparence du champ unique"
  );
  assertIncludes(
    passwordInput,
    'className="min-w-0 flex-1',
    "L'input doit occuper l'espace disponible sans deborder"
  );
  assertIncludes(
    passwordInput,
    "min-h-11 min-w-11",
    "Le bouton doit garder une taille tactile adaptee"
  );
  assertIncludes(
    passwordInput,
    "self-stretch",
    "Le bouton doit rester aligne dans le champ flex sans superposition"
  );
  assertIncludes(
    passwordInput,
    "touch-manipulation",
    "Le bouton doit limiter les delais tactiles mobiles sans evenement touch dedie"
  );
  assertMatches(
    passwordInput,
    /focus:ring-2[\s\S]*focus:ring-sky-400|focus:ring-sky-400[\s\S]*focus:ring-2/,
    "Le focus clavier du bouton doit etre visible"
  );
  assertMatches(
    passwordInput,
    /type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">/,
    "Le typage doit accepter les props habituelles d'un input sans exposer type"
  );
  assertNotIncludes(passwordInput, "absolute", "Le bouton ne doit plus etre superpose a l'input.");
  assertNotIncludes(passwordInput, "inset-y-0", "Le bouton ne doit plus utiliser de positionnement vertical absolu.");
  assertNotIncludes(passwordInput, "right-0", "Le bouton ne doit plus utiliser de positionnement droit absolu.");
  assertNotIncludes(passwordInput, "z-10", "Le bouton ne doit plus dependre d'un z-index.");
  assertNotIncludes(passwordInput, "pr-14", "L'input ne doit plus reserver de padding pour un bouton superpose.");
  assertNotIncludes(passwordInput, "onTouchStart", "La correction ne doit pas ajouter d'evenement tactile dedie.");
}

function assertPasswordInputUsage() {
  for (const path of interactivePasswordFiles) {
    assertIncludes(
      readSource(path),
      "PasswordInput",
      `${path} doit utiliser le composant reutilisable`
    );
  }

  assertMatches(
    loginPage,
    /<PasswordInput[\s\S]*autoComplete="current-password"[\s\S]*value=\{password\}[\s\S]*onChange=\{\(event\) => setPassword\(event\.target\.value\)\}/,
    "La connexion doit conserver value, onChange et autoComplete"
  );
  assertMatches(
    registrationPage,
    /<PasswordInput[\s\S]*id="student-password"[\s\S]*value=\{password\}[\s\S]*onChange=\{\(event\) => setPassword\(event\.target\.value\)\}/,
    "L'inscription doit conserver le champ mot de passe"
  );
  assertMatches(
    registrationPage,
    /<PasswordInput[\s\S]*id="student-confirm-password"[\s\S]*value=\{confirmPassword\}[\s\S]*onChange=\{\(event\) => setConfirmPassword\(event\.target\.value\)\}/,
    "L'inscription doit conserver le champ de confirmation"
  );
  assertMatches(
    passwordChangeForm,
    /<PasswordInput[\s\S]*id="new-password"[\s\S]*autoComplete="new-password"[\s\S]*value=\{newPassword\}/,
    "Le changement de mot de passe doit conserver autoComplete et la valeur"
  );
  assertMatches(
    passwordChangeForm,
    /<PasswordInput[\s\S]*id="confirm-password"[\s\S]*autoComplete="new-password"[\s\S]*value=\{confirmPassword\}/,
    "La confirmation du changement doit rester independante"
  );
  assertMatches(
    resetPasswordForm,
    /<PasswordInput[\s\S]*id="new-password"[\s\S]*autoComplete="new-password"[\s\S]*value=\{newPassword\}/,
    "La reinitialisation doit conserver autoComplete et la valeur"
  );
  assertMatches(
    resetPasswordForm,
    /<PasswordInput[\s\S]*id="confirm-password"[\s\S]*autoComplete="new-password"[\s\S]*value=\{confirmPassword\}/,
    "La confirmation de reinitialisation doit rester independante"
  );

  assert(countMatches(registrationPage, /<PasswordInput/g) === 2, "L'inscription doit avoir deux commandes independantes.");
  assert(countMatches(passwordChangeForm, /<PasswordInput/g) === 2, "Le changement de mot de passe doit avoir deux commandes independantes.");
  assert(countMatches(resetPasswordForm, /<PasswordInput/g) === 2, "La reinitialisation doit avoir deux commandes independantes.");
}

function assertNoForgottenInteractivePasswordField() {
  for (const path of interactivePasswordFiles) {
    assertNotIncludes(
      readSource(path),
      'type="password"',
      `${path} ne doit plus contenir de champ password duplique`
    );
  }
}

function assertFormsStillSubmit() {
  assertIncludes(loginPage, "<form onSubmit={handleLogin}", "Le formulaire de connexion doit conserver son submit.");
  assertIncludes(registrationPage, "<form onSubmit={handleSubmit}", "Le formulaire d'inscription doit conserver son submit.");
  assertIncludes(passwordChangeForm, "<form onSubmit={handleSubmit}", "Le formulaire de changement doit conserver son submit.");
  assertIncludes(resetPasswordForm, "<form onSubmit={handleSubmit}", "Le formulaire de reset doit conserver son submit.");
}

function assertNoAuthOrSupabaseDrift() {
  for (const path of [
    "src/app/api/auth/login/route.ts",
    "src/app/api/auth/request-password-reset/route.ts",
    "src/app/api/auth/confirm-password-reset/route.ts",
    "src/lib/supabase/client.ts",
    "src/lib/supabase/server.ts",
    "src/lib/supabase/admin.ts",
  ]) {
    const source = readSource(path);
    assert(source.length > 0, `${path} doit rester lisible`);
  }
}

assertReusablePasswordInput();
assertPasswordInputUsage();
assertNoForgottenInteractivePasswordField();
assertFormsStillSubmit();
assertNoAuthOrSupabaseDrift();

console.log("Password input tests passed.");
