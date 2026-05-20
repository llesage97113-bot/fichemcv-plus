import { supabase } from "@/lib/supabaseClient";

export default async function Home() {
  const { data, error } = await supabase
    .from("teacher_fiche_dashboard")
    .select("*")
    .order("class_name", { ascending: true })
    .order("last_name", { ascending: true });

  return (
    <main className="min-h-screen bg-slate-950 p-10 text-slate-100">
      <section className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-4xl font-bold">FicheMCV+</h1>

        <p className="mb-8 text-slate-400">
          Tableau de bord professeur — prototype connecté à Supabase
        </p>

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
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-900">
                <tr>
                  <th className="p-3 text-left">Classe</th>
                  <th className="p-3 text-left">Élève</th>
                  <th className="p-3 text-left">Épreuve</th>
                  <th className="p-3 text-left">Fiche</th>
                  <th className="p-3 text-left">Statut</th>
                  <th className="p-3 text-left">Complétude</th>
                  <th className="p-3 text-left">Commentaires</th>
                </tr>
              </thead>

              <tbody>
                {data.map((fiche) => (
                  <tr key={fiche.fiche_id} className="border-t border-slate-800">
                    <td className="p-3">{fiche.class_name}</td>

                    <td className="p-3">
                      {fiche.first_name} {fiche.last_name}
                    </td>

                    <td className="p-3">{fiche.epreuve}</td>

                    <td className="p-3">
                      <div className="font-medium">{fiche.title}</div>
                      <div className="text-slate-500">
                        Fiche n°{fiche.numero_fiche}
                      </div>
                    </td>

                    <td className="p-3">{fiche.status}</td>

                    <td className="p-3">
                      {fiche.completion_score ?? 0}% — {fiche.quality_status}
                    </td>

                    <td className="p-3">{fiche.active_comments_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
