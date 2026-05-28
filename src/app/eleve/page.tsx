import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppNavigation from "@/components/AppNavigation";
import { requireAnyRole } from "@/lib/auth/requireUser";

function getProgressClasses(score: number) {
  if (score >= 80) {
    return {
      text: "text-emerald-300",
      bar: "bg-emerald-400",
      track: "bg-slate-800",
    };
  }

  if (score >= 55) {
    return {
      text: "text-sky-300",
      bar: "bg-sky-400",
      track: "bg-slate-800",
    };
  }

  if (score > 0) {
    return {
      text: "text-amber-300",
      bar: "bg-amber-400",
      track: "bg-slate-800",
    };
  }

  return {
    text: "text-slate-400",
    bar: "bg-slate-500",
    track: "bg-slate-800",
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

function getStatusHelp(status: string | null) {
  switch (status) {
    case "non_commencee":
      return "Ta fiche est prête à être complétée.";
    case "brouillon":
      return "Tu peux compléter et améliorer ta fiche.";
    case "soumise":
      return "Ta fiche a été transmise au professeur. Elle n’est plus modifiable pour le moment.";
    case "a_corriger":
      return "Ton professeur demande des corrections. Tu peux reprendre ta fiche.";
    case "corrigee":
      return "Ta fiche a été corrigée et attend validation.";
    case "validee":
      return "Ta fiche est validée.";
    case "verrouillee":
      return "Ta fiche est verrouillée et conservée en lecture seule.";
    case "archivee":
      return "Ta fiche est archivée. Elle reste consultable en lecture seule.";
    default:
      return "Consulte l’état de ta fiche.";
  }
}

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ studentId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedStudentId = resolvedSearchParams?.studentId ?? "";

  const authUser = await requireAnyRole(["professeur", "eleve"]);
  const supabase = await createClient();
  const authRole = authUser.app_metadata?.role;
  const isTeacherPreview = authRole === "professeur";

  let student = null;
  let studentErrorMessage = "";
  let previewStudents: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    candidate_number: string | null;
    student_code: string | null;
    registration_status?: string | null;
  }[] = [];

  if (isTeacherPreview) {
    const { data: previewStudentList, error: previewStudentsError } = await supabase
      .from("students")
      .select("id, first_name, last_name, candidate_number, student_code, registration_status")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    previewStudents = previewStudentList ?? [];

    if (previewStudentsError || previewStudents.length === 0) {
      studentErrorMessage = "Aucun élève de prévisualisation n’a été trouvé.";
    } else {
      const validatedPreviewStudents = previewStudents.filter(
        (previewStudent) =>
          previewStudent.registration_status === "validated" ||
          !previewStudent.registration_status
      );

      student =
        validatedPreviewStudents.find(
          (previewStudent) => previewStudent.id === selectedStudentId
        ) ??
        validatedPreviewStudents[0] ??
        previewStudents[0];
    }
  } else {
    const { data: appUser, error: appUserError } = await supabase
      .from("app_users")
      .select("id, email, role, is_active")
      .eq("email", authUser.email ?? "")
      .eq("role", "student")
      .eq("is_active", true)
      .single();

    if (appUserError || !appUser) {
      studentErrorMessage = "Aucun profil élève actif n’est associé à ce compte.";
    } else {
      const { data: connectedStudent, error: connectedStudentError } = await supabase
        .from("students")
        .select("id, first_name, last_name, candidate_number, student_code, registration_status")
        .eq("user_id", appUser.id)
        .single();

      student = connectedStudent;

      if (connectedStudentError || !connectedStudent) {
        studentErrorMessage = "Aucune fiche élève n’est rattachée à ce compte.";
      }
    }
  }

  const { data, error } = student
    ? await supabase
        .from("teacher_fiche_dashboard")
        .select("*")
        .eq("student_id", student.id)
        .order("epreuve", { ascending: true })
        .order("numero_fiche", { ascending: true })
    : { data: null, error: null };

  const studentFullName = student
    ? `${student.first_name} ${student.last_name}`
    : "Élève non rattaché";

  const fiches = data ?? [];
  const hasFiches = fiches.length > 0;
  const hasStartedAtLeastOneFiche = fiches.some(
    (fiche) => Number(fiche.completion_score ?? 0) > 0
  );
  const shouldShowStartReminder =
    Boolean(student) &&
    student?.registration_status !== "pending" &&
    hasFiches &&
    !hasStartedAtLeastOneFiche;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <AppNavigation maxWidth="5xl" />
      <section className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-2 text-sm uppercase tracking-wide text-sky-300">
                FicheMCV+ Élève
              </p>

              <h1 className="text-3xl font-bold sm:text-4xl">
                Bonjour {studentFullName}
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/eleve/profil"
                className="inline-flex items-center justify-center rounded-lg border border-sky-500/40 px-3 py-2 text-sm text-sky-300 hover:bg-sky-950/40 hover:text-sky-200"
              >
                Voir mon profil
              </Link>

              {isTeacherPreview && (
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                >
                  Retour espace professeur
                </Link>
              )}
            </div>
          </div>

          <p className="text-sm leading-6 text-slate-400 sm:text-base">
            Retrouve ici tes fiches, leur état d’avancement et les actions à réaliser.
            Les fiches soumises, validées, verrouillées ou archivées restent consultables
            en lecture seule.
          </p>
        </header>
          {isTeacherPreview && previewStudents.length > 0 && (
            <section className="mb-6 rounded-2xl border border-sky-500/30 bg-slate-900/60 p-5 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-100">
                  Prévisualisation professeur
                </h2>
                <p className="text-sm text-slate-400">
                  Choisis un élève validé pour afficher son espace. Les inscriptions en attente restent visibles, mais ne sont pas encore prévisualisables.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-emerald-200">
                      Élèves validés
                    </h3>
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                      {
                        previewStudents.filter(
                          (previewStudent) =>
                            previewStudent.registration_status === "validated" ||
                            !previewStudent.registration_status
                        ).length
                      }
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {previewStudents
                      .filter(
                        (previewStudent) =>
                          previewStudent.registration_status === "validated" ||
                          !previewStudent.registration_status
                      )
                      .map((previewStudent) => {
                        const isSelected = previewStudent.id === student?.id;

                        return (
                          <Link
                            key={previewStudent.id}
                            href={`/eleve?studentId=${previewStudent.id}`}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                              isSelected
                                ? "border-sky-400 bg-sky-500/20 text-sky-100"
                                : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-sky-500/50 hover:text-sky-200"
                            }`}
                          >
                            {previewStudent.first_name} {previewStudent.last_name}
                          </Link>
                        );
                      })}

                    {previewStudents.filter(
                      (previewStudent) =>
                        previewStudent.registration_status === "validated" ||
                        !previewStudent.registration_status
                    ).length === 0 && (
                      <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-500">
                        Aucun élève validé pour le moment.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-amber-200">
                      Inscriptions en attente
                    </h3>
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
                      {
                        previewStudents.filter(
                          (previewStudent) =>
                            previewStudent.registration_status === "pending"
                        ).length
                      }
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {previewStudents
                      .filter(
                        (previewStudent) =>
                          previewStudent.registration_status === "pending"
                      )
                      .map((previewStudent) => (
                        <span
                          key={previewStudent.id}
                          className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200/80"
                        >
                          {previewStudent.first_name} {previewStudent.last_name} · en attente
                        </span>
                      ))}

                    {previewStudents.filter(
                      (previewStudent) =>
                        previewStudent.registration_status === "pending"
                    ).length === 0 && (
                      <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-500">
                        Aucune inscription en attente.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

        {student?.registration_status === "pending" && !isTeacherPreview && (
          <section className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-sm">
            <p className="text-lg font-semibold text-amber-100">
              Inscription en attente de validation
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-100/80">
              Ton compte a bien été créé. Ton professeur doit encore valider ton inscription
              avant que tes fiches soient accessibles. Tu peux revenir plus tard ou demander
              confirmation à ton professeur.
            </p>
          </section>
        )}

        {student?.registration_status !== "pending" && student && (
          <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-sky-300">
                  Profil élève
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-100">
                  {studentFullName}
                </h2>
              </div>

              <span className="rounded-full border border-sky-500/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-300">
                {isTeacherPreview ? "Prévisualisation professeur" : "Élève connecté"}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Prénom
                </p>
                <p className="mt-1 font-medium text-slate-100">
                  {student.first_name}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Nom
                </p>
                <p className="mt-1 font-medium text-slate-100">
                  {student.last_name}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Numéro candidat
                </p>
                <p className="mt-1 font-medium text-slate-100">
                  {student.candidate_number || "Non renseigné"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:col-span-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Code élève
                </p>
                <p className="mt-1 font-mono text-sm text-slate-100">
                  {student.student_code || "Non renseigné"}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mb-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-300">
                Consigne professeur
              </p>

              <h2 className="mt-2 text-xl font-bold text-slate-100">
                Test mobilité Espagne — première fiche
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                Commence par compléter une première fiche en lien avec ta situation
                observée ou vécue en entreprise pendant la mobilité. Décris clairement
                le contexte, les acteurs concernés, l’action réalisée ou observée, ainsi
                que les éléments utiles pour ton analyse.
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Tu peux utiliser quelques mots ou expressions en espagnol si cela aide
                à décrire la situation réelle, mais la fiche doit rester compréhensible
                pour le professeur.
              </p>
            </div>

            <span className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
              Travail à démarrer
            </span>
          </div>
        </section>

        {shouldShowStartReminder && (
          <section className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-200">
                  Démarrage attendu
                </p>

                <h2 className="mt-2 text-xl font-bold text-amber-100">
                  Tu n’as encore commencé aucune fiche
                </h2>

                <p className="mt-3 text-sm leading-6 text-amber-100/80">
                  Ouvre une première fiche et complète au minimum le contexte,
                  l’entreprise, la situation observée ou vécue, ainsi que les acteurs
                  concernés.
                </p>

                <p className="mt-3 text-sm leading-6 text-amber-100/70">
                  Tu n’as pas besoin de tout terminer immédiatement : l’objectif est
                  d’amorcer ton travail pour pouvoir ensuite l’améliorer.
                </p>
              </div>

              <span className="inline-flex rounded-full border border-amber-500/40 bg-slate-950/40 px-3 py-1 text-xs font-semibold text-amber-100">
                À faire maintenant
              </span>
            </div>
          </section>
        )}

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
              {studentErrorMessage || `Aucune fiche n’est associée à ${studentFullName} pour le moment.`}
            </p>
          </div>
        )}

        {!error && hasFiches && (
          <>
            <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Total
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-100">
                  {fiches.length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  À compléter
                </p>
                <p className="mt-1 text-2xl font-bold text-amber-300">
                  {
                    fiches.filter(
                      (fiche) =>
                        fiche.status === "non_commencee" ||
                        fiche.status === "brouillon"
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  À corriger
                </p>
                <p className="mt-1 text-2xl font-bold text-orange-300">
                  {fiches.filter((fiche) => fiche.status === "a_corriger").length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Validées
                </p>
                <p className="mt-1 text-2xl font-bold text-green-300">
                  {fiches.filter((fiche) => fiche.status === "validee").length}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Archivées
                </p>
                <p className="mt-1 text-2xl font-bold text-indigo-300">
                  {fiches.filter((fiche) => fiche.status === "archivee").length}
                </p>
              </div>
            </section>

            <div className="grid gap-4">
              {fiches.map((fiche) => {
                const score = Number(fiche.completion_score ?? 0);
                const progress = getProgressClasses(score);

                return (
                  <article
                    key={fiche.fiche_id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
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

                    <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-100">
                          {fiche.title}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {getStatusHelp(fiche.status)}
                        </p>
                      </div>

                      <Link
                        href={`/eleve/fiches/${fiche.fiche_id}`}
                        className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
                      >
                        Ouvrir ma fiche
                      </Link>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-xs uppercase tracking-wide text-slate-500">
                          Progression
                        </span>

                        <span className={`text-sm font-bold ${progress.text}`}>
                          {score} %
                        </span>
                      </div>

                      <div className={`h-3 overflow-hidden rounded-full ${progress.track}`}>
                        <div
                          className={`h-full rounded-full ${progress.bar}`}
                          style={{
                            width: `${Math.min(Math.max(score, 0), 100)}%`,
                          }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        Niveau actuel :{" "}
                        <span className={progress.text}>
                          {fiche.quality_status ?? "non évalué"}
                        </span>
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
