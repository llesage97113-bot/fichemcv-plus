import { existsSync, readFileSync } from "node:fs";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

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

export function generateArchivedWordDocx(
  data: object,
  templatePath: string,
): Buffer {
  if (!existsSync(templatePath)) {
    throw new Error(`Template Word introuvable: ${templatePath}`);
  }

  const templateBinary = readFileSync(templatePath, "binary");
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
      `Échec du rendu Docxtemplater pour ${templatePath}: ${formatDocxtemplaterError(
        error,
      )}`,
    );
  }
}
