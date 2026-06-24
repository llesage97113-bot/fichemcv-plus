import type { SupabaseClient } from "@supabase/supabase-js";

import type { ArchivedOptionAFicheExportData } from "./ficheExportTypes";
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

type OptionASectionExportKey =
  | "context"
  | "location"
  | "activity_objective"
  | "actors"
  | "activity_description"
  | "results"
  | "improvement_proposals"
  | "personal_review";

const OPTION_A_SECTION_MAPPING: Record<string, OptionASectionExportKey> = {
  contexte: "context",
  lieu: "location",
  objectif_activite: "activity_objective",
  acteurs: "actors",
  description_activite: "activity_description",
  resultats_obtenus: "results",
  propositions_amelioration: "improvement_proposals",
  bilan_personnel: "personal_review",
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

export function normalizeArchivedMcvOption(value: unknown): "A" | "B" | null {
  const normalized = normalizeOptional(value).toUpperCase();

  if (/^(OPTION\s*)?A(\b|$)/.test(normalized)) {
    return "A";
  }

  if (/^(OPTION\s*)?B(\b|$)/.test(normalized)) {
    return "B";
  }

  return null;
}

export function stripFicheTitlePrefixForWord(value: unknown): string {
  return normalizeOptional(value).replace(
    /^\s*E(?:31|32)\s*[-.]\s*\d+\s*(?:-|\u2013|\u2014)\s*/i,
    "",
  );
}

function normalizeEpreuve(value: unknown): "E31" | "E32" | null {
  const normalized = normalizeOptional(value).toUpperCase();

  if (normalized === "E31" || normalized === "E32") {
    return normalized;
  }

  return null;
}

function ensureExportableFiche(fiche: FicheExportRow): "E31" | "E32" {
  if (fiche.status !== "archivee") {
    throw new Error(
      `Export refusé: status attendu "archivee", reçu "${fiche.status ?? ""}".`,
    );
  }

  const epreuve = normalizeEpreuve(fiche.epreuve);

  if (!epreuve) {
    throw new Error(
      `Export refusé: epreuve Option A attendue "E31" ou "E32", reçue "${
        fiche.epreuve ?? ""
      }".`,
    );
  }

  const option = normalizeArchivedMcvOption(fiche.mcv_option);

  if (option !== "A") {
    throw new Error(
      `Export refusé: mcv_option attendue "A", reçue "${
        fiche.mcv_option ?? ""
      }".`,
    );
  }

  return epreuve;
}

function buildSectionContent(
  sections: SectionExportRow[],
): Record<OptionASectionExportKey, string> {
  const content: Record<OptionASectionExportKey, string> = {
    context: "",
    location: "",
    activity_objective: "",
    actors: "",
    activity_description: "",
    results: "",
    improvement_proposals: "",
    personal_review: "",
  };

  for (const section of sections) {
    const sectionKey = normalizeOptional(section.section_key);
    const exportKey = OPTION_A_SECTION_MAPPING[sectionKey];

    if (!exportKey || content[exportKey]) {
      continue;
    }

    content[exportKey] = section.content ?? "";
  }

  return content;
}

export async function collectArchivedOptionAFicheExportData(
  supabase: SupabaseClient,
  ficheId: string,
): Promise<ArchivedOptionAFicheExportData> {
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
  const epreuve = ensureExportableFiche(ficheRow);
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

  // Les anciennes fiches A peuvent encore porter les clés B: elles ne sont
  // pas migrées ici et les rubriques A absentes restent vides dans Word.
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
    candidate_number: normalizeOptional(studentRow.candidate_number),
    class_name: requireValue(classRow.name, "classes.name"),
    epreuve,
    mcv_option: "A",
    fiche_number: requireValue(ficheRow.numero_fiche, "fiches.numero_fiche"),
    fiche_title: stripFicheTitlePrefixForWord(
      requireValue(ficheRow.title, "fiches.title"),
    ),
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

export const archivedOptionASectionMapping = OPTION_A_SECTION_MAPPING;
