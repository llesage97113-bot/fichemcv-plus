import type { SupabaseClient } from "@supabase/supabase-js";

import type { ArchivedE32FicheExportData } from "./ficheExportTypes";
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
  | "context_suivi"
  | "order_follow_up"
  | "associated_services"
  | "returns_or_complaints"
  | "customer_solution"
  | "customer_satisfaction"
  | "satisfaction_improvement"
  | "professional_communication"
  | "conclusion";

const E32_SECTION_MAPPING: Record<
  string,
  { exportKey: SectionExportKey; expectedTitle: string }
> = {
  contexte_suivi: {
    exportKey: "context_suivi",
    expectedTitle: "Contexte du suivi de commande",
  },
  suivi_commande: {
    exportKey: "order_follow_up",
    expectedTitle: "Suivi de la commande",
  },
  services_associes: {
    exportKey: "associated_services",
    expectedTitle: "Services associés",
  },
  retours_reclamations: {
    exportKey: "returns_or_complaints",
    expectedTitle: "Retours ou réclamations",
  },
  solution_client: {
    exportKey: "customer_solution",
    expectedTitle: "Solution apportée au client",
  },
  satisfaction_client: {
    exportKey: "customer_satisfaction",
    expectedTitle: "Satisfaction client",
  },
  amelioration_satisfaction: {
    exportKey: "satisfaction_improvement",
    expectedTitle: "Amélioration de la satisfaction",
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

  if (fiche.epreuve !== "E32") {
    throw new Error(
      `Export refusé: epreuve attendue "E32", reçue "${fiche.epreuve ?? ""}".`,
    );
  }

  if (fiche.mcv_option !== "B") {
    throw new Error(
      `Export refusé: mcv_option attendue "B", reçue "${
        fiche.mcv_option ?? ""
      }".`,
    );
  }

  requireValue(fiche.archived_at, "fiches.archived_at");
}

function buildSectionContent(
  sections: SectionExportRow[],
): Record<SectionExportKey, string> {
  const byExportKey = new Map<SectionExportKey, string>();
  const seenSectionKeys = new Set<string>();
  const duplicates = new Set<string>();
  const unexpected = new Set<string>();

  for (const section of sections) {
    const sectionKey = normalizeOptional(section.section_key);

    if (!sectionKey) {
      continue;
    }

    if (!(sectionKey in E32_SECTION_MAPPING)) {
      unexpected.add(sectionKey);
      continue;
    }

    if (seenSectionKeys.has(sectionKey)) {
      duplicates.add(sectionKey);
      continue;
    }

    seenSectionKeys.add(sectionKey);
    const mapping = E32_SECTION_MAPPING[sectionKey];
    byExportKey.set(mapping.exportKey, section.content ?? "");
  }

  const missing = Object.keys(E32_SECTION_MAPPING).filter(
    (sectionKey) => !seenSectionKeys.has(sectionKey),
  );

  if (duplicates.size > 0 || missing.length > 0 || unexpected.size > 0) {
    const issues = [
      missing.length > 0
        ? `sections E32 manquantes: ${missing.join(", ")}`
        : "",
      duplicates.size > 0
        ? `sections E32 dupliquées: ${Array.from(duplicates).join(", ")}`
        : "",
      unexpected.size > 0
        ? `sections E32 inattendues: ${Array.from(unexpected).join(", ")}`
        : "",
    ].filter(Boolean);

    throw new Error(
      `Correspondance des sections E32 impossible: ${issues.join("; ")}.`,
    );
  }

  return {
    context_suivi: byExportKey.get("context_suivi") ?? "",
    order_follow_up: byExportKey.get("order_follow_up") ?? "",
    associated_services: byExportKey.get("associated_services") ?? "",
    returns_or_complaints: byExportKey.get("returns_or_complaints") ?? "",
    customer_solution: byExportKey.get("customer_solution") ?? "",
    customer_satisfaction: byExportKey.get("customer_satisfaction") ?? "",
    satisfaction_improvement:
      byExportKey.get("satisfaction_improvement") ?? "",
    professional_communication:
      byExportKey.get("professional_communication") ?? "",
    conclusion: byExportKey.get("conclusion") ?? "",
  };
}

export async function collectArchivedE32FicheExportData(
  supabase: SupabaseClient,
  ficheId: string,
): Promise<ArchivedE32FicheExportData> {
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

export const archivedFicheE32SectionMapping = E32_SECTION_MAPPING;
