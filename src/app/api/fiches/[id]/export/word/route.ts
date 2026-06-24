import { NextResponse } from "next/server";
import { join } from "node:path";

import { createClient } from "@/lib/supabase/server";
import { buildArchivedFicheFilename } from "@/lib/exports/buildArchivedFicheFilename";
import { collectArchivedE32FicheExportData } from "@/lib/exports/collectArchivedE32FicheExportData";
import { collectArchivedFicheExportData } from "@/lib/exports/collectArchivedFicheExportData";
import {
  collectArchivedOptionAFicheExportData,
  normalizeArchivedMcvOption,
} from "@/lib/exports/collectArchivedOptionAFicheExportData";
import { generateArchivedWordDocx } from "@/lib/exports/generateArchivedWordDocx";
import { isValidUuid } from "@/lib/exports/isValidUuid";

export const runtime = "nodejs";

type ExportableFicheRow = {
  id: string;
  status: string | null;
  epreuve: string | null;
  mcv_option: string | null;
};

type SupabaseSessionClient = Awaited<ReturnType<typeof createClient>>;
type NormalizedEpreuve = "E31" | "E32";
type NormalizedMcvOption = "A" | "B";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getCollectErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.startsWith("Fiche introuvable ou inaccessible")) {
    return 404;
  }

  if (
    message.startsWith("Export Word non disponible") ||
    message.startsWith("Export refusé") ||
    message.startsWith("Champ obligatoire absent") ||
    message.startsWith("Date invalide") ||
    message.startsWith("Correspondance des sections E31 impossible") ||
    message.startsWith("Correspondance des sections E32 impossible") ||
    message.includes("introuvable ou inaccessible")
  ) {
    return 409;
  }

  return 500;
}

function logExportIssue(
  level: "warn" | "error",
  message: string,
  ficheId: string,
  error?: unknown,
) {
  const detail = error instanceof Error ? error.message : String(error ?? "");

  console[level]("[export-word]", {
    ficheId,
    message,
    detail: detail.slice(0, 240),
  });
}

function normalizeEpreuve(value: unknown): NormalizedEpreuve | null {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (normalized === "E31" || normalized === "E32") {
    return normalized;
  }

  return null;
}

function selectArchivedWordTemplate(
  epreuve: NormalizedEpreuve,
  option: NormalizedMcvOption,
): string {
  const templateNameByKey: Record<
    `${NormalizedEpreuve}-${NormalizedMcvOption}`,
    string
  > = {
    "E31-A": "E31_A_fiche_archived.docx",
    "E31-B": "E31_B_fiche_archived.docx",
    "E32-A": "E32_A_fiche_archived.docx",
    "E32-B": "E32_B_fiche_archived.docx",
  };

  return join(
    process.cwd(),
    "templates",
    "word",
    templateNameByKey[`${epreuve}-${option}`],
  );
}

async function loadExportableFiche(
  supabase: SupabaseSessionClient,
  ficheId: string,
): Promise<ExportableFicheRow> {
  const { data: fiche, error } = await supabase
    .from("fiches")
    .select("id, status, epreuve, mcv_option")
    .eq("id", ficheId)
    .single();

  if (error || !fiche) {
    throw new Error(
      `Fiche introuvable ou inaccessible: ${error?.message ?? ficheId}`,
    );
  }

  return fiche as unknown as ExportableFicheRow;
}

async function generateArchivedWordExport(
  supabase: SupabaseSessionClient,
  fiche: ExportableFicheRow,
) {
  if (fiche.status !== "archivee") {
    throw new Error(
      `Export refusé: status attendu "archivee", reçu "${fiche.status ?? ""}".`,
    );
  }

  const epreuve = normalizeEpreuve(fiche.epreuve);
  const option = normalizeArchivedMcvOption(fiche.mcv_option);

  if (!epreuve || !option) {
    throw new Error(
      `Export Word non disponible: épreuve ou option non supportée (epreuve="${
        fiche.epreuve ?? ""
      }", mcv_option="${fiche.mcv_option ?? ""}").`,
    );
  }

  const templatePath = selectArchivedWordTemplate(epreuve, option);

  if (epreuve === "E31" && option === "B") {
    const data = await collectArchivedFicheExportData(supabase, fiche.id);

    return {
      docxBuffer: generateArchivedWordDocx(data, templatePath),
      filename: buildArchivedFicheFilename(data),
    };
  }

  if (epreuve === "E32" && option === "B") {
    const data = await collectArchivedE32FicheExportData(supabase, fiche.id);

    return {
      docxBuffer: generateArchivedWordDocx(data, templatePath),
      filename: buildArchivedFicheFilename(data),
    };
  }

  const data = await collectArchivedOptionAFicheExportData(supabase, fiche.id);

  return {
    docxBuffer: generateArchivedWordDocx(data, templatePath),
    filename: buildArchivedFicheFilename(data),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ficheId = String(id ?? "").trim();

  if (!isValidUuid(ficheId)) {
    return jsonError("Identifiant de fiche invalide.", 400);
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError("Utilisateur non authentifié.", 401);
  }

  const role = user.app_metadata?.role;

  if (role !== "professeur" && role !== "admin") {
    return jsonError("Accès réservé au professeur ou à l’administrateur.", 403);
  }

  try {
    const fiche = await loadExportableFiche(supabase, ficheId);
    const { docxBuffer, filename } = await generateArchivedWordExport(
      supabase,
      fiche,
    );

    return new Response(docxBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(docxBuffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const status = getCollectErrorStatus(error);
    const errorMessage = error instanceof Error ? error.message : "";

    if (status === 404) {
      logExportIssue("warn", "fiche inaccessible", ficheId, error);
      return jsonError("Fiche inexistante ou inaccessible.", 404);
    }

    if (status === 409) {
      logExportIssue("warn", "fiche non exportable", ficheId, error);
      if (errorMessage.startsWith("Export Word non disponible")) {
        return jsonError(
          "Export Word non disponible pour cette épreuve et cette option.",
          409,
        );
      }

      return jsonError("Cette fiche ne peut pas être exportée en Word.", 409);
    }

    logExportIssue("error", "échec inattendu de génération", ficheId, error);
    return jsonError("Génération du document Word impossible.", 500);
  }
}
