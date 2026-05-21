import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default async function FicheDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: fiche, error: ficheError } = await supabase
    .from("teacher_fiche_dashboard")
    .select("*")
    .eq("fiche_id", id)
    .single();

  if (ficheError || !fiche) {
    notFound();
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("fiche_sections_dashboard")
    .select("*")
    .eq("fiche_id", id)
    .order("sort_order", { ascending: true });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center rounded-lg border border-slate-800 px-3 py-2 text-sm text-sky-300 hover:bg-slate-900 hover:text-sky-200"
        >
          ← Retour au tableau de bord
        </Link>

        <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm sm:p-6">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
              {fiche.epreuve}
            </span>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
              Fiche n°{fiche.numero_fiche}
            </span>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
              {fiche.class_name}
            </span>
          </div>

          <h1 className="mb-4 text-2xl font-bold leading-tight sm:text-3xl">
            {fiche.title}
          </h1>

          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Élève
              </p>
              <p className="font-medium text-slate-100">
                {fiche.first_name} {fiche.last_name}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Statut
              </p>
              <p className="font-medium text-slate-100">{fiche.status}</p>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Complétude
              </p>
              <p className="font-medium text-slate-100">
                {fiche.completion_score ?? 0}% — {fiche.quality_status}
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Commentaires actifs
              </p>
              <p className="font-medium text-slate-100">
                {fiche.active_comments_count}
              </p>
            </div>
          </div>
        </header>

        {sectionsError && (
          <div className="mb-6 rounded-xl border border-red-500 bg-red-950/40 p-4">
            <p className="font-semibold text-red-300">Erreur sections</p>
            <p className="text-red-200">{sectionsError.message}</p>
          </div>
        )}

        {!sectionsError && (!sections || sections.length === 0) && (
          <div className="rounded-xl border border-yellow-500 bg-yellow-950/40 p-4">
            <p className="font-semibold text-yellow-300">Aucune section trouvée</p>
            <p className="text-yellow-200">
              La fiche existe, mais aucune section n’est encore associée.
            </p>
          </div>
        )}

        {!sectionsError && sections && sections.length > 0 && (
          <div className="space-y-4">
            {sections.map((section, index) => (
              <article
                key={section.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm sm:p-5"
              >
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                      Section {index + 1}
                    </p>

                    <h2 className="text-lg font-semibold leading-snug text-slate-100 sm:text-xl">
                      {section.section_title}
                    </h2>
                  </div>

                  <span className="w-fit rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {section.completion_status} · {section.character_count} caractères
                  </span>
                </div>

                {section.content ? (
                  <p className="whitespace-pre-wrap rounded-xl bg-slate-950/50 p-4 text-sm leading-7 text-slate-200 sm:text-base">
                    {section.content}
                  </p>
                ) : (
                  <p className="rounded-xl bg-slate-950/50 p-4 text-sm italic text-slate-500">
                    Section non renseignée.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
