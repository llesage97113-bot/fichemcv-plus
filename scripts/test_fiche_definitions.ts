import {
  getFicheDefinitionsForOption,
  type FicheDefinition,
  type McvOption,
} from "../src/lib/ficheDefinitions";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function keysFor(fiche: FicheDefinition) {
  return fiche.sections.map((section) => section.section_key);
}

function assertArrayEquals<T>(actual: readonly T[], expected: readonly T[], message: string) {
  assert(
    actual.length === expected.length &&
      actual.every((value, index) => value === expected[index]),
    `${message}. Attendu: ${expected.join(", ")}. Reçu: ${actual.join(", ")}.`
  );
}

function assertNoDuplicateSectionKeys(fiche: FicheDefinition) {
  const keys = keysFor(fiche);
  assert(
    new Set(keys).size === keys.length,
    `${fiche.epreuve}-${fiche.mcv_option}-${fiche.numero_fiche} contient des sections en doublon.`
  );
}

function assertUniqueFiches(definitions: readonly FicheDefinition[]) {
  const keys = definitions.map(
    (fiche) => `${fiche.epreuve}-${fiche.numero_fiche}-${fiche.mcv_option}`
  );

  assert(
    new Set(keys).size === keys.length,
    `Doublon de fiche détecté: ${keys.join(", ")}.`
  );
}

function assertNoE31NumberFour(definitions: readonly FicheDefinition[]) {
  assert(
    !definitions.some(
      (fiche) => fiche.epreuve === "E31" && fiche.numero_fiche === 4
    ),
    "Une fiche E31 numéro 4 ne doit jamais être générée."
  );
}

function definitionsByEpreuve(
  definitions: readonly FicheDefinition[],
  epreuve: "E31" | "E32"
) {
  return definitions
    .filter((fiche) => fiche.epreuve === epreuve)
    .sort((a, b) => a.numero_fiche - b.numero_fiche);
}

function assertCommonOptionRules(
  option: McvOption,
  definitions: readonly FicheDefinition[]
) {
  const e31 = definitionsByEpreuve(definitions, "E31");
  const e32 = definitionsByEpreuve(definitions, "E32");

  assert(definitions.length === 7, `Option ${option}: 7 fiches attendues.`);
  assert(e31.length === 3, `Option ${option}: 3 fiches E31 attendues.`);
  assert(e32.length === 4, `Option ${option}: 4 fiches E32 attendues.`);
  assertArrayEquals(
    e31.map((fiche) => fiche.numero_fiche),
    [1, 2, 3],
    `Option ${option}: numéros E31 incorrects`
  );
  assertArrayEquals(
    e32.map((fiche) => fiche.numero_fiche),
    [1, 2, 3, 4],
    `Option ${option}: numéros E32 incorrects`
  );
  assert(
    definitions.every((fiche) => fiche.mcv_option === option),
    `Option ${option}: mcv_option incohérente.`
  );

  for (const fiche of definitions) {
    assertNoDuplicateSectionKeys(fiche);
  }

  assertUniqueFiches(definitions);
  assertNoE31NumberFour(definitions);
}

function assertOptionA() {
  const definitions = getFicheDefinitionsForOption("A");
  const expectedSectionKeys = [
    "contexte",
    "lieu",
    "objectif_activite",
    "acteurs",
    "description_activite",
    "resultats_obtenus",
    "propositions_amelioration",
    "bilan_personnel",
  ];

  assertCommonOptionRules("A", definitions);

  for (const fiche of definitions) {
    assert(fiche.sections.length === 8, "Option A: chaque fiche doit avoir 8 sections.");
    assertArrayEquals(
      keysFor(fiche),
      expectedSectionKeys,
      `Option A ${fiche.epreuve}-${fiche.numero_fiche}: clés de sections incorrectes`
    );
  }
}

function assertOptionB() {
  const definitions = getFicheDefinitionsForOption("B");
  const e31 = definitionsByEpreuve(definitions, "E31");
  const e32 = definitionsByEpreuve(definitions, "E32");

  assertCommonOptionRules("B", definitions);

  assertArrayEquals(
    e31.map((fiche) => fiche.title),
    [
      "E31-1 — Préparer et présenter une situation de vente-conseil",
      "E31-2 — Conduire l’entretien et proposer une offre adaptée",
      "E31-3 — Argumenter, finaliser et analyser la vente",
    ],
    "Option B: titres E31 modifiés"
  );
  assertArrayEquals(
    e32.map((fiche) => fiche.title),
    [
      "E32-1 — Assurer le suivi d’une commande client",
      "E32-2 — Présenter les services associés à la vente",
      "E32-3 — Traiter une demande, un retour ou une réclamation",
      "E32-4 — Mesurer et améliorer la satisfaction client",
    ],
    "Option B: titres E32 modifiés"
  );

  for (const fiche of e31) {
    assert(fiche.sections.length === 6, "Option B E31: 6 sections attendues.");
  }

  for (const fiche of e32) {
    assert(fiche.sections.length === 9, "Option B E32: 9 sections attendues.");
  }
}

assertOptionA();
assertOptionB();

console.log("Définitions de fiches Option A/B validées.");
