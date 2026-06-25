export type McvOption = "A" | "B";
export type Epreuve = "E31" | "E32";

export type FicheSectionDefinition = Readonly<{
  section_key: string;
  section_title: string;
  linked_competencies: readonly string[];
  sort_order: number;
}>;

export type FicheDefinition = Readonly<{
  epreuve: Epreuve;
  mcv_option: McvOption;
  numero_fiche: number;
  title: string;
  item_key: string;
  item_label: string;
  item_description: string;
  sections: readonly FicheSectionDefinition[];
}>;

export function isMcvOption(value: string | null | undefined): value is McvOption {
  return value === "A" || value === "B";
}

const OPTION_A_SECTIONS = [
  {
    section_key: "contexte",
    section_title: "Le contexte",
    linked_competencies: [],
    sort_order: 1,
  },
  {
    section_key: "lieu",
    section_title: "Le lieu",
    linked_competencies: [],
    sort_order: 2,
  },
  {
    section_key: "objectif_activite",
    section_title: "L’objectif de l’activité",
    linked_competencies: [],
    sort_order: 3,
  },
  {
    section_key: "acteurs",
    section_title: "Les acteurs",
    linked_competencies: [],
    sort_order: 4,
  },
  {
    section_key: "description_activite",
    section_title: "Description de l’activité",
    linked_competencies: [],
    sort_order: 5,
  },
  {
    section_key: "resultats_obtenus",
    section_title: "Le(s) résultat(s) obtenu(s)",
    linked_competencies: [],
    sort_order: 6,
  },
  {
    section_key: "propositions_amelioration",
    section_title: "Proposition(s) d’amélioration",
    linked_competencies: [],
    sort_order: 7,
  },
  {
    section_key: "bilan_personnel",
    section_title: "Bilan personnel",
    linked_competencies: [],
    sort_order: 8,
  },
] as const satisfies readonly FicheSectionDefinition[];

const E31_OPTION_B_SECTIONS = [
  {
    section_key: "contexte",
    section_title: "Contexte de la situation de vente",
    linked_competencies: ["contexte", "communication_professionnelle"],
    sort_order: 1,
  },
  {
    section_key: "besoin_client",
    section_title: "Découverte du besoin client",
    linked_competencies: ["questionnement", "besoin_client"],
    sort_order: 2,
  },
  {
    section_key: "offre_proposee",
    section_title: "Offre proposée",
    linked_competencies: ["offre_adaptee"],
    sort_order: 3,
  },
  {
    section_key: "argumentation",
    section_title: "Argumentation utilisée",
    linked_competencies: ["argumentation_commerciale"],
    sort_order: 4,
  },
  {
    section_key: "communication_professionnelle",
    section_title: "Communication professionnelle",
    linked_competencies: ["communication_professionnelle"],
    sort_order: 5,
  },
  {
    section_key: "bilan",
    section_title: "Bilan de la situation",
    linked_competencies: ["analyse_reflexive"],
    sort_order: 6,
  },
] as const satisfies readonly FicheSectionDefinition[];

const E32_OPTION_B_SECTIONS = [
  {
    section_key: "contexte_suivi",
    section_title: "Contexte de la situation de suivi",
    linked_competencies: ["contexte", "suivi_vente"],
    sort_order: 1,
  },
  {
    section_key: "suivi_commande",
    section_title: "Suivi de la commande",
    linked_competencies: ["suivi_commande"],
    sort_order: 2,
  },
  {
    section_key: "services_associes",
    section_title: "Services associés",
    linked_competencies: ["services_associes"],
    sort_order: 3,
  },
  {
    section_key: "retours_reclamations",
    section_title: "Retours ou réclamations",
    linked_competencies: ["reclamation", "demande_client"],
    sort_order: 4,
  },
  {
    section_key: "solution_client",
    section_title: "Solution proposée au client",
    linked_competencies: ["solution_client"],
    sort_order: 5,
  },
  {
    section_key: "satisfaction_client",
    section_title: "Satisfaction client",
    linked_competencies: ["satisfaction_client"],
    sort_order: 6,
  },
  {
    section_key: "amelioration_satisfaction",
    section_title: "Amélioration de la satisfaction",
    linked_competencies: ["amelioration_satisfaction"],
    sort_order: 7,
  },
  {
    section_key: "communication_professionnelle",
    section_title: "Communication professionnelle",
    linked_competencies: ["communication_professionnelle"],
    sort_order: 8,
  },
  {
    section_key: "bilan",
    section_title: "Bilan de la situation",
    linked_competencies: ["analyse_reflexive"],
    sort_order: 9,
  },
] as const satisfies readonly FicheSectionDefinition[];

const E31_FICHES = [
  {
    numero_fiche: 1,
    title: "E31-1 — Préparer et présenter une situation de vente-conseil",
    item_key: "E31-1",
    item_label: "Préparer et présenter une situation de vente-conseil",
    item_description:
      "Présente le contexte professionnel, l’entreprise, le client, la situation commerciale et les conditions de l’entretien.",
  },
  {
    numero_fiche: 2,
    title: "E31-2 — Conduire l’entretien et proposer une offre adaptée",
    item_key: "E31-2",
    item_label: "Conduire l’entretien et proposer une offre adaptée",
    item_description:
      "Explique comment tu questionnes le client, identifies son besoin, proposes une offre adaptée et construis ton argumentation.",
  },
  {
    numero_fiche: 3,
    title: "E31-3 — Argumenter, finaliser et analyser la vente",
    item_key: "E31-3",
    item_label: "Argumenter, finaliser et analyser la vente",
    item_description:
      "Décris la finalisation de la vente, ta communication professionnelle, le résultat obtenu et ton bilan réflexif.",
  },
] as const;

const E32_FICHES = [
  {
    numero_fiche: 1,
    title: "E32-1 — Assurer le suivi d’une commande client",
    item_key: "E32-1",
    item_label: "Assurer le suivi d’une commande client",
    item_description:
      "Présente le suivi d’une commande, les outils utilisés, les étapes de contrôle et l’information transmise au client.",
  },
  {
    numero_fiche: 2,
    title: "E32-2 — Présenter les services associés à la vente",
    item_key: "E32-2",
    item_label: "Présenter les services associés à la vente",
    item_description:
      "Décris les services proposés autour de la vente : retrait, livraison, garantie, fidélisation, financement ou accompagnement.",
  },
  {
    numero_fiche: 3,
    title: "E32-3 — Traiter une demande, un retour ou une réclamation",
    item_key: "E32-3",
    item_label: "Traiter une demande, un retour ou une réclamation",
    item_description:
      "Explique la demande du client, le retour ou la réclamation rencontrée, puis la solution proposée et son suivi.",
  },
  {
    numero_fiche: 4,
    title: "E32-4 — Mesurer et améliorer la satisfaction client",
    item_key: "E32-4",
    item_label: "Mesurer et améliorer la satisfaction client",
    item_description:
      "Présente les indicateurs, retours clients ou outils utilisés pour mesurer la satisfaction et proposer des améliorations.",
  },
] as const;

function buildFiches(
  option: McvOption,
  epreuve: Epreuve,
  fiches: typeof E31_FICHES | typeof E32_FICHES,
  sections: readonly FicheSectionDefinition[]
): readonly FicheDefinition[] {
  return fiches.map((fiche) => ({
    ...fiche,
    epreuve,
    mcv_option: option,
    sections,
  }));
}

const OPTION_A_FICHES = [
  ...buildFiches("A", "E31", E31_FICHES, OPTION_A_SECTIONS),
  ...buildFiches("A", "E32", E32_FICHES, OPTION_A_SECTIONS),
] as const satisfies readonly FicheDefinition[];

const OPTION_B_FICHES = [
  ...buildFiches("B", "E31", E31_FICHES, E31_OPTION_B_SECTIONS),
  ...buildFiches("B", "E32", E32_FICHES, E32_OPTION_B_SECTIONS),
] as const satisfies readonly FicheDefinition[];

export const FICHE_DEFINITIONS_BY_OPTION = {
  A: OPTION_A_FICHES,
  B: OPTION_B_FICHES,
} as const satisfies Record<McvOption, readonly FicheDefinition[]>;

export function getFicheDefinitionsForOption(
  option: McvOption
): readonly FicheDefinition[] {
  return FICHE_DEFINITIONS_BY_OPTION[option];
}
