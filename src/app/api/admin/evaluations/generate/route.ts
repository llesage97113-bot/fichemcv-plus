import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireTeacherOrAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const role = user?.app_metadata?.role;

  if (error || !user || (role !== "professeur" && role !== "admin")) {
    return null;
  }

  return user;
}

async function getTeacherClassIds(
  admin: ReturnType<typeof createAdminClient>,
  teacherEmail: string | null | undefined
) {
  const { data: appUser } = await admin
    .from("app_users")
    .select("id")
    .eq("email", teacherEmail ?? "")
    .eq("role", "teacher")
    .eq("is_active", true)
    .single();

  const { data: teacherProfile } = appUser
    ? await admin
        .from("teachers")
        .select("id")
        .eq("user_id", appUser.id)
        .single()
    : { data: null };

  const { data: teacherClasses } = teacherProfile
    ? await admin
        .from("class_teachers")
        .select("class_id")
        .eq("teacher_id", teacherProfile.id)
    : { data: null };

  return Array.from(
    new Set(
      (teacherClasses ?? [])
        .map((item) => String(item.class_id ?? ""))
        .filter(Boolean)
    )
  );
}

function isTeacherAllowedForClass(
  teacherClassIds: string[],
  classId: string | null | undefined
) {
  return Boolean(classId) && teacherClassIds.includes(String(classId));
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
  const teacher = await requireTeacherOrAdmin();

  if (!teacher) {
    return NextResponse.json(
      { error: "Accès réservé au professeur ou à l’administrateur." },
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
  const authRole = teacher.app_metadata?.role;

  const { data: teacherAppUser, error: teacherAppUserError } = await admin
    .from("app_users")
    .select("id, email, role, is_active")
    .eq("email", teacher.email ?? "")
    .eq("is_active", true)
    .maybeSingle();

  if (
    teacherAppUserError ||
    !teacherAppUser ||
    (authRole === "professeur" && teacherAppUser.role !== "teacher")
  ) {
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

  if (authRole !== "admin") {
    const teacherClassIds = await getTeacherClassIds(admin, teacher.email);

    if (!isTeacherAllowedForClass(teacherClassIds, fiche.class_id)) {
      return NextResponse.json(
        {
          error:
            "Accès refusé : cette fiche n’appartient pas à une classe rattachée à ce professeur.",
        },
        { status: 403 }
      );
    }
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

export async function GET(request: Request) {
  const teacher = await requireTeacherOrAdmin();

  if (!teacher) {
    return NextResponse.json(
      { error: "Accès réservé au professeur ou à l’administrateur." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const ficheId = url.searchParams.get("ficheId");

  if (!ficheId) {
    return NextResponse.json(
      { error: "Identifiant fiche manquant." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: fiche, error: ficheError } = await admin
    .from("fiches")
    .select("id, student_id, class_id, epreuve")
    .eq("id", ficheId)
    .single();

  if (ficheError || !fiche) {
    return NextResponse.json(
      { error: ficheError?.message ?? "Fiche introuvable." },
      { status: 404 }
    );
  }

  if (teacher.app_metadata?.role !== "admin") {
    const teacherClassIds = await getTeacherClassIds(admin, teacher.email);

    if (!isTeacherAllowedForClass(teacherClassIds, fiche.class_id)) {
      return NextResponse.json(
        {
          error:
            "Accès refusé : cette fiche n’appartient pas à une classe rattachée à ce professeur.",
        },
        { status: 403 }
      );
    }
  }

  const { data: evaluations, error: evaluationsError } = await admin
    .from("evaluations")
    .select("id, status, created_at, source_fiches_json")
    .eq("student_id", fiche.student_id)
    .eq("epreuve", fiche.epreuve)
    .order("created_at", { ascending: false })
    .limit(20);

  if (evaluationsError) {
    return NextResponse.json(
      { error: evaluationsError.message },
      { status: 500 }
    );
  }

  const latestEvaluation = (evaluations ?? []).find((evaluation) => {
    const sources = Array.isArray(evaluation.source_fiches_json)
      ? evaluation.source_fiches_json
      : [];

    return sources.some((source) => {
      const sourceFicheId = String(
        (source as { fiche_id?: string | null }).fiche_id ?? ""
      );

      return sourceFicheId === ficheId;
    });
  });

  if (!latestEvaluation) {
    return NextResponse.json({
      report: null,
      evaluation: null,
    });
  }

  const { data: report, error: reportError } = await admin
    .from("evaluation_reports")
    .select("*")
    .eq("evaluation_id", latestEvaluation.id)
    .eq("report_type", "quality")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 });
  }

  return NextResponse.json({
    evaluation: latestEvaluation,
    report,
  });
}
