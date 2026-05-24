import Link from "next/link";
import TeacherDashboard from "@/components/TeacherDashboard";
import { supabase } from "@/lib/supabaseClient";
import AppNavigation from "@/components/AppNavigation";
import { requireRole } from "@/lib/auth/requireUser";

export default async function Home() {
  await requireRole("professeur");

  const { data, error } = await supabase
    .from("teacher_fiche_dashboard")
    .select("*")
    .order("class_name", { ascending: true })
    .order("last_name", { ascending: true });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
<AppNavigation />

      <section className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold sm:text-4xl">FicheMCV+</h1>

            <p className="text-sm text-slate-400 sm:text-base">
              Tableau de bord professeur — prototype connecté à Supabase
            </p>
          </div>

          <Link
            href="/eleve"
            className="inline-flex items-center justify-center rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/20 hover:text-sky-200"
          >
            Voir l’espace élève prototype
          </Link>
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

        {!error && data && data.length > 0 && (
          <TeacherDashboard fiches={data} />
        )}
      </section>
    </main>
  );
}
