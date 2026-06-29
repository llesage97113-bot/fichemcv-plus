import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function readProjectFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function assertIncludes(source: string, expected: string, message: string) {
  assert(source.includes(expected), message);
}

function assertMatches(source: string, pattern: RegExp, message: string) {
  assert(pattern.test(source), message);
}

function assertCreateClassDisclosure() {
  const source = readProjectFile("src/components/ClassRegistrationManager.tsx");

  assertIncludes(
    source,
    "const [isCreateClassExpanded, setIsCreateClassExpanded] = useState(false);",
    "Le bloc de création de classe doit être replié par défaut."
  );
  assertIncludes(
    source,
    'aria-expanded={isCreateClassExpanded}',
    "Le bouton de création de classe doit exposer aria-expanded."
  );
  assertIncludes(
    source,
    'aria-controls="create-class-form"',
    "Le bouton de création de classe doit pointer vers le formulaire."
  );
  assertMatches(
    source,
    /\{isCreateClassExpanded && \(\s*<form[\s\S]*id="create-class-form"/,
    "Le formulaire de création doit seulement être rendu après ouverture."
  );
  assertIncludes(
    source,
    "setIsCreateClassExpanded(false);",
    "Le bloc de création doit pouvoir se replier, notamment après création réussie."
  );
  assertIncludes(
    source,
    "+ Créer une nouvelle classe",
    "La commande compacte de création doit être affichée."
  );
  assertIncludes(
    source,
    "Replier",
    "Une action explicite doit permettre de refermer le formulaire."
  );
  assertIncludes(
    source,
    'method: "POST"',
    "La création de classe doit conserver l'appel POST existant."
  );
  assertIncludes(
    source,
    "Choisis une option MCV valide avant de créer la classe.",
    "La validation locale existante doit rester présente."
  );
}

function assertActivityOverviewDisclosure() {
  const source = readProjectFile("src/components/TeacherDashboard.tsx");

  assertIncludes(
    source,
    "const [isActivityOverviewExpanded, setIsActivityOverviewExpanded] = useState(false);",
    "La vue d'ensemble de l'activité doit être repliée par défaut."
  );
  assertIncludes(
    source,
    "Vue d’ensemble de l’activité",
    "Le bloc repliable doit porter le titre demandé."
  );
  assertIncludes(
    source,
    'aria-expanded={isActivityOverviewExpanded}',
    "Le bouton de vue d'ensemble doit exposer aria-expanded."
  );
  assertIncludes(
    source,
    'aria-controls="teacher-activity-overview"',
    "Le bouton de vue d'ensemble doit pointer vers les indicateurs."
  );
  assertMatches(
    source,
    /\{isActivityOverviewExpanded && \(\s*<div[\s\S]*id="teacher-activity-overview"/,
    "Les indicateurs détaillés doivent seulement être rendus après ouverture."
  );

  for (const label of [
    "À traiter maintenant",
    "En attente élève",
    "Finalisées",
    "Élèves sans activité",
  ]) {
    assertIncludes(
      source,
      label,
      `L'indicateur "${label}" doit rester présent.`
    );
  }

  assertIncludes(
    source,
    'id="teacher-priority-section"',
    "Le bloc À traiter en priorité doit rester présent."
  );
}

function assertTeacherFicheContextHeader() {
  const source = readProjectFile("src/app/fiches/[id]/page.tsx");

  assertIncludes(
    source,
    "Gestion des fiches",
    "La page de gestion doit afficher le titre Gestion des fiches."
  );
  assertIncludes(
    source,
    "studentFullName",
    "Le nom complet de l'élève doit être préparé pour l'en-tête."
  );
  assertIncludes(
    source,
    "className",
    "La classe doit être préparée pour l'en-tête."
  );
  assertIncludes(
    source,
    "← Retour au tableau de bord",
    "Un retour explicite vers le dashboard doit être présent."
  );
  assertIncludes(
    source,
    'aria-label="Fil d’Ariane"',
    "Le fil d'Ariane desktop doit être balisé."
  );
  assertIncludes(
    source,
    "Espace professeur",
    "Le fil d'Ariane doit commencer par Espace professeur."
  );
  assertIncludes(
    source,
    "Élèves et classes",
    "Le fil d'Ariane doit mentionner Élèves et classes."
  );
  assertIncludes(
    source,
    "md:hidden",
    "Une version mobile simplifiée doit être présente."
  );
  assertIncludes(
    source,
    "hidden md:block",
    "Le fil d'Ariane long doit être réservé aux écrans larges."
  );
}

function main() {
  assertCreateClassDisclosure();
  assertActivityOverviewDisclosure();
  assertTeacherFicheContextHeader();

  console.log("Teacher dashboard ergonomics tests passed.");
}

main();
