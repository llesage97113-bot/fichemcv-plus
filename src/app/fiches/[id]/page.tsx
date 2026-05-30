import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import SectionEditor from "@/components/SectionEditor";
import TeacherWorkflowActions from "@/components/TeacherWorkflowActions";
import GenerateEvaluationButton from "@/components/GenerateEvaluationButton";
import TeacherSectionFeedbackEditor from "@/components/TeacherSectionFeedbackEditor";
import AppNavigation from "@/components/AppNavigation";
import { requireRole } from "@/lib/auth/requireUser";
import { createAdminClient } from "@/lib/supabase/admin";

function getGlobalProgressClasses(score: number) {
  if (score >= 80) {
    return {
      text: "text-emerald-300",
      bar: "bg-emerald-400",
      box: "border-emerald-400/30 bg-emerald-950/20",
    };
  }

  if (score >= 55) {
    return {
      text: "text-sky-300",
      bar: "bg-sky-400",
      box: "border-sky-400/30 bg-sky-950/20",
    };
  }

  if (score > 0) {
    return {
      text: "text-amber-300",
      bar: "bg-amber-400",
      box: "border-amber-400/30 bg-amber-950/20",
    };
  }

  return {
    text: "text-slate-300",
    bar: "bg-slate-500",
    box: "border-slate-700 bg-slate-950/50",
  };
}

export default async function FicheDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("professeur");

  const { id } = await params;

  const { data: fiche, error: ficheError } = await supabase
    .from("teacher_fiche_dashboard")
    .select("*")
    .eq("fiche_id", id)
    .single();

  if (ficheError || !fiche) {
    notFound();
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("fiche_sections_dashboard")
    .select("*")
    .eq("fiche_id", id)
    .order("sort_order", { ascending: true });

  const admin = createAdminClient();

  const { data: evaluations } = await admin
    .from("evaluations")
    .select("id, status, created_at, source_fiches_json")
    .eq("student_id", fiche.student_id)
    .eq("epreuve", fiche.epreuve)
    .order("created_at", { ascending: false })
    .limit(20);

  const latestEvaluation = (evaluations ?? []).find((evaluation) => {
    const sources = Array.isArray(evaluation.source_fiches_json)
      ? evaluation.source_fiches_json
      : [];

    return sources.some((source) => {
      const sourceFicheId = String(
        (source as { fiche_id?: string | null }).fiche_id ?? ""
      );

      return sourceFicheId === id;
    });
  });

  const { data: latestReport } = latestEvaluation
    ? await admin
        .from("evaluation_reports")
        .select("report_json, created_at")
        .eq("evaluation_id", latestEvaluation.id)
        .eq("report_type", "quality")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const completionScore = Number(fiche.completion_score ?? 0);
  const progressClasses = getGlobalProgressClasses(completionScore);

  const isReadOnly =
    fiche.status === "soumise" ||
    fiche.status === "validee" ||
    fiche.status === "verrouillee" ||
    fiche.status === "archivee";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
        <AppNavigation maxWidth="5xl" />
      <section className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center rounded-lg border border-slate-800 px-3 py-2 text-sm text-sky-300 hover:bg-slate-900 hover:text-sky-200"
        >
          ← Retour au tableau de bord
        </Link>

        <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm sm:p-6">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
              {fiche.epreuve}
            </span>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
              Fiche n°{fiche.numero_fiche}
            </span>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
              {fiche.class_name}
            </span>
          </div>

          <h1 className="mb-4 text-2xl font-bold leading-tight sm:text-3xl">
            {fiche.title}
          </h1>

          <div
            className={`mb-5 rounded-2xl border p-4 ${progressClasses.box}`}
          >
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Progression globale de la fiche
                </p>
                <p className={`text-2xl font-bold ${progressClasses.text}`}>
                  {completionScore}% complétée
                </p>
              </div>

              <p className="text-sm text-slate-300">
                Statut qualité :{" "}
                <span className={`font-semibold ${progressClasses.text}`}>
                  {fiche.quality_status ?? "non évalué"}
                </span>
              </p>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${progressClasses.bar}`}
                style={{ width: `${Math.min(Math.max(completionScore, 0), 100)}%` }}
              />
            </div>
          </div>

          <div className="mb-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Élève
              </p>
              <p className="font-medium text-slate-100">
                {fiche.first_name} {fiche.last_name}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Statut
              </p>
              <p className="font-medium text-slate-100">{fiche.status}</p>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Commentaires actifs
              </p>
              <p className="font-medium text-slate-100">
                {fiche.active_comments_count}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Identifiant fiche
              </p>
              <p className="truncate font-mono text-xs text-slate-300">{id}</p>
            </div>
          </div>

          <TeacherWorkflowActions
            ficheId={id}
            status={fiche.status}
          />

          <GenerateEvaluationButton
            ficheId={id}
            initialReport={latestReport?.report_json ?? null}
            initialReportCreatedAt={latestReport?.created_at ?? null}
          />
        </header>

        {sectionsError && (
          <div className="mb-6 rounded-xl border border-red-500 bg-red-950/40 p-4">
            <p className="font-semibold text-red-300">Erreur sections</p>
            <p className="text-red-200">{sectionsError.message}</p>
          </div>
        )}

        {!sectionsError && (!sections || sections.length === 0) && (
          <div className="rounded-xl border border-yellow-500 bg-yellow-950/40 p-4">
            <p className="font-semibold text-yellow-300">
              Aucune section trouvée
            </p>
            <p className="text-yellow-200">
              La fiche existe, mais aucune section n’est encore associée.
            </p>
          </div>
        )}

        {!sectionsError && sections && sections.length > 0 && (
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.id} className="space-y-3">
                <SectionEditor
                  section={section}
                  isReadOnly={isReadOnly}
                />

                <TeacherSectionFeedbackEditor
                  sectionId={section.id}
                  initialFeedback={section.teacher_feedback ?? null}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
