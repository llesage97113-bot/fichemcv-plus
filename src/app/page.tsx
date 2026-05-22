import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

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
          <>
            <div className="space-y-4 md:hidden">
              {data.map((fiche) => {
                const score = Number(fiche.completion_score ?? 0);
                const progress = getProgressClasses(score);

                return (
                  <article
                    key={fiche.fiche_id}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                        {fiche.epreuve} · Fiche n°{fiche.numero_fiche}
                      </span>

                      <span className="text-xs text-slate-400">
                        {fiche.class_name}
                      </span>
                    </div>

                    <h2 className="mb-2 text-lg font-semibold">
                      <Link
                        href={`/fiches/${fiche.fiche_id}`}
                        className="text-sky-300 hover:text-sky-200 hover:underline"
                      >
                        {fiche.title}
                      </Link>
                    </h2>

                    <p className="mb-4 text-sm text-slate-300">
                      {fiche.first_name} {fiche.last_name}
                    </p>

                    <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-xs uppercase tracking-wide text-slate-500">
                          Progression
                        </span>

                        <span className={`text-sm font-bold ${progress.text}`}>
                          {score} %
                        </span>
                      </div>

                      <div
                        className={`h-3 overflow-hidden rounded-full ${progress.track}`}
                      >
                        <div
                          className={`h-full rounded-full ${progress.bar}`}
                          style={{
                            width: `${Math.min(Math.max(score, 0), 100)}%`,
                          }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        Statut qualité :{" "}
                        <span className={progress.text}>
                          {fiche.quality_status ?? "non évalué"}
                        </span>
                      </p>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-300">
                      <p>
                        <span className="text-slate-500">Statut :</span>{" "}
                        {fiche.status}
                      </p>

                      <p>
                        <span className="text-slate-500">Commentaires :</span>{" "}
                        {fiche.active_comments_count}
                      </p>
                    </div>

                    <Link
                      href={`/fiches/${fiche.fiche_id}`}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
                    >
                      Ouvrir la fiche
                    </Link>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-hidden rounded-xl border border-slate-800 md:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="p-3 text-left">Classe</th>
                    <th className="p-3 text-left">Élève</th>
                    <th className="p-3 text-left">Épreuve</th>
                    <th className="p-3 text-left">Fiche</th>
                    <th className="p-3 text-left">Statut</th>
                    <th className="p-3 text-left">Progression</th>
                    <th className="p-3 text-left">Commentaires</th>
                  </tr>
                </thead>

                <tbody>
                  {data.map((fiche) => {
                    const score = Number(fiche.completion_score ?? 0);
                    const progress = getProgressClasses(score);

                    return (
                      <tr
                        key={fiche.fiche_id}
                        className="border-t border-slate-800"
                      >
                        <td className="p-3">{fiche.class_name}</td>

                        <td className="p-3">
                          {fiche.first_name} {fiche.last_name}
                        </td>

                        <td className="p-3">{fiche.epreuve}</td>

                        <td className="p-3">
                          <Link
                            href={`/fiches/${fiche.fiche_id}`}
                            className="font-medium text-sky-300 hover:text-sky-200 hover:underline"
                          >
                            {fiche.title}
                          </Link>
                          <div className="text-slate-500">
                            Fiche n°{fiche.numero_fiche}
                          </div>
                        </td>

                        <td className="p-3">{fiche.status}</td>

                        <td className="p-3">
                          <div className="min-w-36">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className={`font-bold ${progress.text}`}>
                                {score} %
                              </span>
                              <span className="text-xs text-slate-500">
                                {fiche.quality_status}
                              </span>
                            </div>

                            <div
                              className={`h-2 overflow-hidden rounded-full ${progress.track}`}
                            >
                              <div
                                className={`h-full rounded-full ${progress.bar}`}
                                style={{
                                  width: `${Math.min(Math.max(score, 0), 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="p-3">{fiche.active_comments_count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
