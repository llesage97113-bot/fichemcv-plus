import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import type { ArchivedE32FicheExportData } from "./ficheExportTypes";

const TEMPLATE_PATH = join(
  process.cwd(),
  "templates",
  "word",
  "E32_B_fiche_archived.docx",
);

type DocxtemplaterErrorProperties = {
  explanation?: string;
  errors?: unknown[];
};

type DocxtemplaterError = Error & {
  properties?: DocxtemplaterErrorProperties;
};

function formatDocxtemplaterError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const docxError = error as DocxtemplaterError;
  const details = docxError.properties;
  const nestedErrors = details?.errors
    ?.map((nestedError) => {
      if (nestedError instanceof Error) {
        const nested = nestedError as DocxtemplaterError;
        return nested.properties?.explanation ?? nested.message;
      }

      return String(nestedError);
    })
    .filter(Boolean);

  return [
    error.message,
    details?.explanation,
    nestedErrors && nestedErrors.length > 0
      ? `Détails: ${nestedErrors.join(" | ")}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" - ");
}

export function generateArchivedE32FicheDocx(
  data: ArchivedE32FicheExportData,
): Buffer {
  if (!existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template Word introuvable: ${TEMPLATE_PATH}`);
  }

  const templateBinary = readFileSync(TEMPLATE_PATH, "binary");
  const zip = new PizZip(templateBinary);

  try {
    const doc = new Docxtemplater(zip, {
      delimiters: { start: "{{", end: "}}" },
      paragraphLoop: true,
      linebreaks: true,
      errorLogging: false,
    });

    doc.render(data);

    return doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });
  } catch (error) {
    throw new Error(
      `Échec du rendu Docxtemplater pour ${TEMPLATE_PATH}: ${formatDocxtemplaterError(
        error,
      )}`,
    );
  }
}
