import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireUser";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  await requireRole("professeur");

  const body = await request.json().catch(() => null);

  const sectionId = String(body?.sectionId ?? "");
  const teacherFeedback =
    body?.teacherFeedback === null || body?.teacherFeedback === undefined
      ? null
      : String(body.teacherFeedback);

  if (!sectionId) {
    return NextResponse.json(
      { error: "Identifiant de section manquant." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("fiche_sections")
    .update({
      teacher_feedback: teacherFeedback,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sectionId)
    .select("id, teacher_feedback, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        error:
          error?.message ??
          "Sauvegarde de la remarque professeur impossible.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Remarque professeur sauvegardée.",
    section: data,
  });
}
