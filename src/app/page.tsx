import TeacherDashboard from "@/components/TeacherDashboard";
import { supabase } from "@/lib/supabaseClient";

export default async function Home() {
  const { data, error } = await supabase
    .from("teacher_fiche_dashboard")
    .select("*")
    .order("class_name", { ascending: true })
    .order("last_name", { ascending: true });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="mb-2 text-3xl font-bold sm:text-4xl">FicheMCV+</h1>

          <p className="text-sm text-slate-400 sm:text-base">
            Tableau de bord professeur — prototype connecté à Supabase
          </p>
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
