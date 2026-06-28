import TeacherDashboard from "@/components/TeacherDashboard";
import PendingStudentRegistrations from "@/components/PendingStudentRegistrations";
import ClassRegistrationManager from "@/components/ClassRegistrationManager";
import { supabase } from "@/lib/supabaseClient";
import AppNavigation from "@/components/AppNavigation";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentTeacherClassIds } from "@/lib/auth/currentUserProfiles";
import { getRootRoleRedirectPath } from "@/lib/auth/getRoleHomePath";

export default async function Home() {
  const authUser = await requireUser();
  const rootRedirectPath = getRootRoleRedirectPath(authUser.app_metadata?.role);

  if (rootRedirectPath) {
    redirect(rootRedirectPath);
  }

  const admin = createAdminClient();

  const teacherClassIds = await getCurrentTeacherClassIds(admin, authUser);

  let ficheQuery = supabase
    .from("teacher_fiche_dashboard")
    .select("*")
    .order("class_name", { ascending: true })
    .order("last_name", { ascending: true });

  if (teacherClassIds.length > 0) {
    ficheQuery = ficheQuery.in("class_id", teacherClassIds);
  } else {
    ficheQuery = ficheQuery.eq("class_id", "00000000-0000-0000-0000-000000000000");
  }

  const { data, error } = await ficheQuery;

  const fiches = data ?? [];

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

  const { data: studentAccounts } =
    studentIds.length > 0
      ? await admin
          .from("students")
          .select("id, user_id")
          .in("id", studentIds)
      : { data: null };

  const studentUserIds = Array.from(
    new Set(
      (studentAccounts ?? [])
        .map((student) => String(student.user_id ?? ""))
        .filter(Boolean)
    )
  );

  const { data: studentLoginRows } =
    studentUserIds.length > 0
      ? await admin
          .from("student_login_identifiers")
          .select("identifier, auth_email, user_id")
          .in("user_id", studentUserIds)
      : { data: null };

  const loginRowsByUserId = new Map(
    (studentLoginRows ?? []).map((row) => [
      String(row.user_id),
      {
        identifier: row.identifier ?? null,
        legacy_identifier: row.auth_email ?? null,
      },
    ])
  );

  const studentLoginIdentifiers = (studentAccounts ?? []).map((student) => {
    const row = loginRowsByUserId.get(String(student.user_id ?? ""));

    return {
      student_id: String(student.id),
      identifier: row?.identifier ?? null,
      legacy_identifier: row?.legacy_identifier ?? null,
    };
  });

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

        <ClassRegistrationManager />

        <PendingStudentRegistrations />

        {!error && data && data.length > 0 && (
          <TeacherDashboard
            fiches={enrichedFiches}
            studentLoginIdentifiers={studentLoginIdentifiers}
          />
        )}
      </section>
    </main>
  );
}
