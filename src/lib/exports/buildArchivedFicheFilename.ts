import type {
  ArchivedE32FicheExportData,
  ArchivedFicheExportData,
  ArchivedOptionAFicheExportData,
} from "./ficheExportTypes";

const MAX_FILENAME_LENGTH = 120;
type ArchivedFicheFilenameData =
  | ArchivedFicheExportData
  | ArchivedE32FicheExportData
  | ArchivedOptionAFicheExportData;

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
  data: ArchivedFicheFilenameData,
): string {
  const epreuve = normalizeArchivedFicheFilenamePart(data.epreuve);
  const mcvOption =
    data.mcv_option.startsWith("B") || data.mcv_option === "A"
      ? data.mcv_option.slice(0, 1)
      : data.mcv_option;
  const parts = [
    epreuve,
    normalizeArchivedFicheFilenamePart(mcvOption),
    normalizeArchivedFicheFilenamePart(data.candidate_full_name),
    data.epreuve === "E31" && data.candidate_number
      ? normalizeArchivedFicheFilenamePart(data.candidate_number)
      : "",
    "fiche",
    normalizeArchivedFicheFilenamePart(data.fiche_number),
  ].filter(Boolean);

  const basename = parts.join("_").slice(0, MAX_FILENAME_LENGTH);

  return `${basename}.docx`;
}
