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

function assertNotIncludes(source: string, unexpected: string, message: string) {
  assert(!source.includes(unexpected), message);
}

function assertMatches(source: string, pattern: RegExp, message: string) {
  assert(pattern.test(source), message);
}

function countOccurrences(source: string, pattern: RegExp) {
  return source.match(pattern)?.length ?? 0;
}

function assertTeacherFichePagePanel() {
  const source = readProjectFile("src/app/fiches/[id]/page.tsx");

  assertIncludes(
    source,
    "function TeacherTreatmentPanel",
    "La page professeur doit définir le panneau de traitement."
  );
  assertIncludes(
    source,
    "Traitement professeur",
    "Le panneau doit porter le titre Traitement professeur."
  );
  assertIncludes(
    source,
    "Statut actuel",
    "Le panneau doit afficher explicitement le statut courant."
  );
  assertIncludes(
    source,
    "getStatusLabel(fiche.status)",
    "Le statut affiché doit rester basé sur le statut réel de la fiche."
  );
  assertIncludes(
    source,
    "Commentaires et consignes",
    "Le panneau doit rapprocher les remarques professeur des actions."
  );
  assertIncludes(
    source,
    "TeacherSectionFeedbackEditor",
    "Le formulaire existant de remarque professeur doit être réutilisé."
  );
  assertIncludes(
    source,
    "embedded",
    "Les remarques intégrées au panneau doivent utiliser l'affichage compact."
  );
  assertIncludes(
    source,
    "showTeacherFeedback={false}",
    "Les remarques ne doivent pas être dupliquées dans le contenu principal professeur."
  );
  assertIncludes(
    source,
    "TeacherWorkflowActions",
    "Les actions workflow existantes doivent être réutilisées."
  );
  assert(
    countOccurrences(source, /<TeacherWorkflowActions\b/g) === 1,
    "Les actions workflow ne doivent être rendues qu'une seule fois."
  );
  assertIncludes(
    source,
    'href={`/api/fiches/${ficheId}/export/word`}',
    "L'export Word existant doit rester disponible sur la page."
  );
  assertIncludes(
    source,
    'status === "archivee"',
    "L'export Word doit rester conditionné au statut archivé."
  );
  assertIncludes(
    source,
    "ActivityInfoReadOnly",
    "Les informations d'activité de la fiche doivent rester affichées."
  );
  assertIncludes(
    source,
    "SectionEditor",
    "Le contenu principal de la fiche doit rester affiché."
  );
  assertIncludes(
    source,
    "FinalSectionsPreview",
    "La prévisualisation finale doit rester affichée pour les statuts finaux."
  );
  assertIncludes(
    source,
    "Gestion des fiches",
    "L'en-tête Gestion des fiches doit être conservé."
  );
  assertIncludes(
    source,
    "← Retour au tableau de bord",
    "Le retour dashboard doit être conservé."
  );
  assertIncludes(
    source,
    "order-1 lg:order-2",
    "Sur mobile, le panneau doit passer avant le contenu principal."
  );
  assertIncludes(
    source,
    "lg:grid-cols-[minmax(0,1fr)_24rem]",
    "Sur desktop, le panneau doit être placé en colonne latérale."
  );
  assertNotIncludes(
    source,
    "router.push",
    "La page ne doit pas introduire de redirection après action."
  );
}

function assertWorkflowActionsRemainContextual() {
  const source = readProjectFile("src/components/TeacherWorkflowActions.tsx");

  assertIncludes(
    source,
    'const canRequestCorrection = status === "soumise";',
    "La demande de correction doit rester limitée au statut soumise."
  );
  assertIncludes(
    source,
    'const canReopenForCorrection = status === "corrigee";',
    "La réouverture en correction doit rester limitée au statut corrigée."
  );
  assertIncludes(
    source,
    'const canValidate = status === "soumise" || status === "corrigee";',
    "La validation doit rester limitée aux fiches soumises ou corrigées."
  );
  assertIncludes(
    source,
    'const canLock = status === "validee";',
    "Le verrouillage doit rester limité au statut validée."
  );
  assertIncludes(
    source,
    'const canArchive = status === "verrouillee";',
    "L'archivage doit rester limité au statut verrouillée."
  );
  assertMatches(
    source,
    /case "archivee":[\s\S]*Fiche archivée : lecture seule, aucune action attendue\./,
    "Une fiche archivée doit rester en lecture seule dans les actions professeur."
  );
  assertNotIncludes(
    source,
    "router.push",
    "Les actions workflow doivent rester sur la page après succès."
  );
  assertIncludes(
    source,
    "router.refresh();",
    "Les actions workflow doivent rafraîchir le statut affiché après succès."
  );
}

function assertFeedbackEditorRouteIsPreserved() {
  const source = readProjectFile("src/components/TeacherSectionFeedbackEditor.tsx");

  assertIncludes(
    source,
    'fetch("/api/teacher/section-feedback"',
    "La sauvegarde des remarques doit conserver la route existante."
  );
  assertIncludes(
    source,
    "teacherFeedback: feedback.trim() || null",
    "Le format de sauvegarde des remarques ne doit pas changer."
  );
  assertIncludes(
    source,
    "readOnly",
    "L'éditeur doit conserver le mode lecture seule."
  );
  assertIncludes(
    source,
    "embedded",
    "L'éditeur doit proposer un rendu intégré sans nouveau formulaire."
  );
}

function main() {
  assertTeacherFichePagePanel();
  assertWorkflowActionsRemainContextual();
  assertFeedbackEditorRouteIsPreserved();

  console.log("Teacher fiche treatment panel tests passed.");
}

main();
