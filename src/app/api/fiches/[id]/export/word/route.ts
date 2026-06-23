import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { buildArchivedFicheFilename } from "@/lib/exports/buildArchivedFicheFilename";
import { collectArchivedFicheExportData } from "@/lib/exports/collectArchivedFicheExportData";
import { generateArchivedFicheDocx } from "@/lib/exports/generateArchivedFicheDocx";
import { isValidUuid } from "@/lib/exports/isValidUuid";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getCollectErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.startsWith("Fiche introuvable ou inaccessible")) {
    return 404;
  }

  if (
    message.startsWith("Export refusé") ||
    message.startsWith("Champ obligatoire absent") ||
    message.startsWith("Date invalide") ||
    message.startsWith("Correspondance des sections E31 impossible") ||
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
    const data = await collectArchivedFicheExportData(supabase, ficheId);
    const docxBuffer = generateArchivedFicheDocx(data);
    const filename = buildArchivedFicheFilename(data);

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

    if (status === 404) {
      logExportIssue("warn", "fiche inaccessible", ficheId, error);
      return jsonError("Fiche inexistante ou inaccessible.", 404);
    }

    if (status === 409) {
      logExportIssue("warn", "fiche non exportable", ficheId, error);
      return jsonError("Cette fiche ne peut pas être exportée en Word.", 409);
    }

    logExportIssue("error", "échec inattendu de génération", ficheId, error);
    return jsonError("Génération du document Word impossible.", 500);
  }
}
