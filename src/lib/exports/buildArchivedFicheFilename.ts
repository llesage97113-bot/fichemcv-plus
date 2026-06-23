import type { ArchivedFicheExportData } from "./ficheExportTypes";

const MAX_FILENAME_LENGTH = 120;

export function normalizeArchivedFicheFilenamePart(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9_-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "sans_nom"
  );
}

export function buildArchivedFicheFilename(
  data: ArchivedFicheExportData,
): string {
  const parts = [
    "E31",
    "B",
    normalizeArchivedFicheFilenamePart(data.candidate_full_name),
    data.candidate_number
      ? normalizeArchivedFicheFilenamePart(data.candidate_number)
      : "",
    "fiche",
    normalizeArchivedFicheFilenamePart(data.fiche_number),
  ].filter(Boolean);

  const basename = parts.join("_").slice(0, MAX_FILENAME_LENGTH);

  return `${basename}.docx`;
}
