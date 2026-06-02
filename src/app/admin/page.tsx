import AppNavigation from "@/components/AppNavigation";
import AdminTeacherCreator from "@/components/AdminTeacherCreator";
import AdminTeacherPasswordResetter from "@/components/AdminTeacherPasswordResetter";
import AdminTeacherActiveToggle from "@/components/AdminTeacherActiveToggle";
import ClassTeacherAssignmentManager from "@/components/ClassTeacherAssignmentManager";
import { requireRole } from "@/lib/auth/requireUser";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminPage() {
  await requireRole("admin");

  const admin = createAdminClient();

  const { count: teachersCount } = await admin
    .from("app_users")
    .select("id", { count: "exact", head: true })
    .eq("role", "teacher");

  const { count: activeTeachersCount } = await admin
    .from("app_users")
    .select("id", { count: "exact", head: true })
    .eq("role", "teacher")
    .eq("is_active", true);

  const { data: teachers } = await admin
    .from("app_users")
    .select("id, email, is_active")
    .eq("role", "teacher")
    .order("email", { ascending: true });

  const { count: classesCount } = await admin
    .from("classes")
    .select("id", { count: "exact", head: true });

  const { count: studentsCount } = await admin
    .from("students")
    .select("id", { count: "exact", head: true });

  const { count: pendingStudentsCount } = await admin
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("registration_status", "pending");

  const { count: validatedStudentsCount } = await admin
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("registration_status", "validated");

  const { count: rejectedStudentsCount } = await admin
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("registration_status", "rejected");

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <AppNavigation maxWidth="6xl" />

      <section className="mx-auto max-w-6xl">
        <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm">
          <p className="mb-2 text-sm uppercase tracking-wide text-sky-300">
            Administration
          </p>

          <h1 className="text-3xl font-bold sm:text-4xl">
            Administration FicheMCV+
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Espace réservé à l’administrateur de l’application. Cette première version
            est volontairement en lecture seule afin de vérifier les accès et les données
            avant d’ajouter des actions sensibles.
          </p>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Professeurs
            </p>
            <p className="mt-2 text-3xl font-bold text-sky-200">
              {teachersCount ?? 0}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {activeTeachersCount ?? 0} actif(s)
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Classes
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-200">
              {classesCount ?? 0}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Classes créées dans l’application
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Élèves
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-200">
              {studentsCount ?? 0}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Tous statuts confondus
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Inscriptions
            </p>
            <p className="mt-2 text-3xl font-bold text-purple-200">
              {pendingStudentsCount ?? 0}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              En attente de validation
            </p>
          </div>
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-2">
          <AdminTeacherCreator />
          <AdminTeacherPasswordResetter />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-purple-300">
              Professeurs
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-100">
              Professeurs existants
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Liste des comptes professeurs actuellement déclarés dans FicheMCV+.
            </p>
          </div>

          {teachers && teachers.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {teachers.map((teacher) => (
                    <tr key={teacher.id} className="bg-slate-900/40">
                      <td className="px-4 py-3 font-mono text-slate-200">
                        {teacher.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            teacher.is_active
                              ? "bg-emerald-500/15 text-emerald-200"
                              : "bg-red-500/15 text-red-200"
                          }`}
                        >
                          {teacher.is_active ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <AdminTeacherActiveToggle
                          teacherId={teacher.id}
                          teacherEmail={teacher.email ?? ""}
                          isActive={Boolean(teacher.is_active)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-sm text-slate-400">
                Aucun professeur déclaré pour le moment.
              </p>
            </div>
          )}
        </section>

        <ClassTeacherAssignmentManager />

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-slate-100">
              Statuts élèves
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between rounded-xl bg-slate-950/60 px-3 py-2">
                <span className="text-slate-400">Validés</span>
                <span className="font-semibold text-emerald-200">
                  {validatedStudentsCount ?? 0}
                </span>
              </div>

              <div className="flex justify-between rounded-xl bg-slate-950/60 px-3 py-2">
                <span className="text-slate-400">En attente</span>
                <span className="font-semibold text-amber-200">
                  {pendingStudentsCount ?? 0}
                </span>
              </div>

              <div className="flex justify-between rounded-xl bg-slate-950/60 px-3 py-2">
                <span className="text-slate-400">Rejetés</span>
                <span className="font-semibold text-red-200">
                  {rejectedStudentsCount ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-100">
              Prochaines fonctions admin
            </h2>

            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
              <li>Créer un professeur depuis l’interface.</li>
              <li>Activer ou désactiver un professeur.</li>
              <li>Rattacher un professeur à une ou plusieurs classes.</li>
              <li>Gérer les classes et les codes d’inscription.</li>
              <li>Superviser les comptes élèves et les exports.</li>
            </ul>
          </div>
        </section>
      </section>
    </main>
  );
}
