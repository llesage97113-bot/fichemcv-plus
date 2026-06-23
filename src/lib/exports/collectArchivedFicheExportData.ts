import type { SupabaseClient } from "@supabase/supabase-js";

import type { ArchivedFicheExportData } from "./ficheExportTypes";
import { isValidUuid } from "./isValidUuid";

type NullableString = string | null;

type FicheExportRow = {
  id: string;
  student_id: string | null;
  class_id: string | null;
  status: string | null;
  epreuve: string | null;
  mcv_option: string | null;
  numero_fiche: number | string | null;
  title: string | null;
  company_name: NullableString;
  pfmp_period: NullableString;
  situation_date: NullableString;
  student_role: NullableString;
  realization_conditions: NullableString;
  updated_at: NullableString;
  archived_at: NullableString;
};

type StudentExportRow = {
  id: string;
  first_name: NullableString;
  last_name: NullableString;
  candidate_number: NullableString;
};

type ClassExportRow = {
  id: string;
  name: NullableString;
  school_name: NullableString;
  exam_session: NullableString;
};

type SectionExportRow = {
  id: string;
  section_key: NullableString;
  section_title: NullableString;
  content: NullableString;
  sort_order: number | null;
};

type SectionExportKey =
  | "context"
  | "customer_need"
  | "proposed_offer"
  | "argumentation"
  | "professional_communication"
  | "conclusion";

// Correspondance E31 issue des templates créés à la validation d'inscription.
// La clé stable est section_key; les titres et l'ordre ne servent pas à déduire.
const E31_SECTION_MAPPING: Record<
  string,
  { exportKey: SectionExportKey; expectedTitle: string }
> = {
  contexte: {
    exportKey: "context",
    expectedTitle: "Contexte de la situation de vente",
  },
  besoin_client: {
    exportKey: "customer_need",
    expectedTitle: "Découverte du besoin client",
  },
  offre_proposee: {
    exportKey: "proposed_offer",
    expectedTitle: "Offre proposée",
  },
  argumentation: {
    exportKey: "argumentation",
    expectedTitle: "Argumentation utilisée",
  },
  communication_professionnelle: {
    exportKey: "professional_communication",
    expectedTitle: "Communication professionnelle",
  },
  bilan: {
    exportKey: "conclusion",
    expectedTitle: "Bilan de la situation",
  },
};

function normalizeOptional(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function requireValue(value: unknown, fieldName: string): string {
  const normalized = normalizeOptional(value);

  if (!normalized) {
    throw new Error(`Champ obligatoire absent pour l'export: ${fieldName}.`);
  }

  return normalized;
}

function formatFrenchDate(value: string, fieldName: string): string {
  const normalized = requireValue(value, fieldName);
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `Date invalide pour l'export: ${fieldName} (${normalized}).`,
    );
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Guadeloupe",
  }).format(date);
}

function assertFicheId(ficheId: string): string {
  const normalized = ficheId.trim();

  if (!isValidUuid(normalized)) {
    throw new Error("Identifiant fiche invalide: UUID attendu.");
  }

  return normalized;
}

function ensureExportableFiche(fiche: FicheExportRow) {
  if (fiche.status !== "archivee") {
    throw new Error(
      `Export refusé: status attendu "archivee", reçu "${fiche.status ?? ""}".`,
    );
  }

  if (fiche.epreuve !== "E31") {
    throw new Error(
      `Export refusé: epreuve attendue "E31", reçue "${fiche.epreuve ?? ""}".`,
    );
  }

  if (fiche.mcv_option !== "B") {
    throw new Error(
      `Export refusé: mcv_option attendue "B", reçue "${
        fiche.mcv_option ?? ""
      }".`,
    );
  }
}

function buildSectionContent(
  sections: SectionExportRow[],
): Record<SectionExportKey, string> {
  const byExportKey = new Map<SectionExportKey, string>();
  const seenSectionKeys = new Set<string>();
  const duplicates = new Set<string>();

  for (const section of sections) {
    const sectionKey = normalizeOptional(section.section_key);

    if (!sectionKey || !(sectionKey in E31_SECTION_MAPPING)) {
      continue;
    }

    if (seenSectionKeys.has(sectionKey)) {
      duplicates.add(sectionKey);
      continue;
    }

    seenSectionKeys.add(sectionKey);
    const mapping = E31_SECTION_MAPPING[sectionKey];
    byExportKey.set(mapping.exportKey, section.content ?? "");
  }

  const missing = Object.keys(E31_SECTION_MAPPING).filter(
    (sectionKey) => !seenSectionKeys.has(sectionKey),
  );

  if (duplicates.size > 0 || missing.length > 0) {
    const issues = [
      missing.length > 0
        ? `sections E31 manquantes: ${missing.join(", ")}`
        : "",
      duplicates.size > 0
        ? `sections E31 dupliquées: ${Array.from(duplicates).join(", ")}`
        : "",
    ].filter(Boolean);

    throw new Error(`Correspondance des sections E31 impossible: ${issues.join("; ")}.`);
  }

  return {
    context: byExportKey.get("context") ?? "",
    customer_need: byExportKey.get("customer_need") ?? "",
    proposed_offer: byExportKey.get("proposed_offer") ?? "",
    argumentation: byExportKey.get("argumentation") ?? "",
    professional_communication:
      byExportKey.get("professional_communication") ?? "",
    conclusion: byExportKey.get("conclusion") ?? "",
  };
}

export async function collectArchivedFicheExportData(
  supabase: SupabaseClient,
  ficheId: string,
): Promise<ArchivedFicheExportData> {
  const normalizedFicheId = assertFicheId(ficheId);

  const { data: fiche, error: ficheError } = await supabase
    .from("fiches")
    .select(
      [
        "id",
        "student_id",
        "class_id",
        "status",
        "epreuve",
        "mcv_option",
        "numero_fiche",
        "title",
        "company_name",
        "pfmp_period",
        "situation_date",
        "student_role",
        "realization_conditions",
        "updated_at",
        "archived_at",
      ].join(", "),
    )
    .eq("id", normalizedFicheId)
    .single();

  if (ficheError || !fiche) {
    throw new Error(
      `Fiche introuvable ou inaccessible: ${
        ficheError?.message ?? normalizedFicheId
      }`,
    );
  }

  const ficheRow = fiche as unknown as FicheExportRow;
  ensureExportableFiche(ficheRow);

  const studentId = requireValue(ficheRow.student_id, "fiches.student_id");
  const classId = requireValue(ficheRow.class_id, "fiches.class_id");

  const [
    { data: student, error: studentError },
    { data: classData, error: classError },
    { data: sections, error: sectionsError },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id, first_name, last_name, candidate_number")
      .eq("id", studentId)
      .single(),
    supabase
      .from("classes")
      .select("id, name, school_name, exam_session")
      .eq("id", classId)
      .single(),
    supabase
      .from("fiche_sections")
      .select("id, section_key, section_title, content, sort_order")
      .eq("fiche_id", normalizedFicheId)
      .order("sort_order", { ascending: true }),
  ]);

  if (studentError || !student) {
    throw new Error(
      `Élève introuvable ou inaccessible: ${studentError?.message ?? studentId}`,
    );
  }

  if (classError || !classData) {
    throw new Error(
      `Classe introuvable ou inaccessible: ${classError?.message ?? classId}`,
    );
  }

  if (sectionsError || !sections) {
    throw new Error(
      `Sections introuvables ou inaccessibles: ${
        sectionsError?.message ?? normalizedFicheId
      }`,
    );
  }

  const studentRow = student as unknown as StudentExportRow;
  const classRow = classData as unknown as ClassExportRow;
  const sectionContent = buildSectionContent(
    sections as unknown as SectionExportRow[],
  );

  return {
    school_name: requireValue(classRow.school_name, "classes.school_name"),
    exam_session: requireValue(classRow.exam_session, "classes.exam_session"),
    candidate_full_name: `${requireValue(
      studentRow.first_name,
      "students.first_name",
    )} ${requireValue(studentRow.last_name, "students.last_name")}`,
    // Facultatif tant que les numéros candidats Cyclades ne sont pas disponibles.
    candidate_number: normalizeOptional(studentRow.candidate_number),
    class_name: requireValue(classRow.name, "classes.name"),
    epreuve: requireValue(ficheRow.epreuve, "fiches.epreuve"),
    mcv_option: "B - Prospection clientèle et valorisation de l'offre commerciale",
    fiche_number: requireValue(ficheRow.numero_fiche, "fiches.numero_fiche"),
    fiche_title: requireValue(ficheRow.title, "fiches.title"),
    company_name: normalizeOptional(ficheRow.company_name),
    pfmp_period: normalizeOptional(ficheRow.pfmp_period),
    situation_date: normalizeOptional(ficheRow.situation_date),
    student_role: normalizeOptional(ficheRow.student_role),
    realization_conditions: normalizeOptional(
      ficheRow.realization_conditions,
    ),
    ...sectionContent,
    updated_at: formatFrenchDate(ficheRow.updated_at ?? "", "fiches.updated_at"),
    archived_at: formatFrenchDate(
      ficheRow.archived_at ?? "",
      "fiches.archived_at",
    ),
  };
}

export const archivedFicheE31SectionMapping = E31_SECTION_MAPPING;
