import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SectionEditor from "@/components/SectionEditor";
import SubmitFicheButton from "@/components/SubmitFicheButton";
import AppNavigation from "@/components/AppNavigation";
import { requireAnyRole } from "@/lib/auth/requireUser";

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

function getStatusLabel(status: string | null) {
  switch (status) {
    case "non_commencee":
      return "Non commencée";
    case "brouillon":
      return "Brouillon";
    case "soumise":
      return "Soumise";
    case "a_corriger":
      return "À corriger";
    case "corrigee":
      return "Corrigée";
    case "validee":
      return "Validée";
    case "verrouillee":
      return "Verrouillée";
    case "archivee":
      return "Archivée";
    default:
      return status ?? "Statut inconnu";
  }
}

function getStatusClasses(status: string | null) {
  switch (status) {
    case "soumise":
      return "bg-sky-500/10 text-sky-300 border-sky-400/40";
    case "a_corriger":
      return "bg-amber-500/10 text-amber-300 border-amber-400/40";
    case "corrigee":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-400/40";
    case "validee":
      return "bg-green-500/10 text-green-300 border-green-400/40";
    case "verrouillee":
      return "bg-slate-200/10 text-slate-200 border-slate-400/40";
    case "archivee":
      return "bg-indigo-500/10 text-indigo-300 border-indigo-400/40";
    default:
      return "bg-slate-800 text-slate-300 border-slate-700";
  }
}

function getStudentStatusHelp(status: string | null) {
  switch (status) {
    case "non_commencee":
    case "brouillon":
      return "Tu peux compléter ta fiche et la soumettre lorsqu’elle sera suffisamment avancée.";
    case "a_corriger":
      return "Ton professeur t’a demandé de corriger cette fiche. Tu peux modifier les sections.";
    case "soumise":
      return "Ta fiche a été soumise. Elle est en attente de lecture par le professeur.";
    case "corrigee":
      return "Ta fiche a été corrigée par le professeur. Elle n’est plus modifiable pour le moment.";
    case "validee":
      return "Ta fiche est validée.";
    case "verrouillee":
      return "Ta fiche est verrouillée et conservée en lecture seule.";
    case "archivee":
      return "Ta fiche est archivée. Elle reste consultable en lecture seule.";
    default:
      return "Consulte et complète ta fiche selon les consignes.";
  }
}

export default async function StudentFicheDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await requireAnyRole(["professeur", "eleve"]);
  const supabase = await createClient();
  const authRole = authUser.app_metadata?.role;
  const isTeacherPreview = authRole === "professeur" || authRole === "admin";

  const { id } = await params;

  let ficheQuery = supabase
    .from("teacher_fiche_dashboard")
    .select("*")
    .eq("fiche_id", id);

  if (!isTeacherPreview) {
    const { data: appUser, error: appUserError } = await supabase
      .from("app_users")
      .select("id, email, role, is_active")
      .eq("email", authUser.email ?? "")
      .eq("role", "student")
      .eq("is_active", true)
      .single();

    if (appUserError || !appUser) {
      notFound();
    }

    const { data: connectedStudent, error: connectedStudentError } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", appUser.id)
      .single();

    if (connectedStudentError || !connectedStudent) {
      notFound();
    }

    ficheQuery = ficheQuery.eq("student_id", connectedStudent.id);
  }

  const { data: fiche, error: ficheError } = await ficheQuery.single();

  if (ficheError || !fiche) {
    notFound();
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("fiche_sections_dashboard")
    .select("*")
    .eq("fiche_id", id)
    .order("sort_order", { ascending: true });

  const completionScore = Number(fiche.completion_score ?? 0);
  const progressClasses = getGlobalProgressClasses(completionScore);

  const isReadOnly =
    fiche.status === "soumise" ||
    fiche.status === "corrigee" ||
    fiche.status === "validee" ||
    fiche.status === "verrouillee" ||
    fiche.status === "archivee";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
        <AppNavigation maxWidth="5xl" />
      <section className="mx-auto max-w-5xl">
        <Link
          href="/eleve"
          className="mb-6 inline-flex items-center rounded-lg border border-slate-800 px-3 py-2 text-sm text-sky-300 hover:bg-slate-900 hover:text-sky-200"
        >
          {isTeacherPreview
            ? "← Retour à la prévisualisation élève"
            : "← Retour à mon espace élève"}
        </Link>

        <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm sm:p-6">
          <p className="mb-3 text-sm uppercase tracking-wide text-sky-300">
            FicheMCV+ Élève
          </p>

          {isTeacherPreview && (
            <div className="mb-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                Prévisualisation professeur
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-100">
                Élève consulté :{" "}
                <span className="font-semibold">
                  {fiche.first_name} {fiche.last_name}
                </span>
              </p>
              {fiche.class_name && (
                <p className="mt-1 text-sm text-slate-300">
                  Classe : <span className="font-medium">{fiche.class_name}</span>
                </p>
              )}
            </div>
          )}

          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
              {fiche.epreuve}
            </span>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
              Fiche n°{fiche.numero_fiche}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                fiche.status
              )}`}
            >
              {getStatusLabel(fiche.status)}
            </span>
          </div>

          <h1 className="mb-3 text-2xl font-bold leading-tight sm:text-3xl">
            {fiche.title}
          </h1>

          <p className="mb-5 text-sm leading-6 text-slate-400">
            {getStudentStatusHelp(fiche.status)}
          </p>

          <div className={`mb-5 rounded-2xl border p-4 ${progressClasses.box}`}>
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Progression de ta fiche
                </p>
                <p className={`text-2xl font-bold ${progressClasses.text}`}>
                  {completionScore}% complétée
                </p>
              </div>

              <p className="text-sm text-slate-300">
                Niveau actuel :{" "}
                <span className={`font-semibold ${progressClasses.text}`}>
                  {fiche.quality_status ?? "non évalué"}
                </span>
              </p>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${progressClasses.bar}`}
                style={{
                  width: `${Math.min(Math.max(completionScore, 0), 100)}%`,
                }}
              />
            </div>
          </div>

          <SubmitFicheButton
            ficheId={id}
            status={fiche.status}
            completionScore={completionScore}
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
              <SectionEditor
                key={section.id}
                section={section}
                isReadOnly={isReadOnly}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
