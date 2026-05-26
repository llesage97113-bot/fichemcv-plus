import TeacherDashboard from "@/components/TeacherDashboard";
import PendingStudentRegistrations from "@/components/PendingStudentRegistrations";
import ClassRegistrationManager from "@/components/ClassRegistrationManager";
import { supabase } from "@/lib/supabaseClient";
import AppNavigation from "@/components/AppNavigation";
import { requireRole } from "@/lib/auth/requireUser";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function Home() {
  await requireRole("professeur");

  const { data, error } = await supabase
    .from("teacher_fiche_dashboard")
    .select("*")
    .order("class_name", { ascending: true })
    .order("last_name", { ascending: true });

  const fiches = data ?? [];
  const admin = createAdminClient();

  const ficheIds = new Set(
    fiches
      .map((fiche) => String(fiche.fiche_id ?? ""))
      .filter(Boolean)
  );

  const studentIds = Array.from(
    new Set(
      fiches
        .map((fiche) => String(fiche.student_id ?? ""))
        .filter(Boolean)
    )
  );

  const { data: evaluations } =
    studentIds.length > 0
      ? await admin
          .from("evaluations")
          .select("id, student_id, epreuve, status, created_at, source_fiches_json")
          .in("student_id", studentIds)
          .order("created_at", { ascending: false })
      : { data: null };

  function extractSourceFicheIds(sourceFichesJson: unknown) {
    let sources: unknown = sourceFichesJson;

    if (typeof sources === "string") {
      try {
        sources = JSON.parse(sources);
      } catch {
        return [];
      }
    }

    if (!Array.isArray(sources)) {
      return [];
    }

    return sources
      .map((source) => {
        if (!source || typeof source !== "object") {
          return "";
        }

        return String(
          (source as { fiche_id?: string | null }).fiche_id ?? ""
        );
      })
      .filter(Boolean);
  }

  const analysisByFicheId = new Map<
    string,
    { status: string | null; created_at: string | null }
  >();

  for (const evaluation of evaluations ?? []) {
    const sourceFicheIds = extractSourceFicheIds(evaluation.source_fiches_json);

    for (const sourceFicheId of sourceFicheIds) {
      if (
        ficheIds.has(sourceFicheId) &&
        !analysisByFicheId.has(sourceFicheId)
      ) {
        analysisByFicheId.set(sourceFicheId, {
          status: evaluation.status ?? null,
          created_at: evaluation.created_at ?? null,
        });
      }
    }
  }

  const enrichedFiches = fiches.map((fiche) => {
    const latestAnalysis = analysisByFicheId.get(String(fiche.fiche_id ?? ""));

    return {
      ...fiche,
      latest_analysis_status: latestAnalysis?.status ?? null,
      latest_analysis_created_at: latestAnalysis?.created_at ?? null,
    };
  });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
<AppNavigation maxWidth="6xl" />

      <section className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold sm:text-4xl">FicheMCV+</h1>

            <p className="text-sm text-slate-400 sm:text-base">
              Tableau de bord professeur — suivi des fiches MCV
            </p>
          </div>

        </header>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500 bg-red-950/40 p-4">
            <p className="font-semibold text-red-300">Erreur Supabase</p>
            <p className="text-red-200">{error.message}</p>
          </div>
        )}

        {!error && (!data || data.length === 0) && (
          <div className="rounded-lg border border-yellow-500 bg-yellow-950/40 p-4">
            <p className="font-semibold text-yellow-300">Aucune fiche trouvée</p>
            <p className="text-yellow-200">
              La connexion fonctionne, mais la vue ne retourne aucune donnée pour le moment.
            </p>
          </div>
        )}

        <ClassRegistrationManager />

        <PendingStudentRegistrations />

        {!error && data && data.length > 0 && (
          <TeacherDashboard fiches={enrichedFiches} />
        )}
      </section>
    </main>
  );
}
