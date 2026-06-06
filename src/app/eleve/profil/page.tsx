import Link from "next/link";
import AppNavigation from "@/components/AppNavigation";
import StudentPasswordChangeForm from "@/components/StudentPasswordChangeForm";
import { requireAnyRole } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/server";

export default async function StudentProfilePage() {
  const authUser = await requireAnyRole(["professeur", "eleve"]);
  const supabase = await createClient();

  const authRole = authUser.app_metadata?.role;
  const isTeacherPreview = authRole === "professeur" || authRole === "admin";

  let student = null;
  let studentErrorMessage = "";
  let className = "";
  let schoolYear = "";

  if (isTeacherPreview) {
    const { data: previewStudent, error: previewStudentError } = await supabase
      .from("students")
      .select("id, first_name, last_name, candidate_number, student_code, registration_status")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })
      .limit(1)
      .single();

    student = previewStudent;

    if (previewStudentError || !previewStudent) {
      studentErrorMessage = "Aucun élève de prévisualisation n’a été trouvé.";
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
      const { data: connectedStudent, error: connectedStudentError } =
        await supabase
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

  const studentFullName = student
    ? `${student.first_name} ${student.last_name}`
    : "Élève non rattaché";

  if (student) {
    const { data: studentDashboardItem } = await supabase
      .from("teacher_fiche_dashboard")
      .select("class_name, school_year")
      .eq("student_id", student.id)
      .limit(1)
      .maybeSingle();

    className = studentDashboardItem?.class_name ?? "";
    schoolYear = studentDashboardItem?.school_year ?? "";
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <AppNavigation maxWidth="4xl" />

      <section className="mx-auto max-w-4xl">
        <Link
          href="/eleve"
          className="mb-6 inline-flex items-center rounded-lg border border-slate-800 px-3 py-2 text-sm text-sky-300 hover:bg-slate-900 hover:text-sky-200"
        >
          ← Retour à mon espace élève
        </Link>

        <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm">
          <p className="mb-2 text-sm uppercase tracking-wide text-sky-300">
            FicheMCV+ Élève
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Profil élève
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Informations de rattachement utilisées pour afficher les fiches de l’élève connecté.
          </p>
        </header>

        {studentErrorMessage && !student && (
          <div className="rounded-2xl border border-yellow-500 bg-yellow-950/40 p-5">
            <p className="font-semibold text-yellow-300">Profil introuvable</p>
            <p className="mt-2 text-yellow-100">{studentErrorMessage}</p>
          </div>
        )}

        {student && (
          <div className="mb-4 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-xs text-slate-300">
            DEBUG profil — rôle auth : {String(authRole)} — preview : {String(isTeacherPreview)}
          </div>
        )}

        {student && !isTeacherPreview && (
          <StudentPasswordChangeForm />
        )}

        {student && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-slate-500">
                  Identité
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-100">
                  {studentFullName}
                </h2>
              </div>

              <span className="rounded-full border border-sky-500/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-300">
                {isTeacherPreview ? "Prévisualisation professeur" : "Élève connecté"}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  student.registration_status === "pending"
                    ? "border-amber-500/40 text-amber-300"
                    : student.registration_status === "rejected"
                      ? "border-red-500/40 text-red-300"
                      : "border-emerald-500/40 text-emerald-300"
                }`}
              >
                {student.registration_status === "pending"
                  ? "Inscription en attente"
                  : student.registration_status === "rejected"
                    ? "Inscription refusée"
                    : "Inscription validée"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Prénom
                </p>
                <p className="mt-1 text-lg font-medium text-slate-100">
                  {student.first_name}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Nom
                </p>
                <p className="mt-1 text-lg font-medium text-slate-100">
                  {student.last_name}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Classe
                </p>
                <p className="mt-1 text-lg font-medium text-slate-100">
                  {className || "Non renseignée"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Année scolaire
                </p>
                <p className="mt-1 text-lg font-medium text-slate-100">
                  {schoolYear || "Non renseignée"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Numéro candidat
                </p>
                <p className="mt-1 text-lg font-medium text-slate-100">
                  {student.candidate_number || "Non renseigné"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
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
      </section>
    </main>
  );
}
