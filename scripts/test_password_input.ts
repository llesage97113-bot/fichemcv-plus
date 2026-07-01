import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

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

function getButtonClassName(source: string) {
  const match = source.match(/<button[\s\S]*?className="([^"]+)"/);
  assert(match, "Le bouton oeil doit declarer ses classes visuelles.");
  return match[1];
}

const passwordInput = readSource("src/components/PasswordInput.tsx");
const loginPage = readSource("src/app/login/page.tsx");
const registrationPage = readSource("src/app/inscription-eleve/page.tsx");
const passwordChangeForm = readSource("src/components/PasswordChangeForm.tsx");
const resetPasswordForm = readSource("src/components/ResetPasswordForm.tsx");
const passwordButtonClassName = getButtonClassName(passwordInput);

const interactivePasswordFiles = [
  "src/app/login/page.tsx",
  "src/app/inscription-eleve/page.tsx",
  "src/components/PasswordChangeForm.tsx",
  "src/components/ResetPasswordForm.tsx",
];

function assertReusablePasswordInput() {
  assertIncludes(
    passwordInput,
    "const [isVisible, setIsVisible] = useState(false)",
    "Le composant doit conserver un seul etat React pour la visibilite"
  );
  assert(countMatches(passwordInput, /useState\(/g) === 1, "PasswordInput ne doit definir qu'un seul etat React.");
  assertIncludes(passwordInput, "useRef<HTMLInputElement>(null)", "Le composant doit pouvoir restaurer le focus du nouvel input.");
  assertIncludes(passwordInput, "useEffect(() =>", "La restauration du focus doit etre liee a la bascule de visibilite.");
  assertIncludes(
    passwordInput,
    '<input key="password-hidden" type="password" {...inputProps} />',
    "Le champ doit rendre un input password distinct par defaut"
  );
  assertIncludes(
    passwordInput,
    '<input key="password-visible" type="text" {...inputProps} />',
    "Apres clic, le champ doit rendre un input text distinct"
  );
  assertNotIncludes(
    passwordInput,
    'type={isVisible ? "text" : "password"}',
    "Le composant ne doit plus modifier dynamiquement type sur le meme input"
  );
  assertMatches(
    passwordInput,
    /isVisible \? \(\s*<input key="password-visible" type="text" \{\.\.\.inputProps\} \/>\s*\) : \(\s*<input key="password-hidden" type="password" \{\.\.\.inputProps\} \/>\s*\)/,
    "La bascule doit alterner deux elements input distincts"
  );
  assertMatches(
    passwordInput,
    /const inputProps = \{\s*\.\.\.props,\s*disabled,\s*ref: inputRef,\s*className:/,
    "Les deux inputs doivent partager les memes props, attributs aria et classes visuelles"
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
    "const nextVisibility = !isVisible",
    "Un second clic doit remasquer le mot de passe"
  );
  assertIncludes(
    passwordInput,
    "...props,",
    "Les attributs, evenements et valeurs input existants doivent etre transmis"
  );
  assertIncludes(
    passwordInput,
    "{...inputProps}",
    "Les deux inputs doivent reutiliser les memes props pour conserver la valeur controlee"
  );
  assertMatches(
    passwordInput,
    /onClick=\{\(\) => \{\s*const nextVisibility = !isVisible;\s*shouldRestoreFocusRef\.current = true;\s*setIsVisible\(nextVisibility\);\s*onVisibilityChange\?\.\(nextVisibility\);/,
    "Le bouton doit basculer la visibilite, demander la restauration du focus et remonter le changement"
  );
  assertIncludes(
    passwordInput,
    "className={`${className} flex items-stretch overflow-hidden p-0 focus-within:border-sky-400`}",
    "Le conteneur doit conserver les classes recues et porter l'apparence du champ unique"
  );
  assertIncludes(
    passwordInput,
    '"min-w-0 flex-1',
    "L'input doit occuper l'espace disponible sans deborder"
  );
  assertIncludes(
    passwordInput,
    "min-h-11 min-w-11",
    "Le bouton doit garder une taille tactile adaptee"
  );
  assertMatches(
    passwordInput,
    /className="[^"]*inline-flex[^"]*min-h-11[^"]*min-w-11[^"]*"/,
    "Le bouton oeil doit rester visible et dimensionne dans la rangee flex"
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
    /type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & \{\s*onVisibilityChange\?: \(visible: boolean\) => void;\s*\};/,
    "Le typage doit accepter les props habituelles d'un input sans exposer type"
  );
  assertIncludes(
    passwordInput,
    "const nextVisibility = !isVisible",
    "Le clic doit calculer la nouvelle visibilite avant de mettre a jour l'etat"
  );
  assertIncludes(
    passwordInput,
    "setIsVisible(nextVisibility)",
    "Le clic doit appliquer la nouvelle visibilite calculee"
  );
  assertIncludes(
    passwordInput,
    "onVisibilityChange?.(nextVisibility)",
    "Le composant doit remonter le changement de visibilite"
  );
  assert(countMatches(passwordInput, /pointer-events-none/g) === 2, "Les deux SVG doivent ignorer les evenements pointeur.");
  assertNotIncludes(passwordButtonClassName, "hidden", "Le bouton ne doit pas etre masque.");
  assertNotIncludes(passwordButtonClassName, "sm:hidden", "Le bouton ne doit pas etre masque sur mobile ou desktop.");
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
    /<PasswordInput[\s\S]*autoComplete="current-password"[\s\S]*value=\{password\}[\s\S]*onChange=\{\(event\) => setPassword\(event\.target\.value\)\}[\s\S]*onVisibilityChange=\{\(visible\) => \{/,
    "La connexion doit conserver value, onChange et autoComplete, et recevoir les changements de visibilite"
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

function assertLoginMobileDiagnostic() {
  assertIncludes(
    loginPage,
    'const isDevelopment = process.env.NODE_ENV === "development"',
    "Le panneau de diagnostic doit etre limite au mode development"
  );
  assertIncludes(
    loginPage,
    "Diagnostic mobile temporaire",
    "Le panneau doit afficher son titre temporaire"
  );
  assertIncludes(
    loginPage,
    "Effacer le diagnostic",
    "Le panneau doit proposer un bouton d'effacement"
  );
  assertIncludes(
    loginPage,
    "max-h-40",
    "Le panneau doit limiter sa hauteur"
  );
  assertIncludes(
    loginPage,
    "overflow-y-auto",
    "Le panneau doit defiler si necessaire"
  );
  assertMatches(
    loginPage,
    /useEffect\(\(\) => \{\s*if \(!isDevelopment\) \{\s*return;\s*\}\s*const hydrationDiagnosticId = window\.setTimeout\(\(\) => \{\s*addDiagnosticEvent\("Page rendue côté client"\);\s*addDiagnosticEvent\("React hydraté"\);[\s\S]*return \(\) => window\.clearTimeout\(hydrationDiagnosticId\);/,
    "Le montage client doit journaliser le rendu client et l'hydratation React"
  );
  assertMatches(
    loginPage,
    /async function handleLogin\(event: FormEvent<HTMLFormElement>\) \{\s*addDiagnosticEvent\("Soumission React reçue"\);\s*event\.preventDefault\(\);/,
    "La soumission React doit etre journalisee au debut du gestionnaire existant"
  );
  assertIncludes(
    loginPage,
    'addDiagnosticEvent("Clic œil reçu")',
    "Le clic oeil doit etre journalise depuis la page de connexion"
  );
  assertIncludes(
    loginPage,
    "Visibilité mot de passe :",
    "La nouvelle visibilite du mot de passe doit etre journalisee"
  );
  assertIncludes(
    loginPage,
    'visible ? "affichée" : "masquée"',
    "Le diagnostic doit distinguer les etats affichee et masquee"
  );
  assertIncludes(
    loginPage,
    'window.addEventListener("error", handleError)',
    "Les erreurs JavaScript globales doivent etre capturees"
  );
  assertIncludes(
    loginPage,
    'window.addEventListener("unhandledrejection", handleUnhandledRejection)',
    "Les rejets de promesses doivent etre captures"
  );
  assertIncludes(
    loginPage,
    'window.removeEventListener("error", handleError)',
    "Le listener window.error doit etre nettoye"
  );
  assertIncludes(
    loginPage,
    'window.removeEventListener("unhandledrejection", handleUnhandledRejection)',
    "Le listener unhandledrejection doit etre nettoye"
  );
  assertIncludes(
    loginPage,
    "sanitizeDiagnosticMessage",
    "Les messages dynamiques du diagnostic doivent passer par une sanitation"
  );
  assertIncludes(
    loginPage,
    "[email masque]",
    "Les emails doivent etre masques dans le diagnostic"
  );
  assertIncludes(
    loginPage,
    "[token masque]",
    "Les tokens JWT doivent etre masques dans le diagnostic"
  );
  assertNotIncludes(
    loginPage,
    "addDiagnosticEvent(identifier",
    "L'identifiant saisi ne doit pas etre journalise"
  );
  assertNotIncludes(
    loginPage,
    "addDiagnosticEvent(password",
    "Le mot de passe ne doit pas etre journalise"
  );
  assertIncludes(
    loginPage,
    'fetch("/api/auth/login"',
    "La logique d'authentification doit continuer a appeler la meme route"
  );
  assertIncludes(
    loginPage,
    "body: JSON.stringify({ identifier, password })",
    "Le corps de connexion doit rester inchange"
  );
  assertIncludes(
    loginPage,
    "router.push(\"/\")",
    "La redirection post-connexion doit rester inchangee"
  );
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

function assertNoRouteMigrationOrRlsDiff() {
  const changedFiles = execSync("git diff --name-only", {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);

  for (const path of changedFiles) {
    assert(
      !path.startsWith("src/app/api/"),
      `Aucune route API ne doit etre modifiee pour ce diagnostic: ${path}`
    );
    assert(
      !path.startsWith("supabase/migrations/"),
      `Aucune migration ou RLS ne doit etre modifiee pour ce diagnostic: ${path}`
    );
  }
}

assertReusablePasswordInput();
assertPasswordInputUsage();
assertLoginMobileDiagnostic();
assertNoForgottenInteractivePasswordField();
assertFormsStillSubmit();
assertNoAuthOrSupabaseDrift();
assertNoRouteMigrationOrRlsDiff();

console.log("Password input tests passed.");
