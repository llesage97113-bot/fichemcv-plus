import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireTeacher() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.app_metadata?.role !== "professeur") {
    return null;
  }

  return user;
}

function getSectionText(section: Record<string, unknown>) {
  return String(
    section.student_content ??
      section.content ??
      section.value ??
      section.response ??
      section.expected_content ??
      ""
  ).trim();
}

function buildLocalPedagogicalReport({
  fiche,
  sections,
}: {
  fiche: Record<string, unknown>;
  sections: Record<string, unknown>[];
}) {
  const filledSections = sections.filter(
    (section) => getSectionText(section).length > 0
  );
  const emptySections = sections.filter(
    (section) => getSectionText(section).length === 0
  );

  const completionScore = Number(fiche.completion_score ?? 0);
  const qualityStatus = String(fiche.quality_status ?? "non évalué");

  const pointsForts: string[] = [];
  const pointsAAmeliorer: string[] = [];
  const questionsRelance: string[] = [];

  if (completionScore >= 80) {
    pointsForts.push("La fiche présente un niveau de complétude élevé.");
  } else if (completionScore >= 55) {
    pointsForts.push(
      "La fiche est engagée et contient déjà plusieurs éléments exploitables."
    );
    pointsAAmeliorer.push(
      "Certaines rubriques doivent encore être précisées pour sécuriser l’exploitation pédagogique."
    );
  } else if (completionScore > 0) {
    pointsAAmeliorer.push(
      "La fiche reste fragile : les éléments renseignés doivent être développés."
    );
  } else {
    pointsAAmeliorer.push("La fiche est encore vide ou quasiment vide.");
  }

  if (filledSections.length > 0) {
    pointsForts.push(
      `${filledSections.length} section(s) renseignée(s) sur ${sections.length}.`
    );
  }

  if (emptySections.length > 0) {
    pointsAAmeliorer.push(
      `${emptySections.length} section(s) restent à compléter ou à préciser.`
    );

    for (const section of emptySections.slice(0, 3)) {
      questionsRelance.push(
        `Que peux-tu ajouter dans la rubrique « ${
          String(section.title ?? "section non nommée")
        } » ?`
      );
    }
  }

  pointsAAmeliorer.push(
    "Le professeur doit vérifier la cohérence métier, la précision des exemples et le lien avec les compétences attendues."
  );

  return {
    version: "passerelle_analyse_pedagogique_v1",
    fiche: {
      id: fiche.id,
      epreuve: fiche.epreuve,
      numero_fiche: fiche.numero_fiche,
      title: fiche.title,
      completion_score: completionScore,
      quality_status: qualityStatus,
    },
    diagnostic: {
      avis_global:
        completionScore >= 55 ? "exploitable_a_verifier" : "fragile_a_completer",
      sections_total: sections.length,
      sections_renseignees: filledSections.length,
      sections_vides: emptySections.length,
    },
    points_forts: pointsForts,
    points_a_ameliorer: pointsAAmeliorer,
    questions_de_relance: questionsRelance,
    recommandation_professeur:
      "Analyse automatique provisoire. Le professeur doit relire, compléter et valider avant toute utilisation certificative.",
  };
}

export async function POST(request: Request) {
  const teacher = await requireTeacher();

  if (!teacher) {
    return NextResponse.json(
      { error: "Accès réservé au professeur." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const ficheId = String(body?.ficheId ?? "");

  if (!ficheId) {
    return NextResponse.json(
      { error: "Identifiant fiche manquant." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: teacherAppUser, error: teacherAppUserError } = await admin
    .from("app_users")
    .select("id, email, role, is_active")
    .eq("email", teacher.email ?? "")
    .eq("is_active", true)
    .eq("role", "teacher")
    .maybeSingle();

  if (teacherAppUserError || !teacherAppUser) {
    return NextResponse.json(
      {
        error:
          teacherAppUserError?.message ??
          "Compte professeur introuvable dans app_users.",
      },
      { status: 403 }
    );
  }

  const { data: fiche, error: ficheError } = await admin
    .from("fiches")
    .select(
      "id, student_id, class_id, epreuve, numero_fiche, title, status, completion_score, quality_status"
    )
    .eq("id", ficheId)
    .single();

  if (ficheError || !fiche) {
    return NextResponse.json(
      { error: ficheError?.message ?? "Fiche introuvable." },
      { status: 404 }
    );
  }

  const { data: sections, error: sectionsError } = await admin
    .from("fiche_sections_dashboard")
    .select("*")
    .eq("fiche_id", ficheId)
    .order("sort_order", { ascending: true });

  if (sectionsError) {
    return NextResponse.json({ error: sectionsError.message }, { status: 500 });
  }

  const reportJson = buildLocalPedagogicalReport({
    fiche,
    sections: sections ?? [],
  });

  const now = new Date().toISOString();

  const sourceFichesJson = [
    {
      epreuve: fiche.epreuve,
      fiche_id: fiche.id,
      numero_fiche: fiche.numero_fiche,
    },
  ];

  const { data: evaluation, error: evaluationError } = await admin
    .from("evaluations")
    .insert({
      id: crypto.randomUUID(),
      student_id: fiche.student_id,
      class_id: fiche.class_id,
      epreuve: fiche.epreuve,
      mode: "local",
      status: "a_verifier",
      note_sur_20: null,
      appreciation:
        "Analyse pédagogique provisoire générée automatiquement. À relire et valider par le professeur.",
      niveaux_json: reportJson.diagnostic,
      calibrage_json: {
        version: "passerelle_analyse_pedagogique_v1",
        source: "fiche_detail_professeur",
        generated_at: now,
      },
      source_fiches_json: sourceFichesJson,
      error_message: null,
      created_by: teacherAppUser.id,
      created_at: now,
      updated_at: now,
      validated_by: null,
      validated_at: null,
    })
    .select("*")
    .single();

  if (evaluationError || !evaluation) {
    return NextResponse.json(
      {
        error:
          evaluationError?.message ?? "Création de l’évaluation impossible.",
      },
      { status: 500 }
    );
  }

  const { data: report, error: reportError } = await admin
    .from("evaluation_reports")
    .insert({
      id: crypto.randomUUID(),
      evaluation_id: evaluation.id,
      report_type: "quality",
      report_path: null,
      report_json: reportJson,
      created_at: now,
    })
    .select("*")
    .single();

  if (reportError || !report) {
    return NextResponse.json(
      { error: reportError?.message ?? "Création du rapport impossible." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Analyse pédagogique générée.",
    evaluation,
    report,
  });
}
