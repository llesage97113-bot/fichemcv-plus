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
    .from("fiche_sections")
    .select("*")
    .eq("fiche_id", id)
    .order("sort_order", { ascending: true });

  return (
    <main className="min-h-screen bg-slate-950 p-10 text-slate-100">
      <section className="mx-auto max-w-5xl">
        <Link href="/" className="mb-6 inline-block text-sm text-sky-300 hover:underline">
          ← Retour au tableau de bord
        </Link>

        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-2 text-sm uppercase tracking-wide text-slate-500">
            {fiche.class_name} · {fiche.epreuve} · Fiche n°{fiche.numero_fiche}
          </div>

          <h1 className="mb-3 text-3xl font-bold">{fiche.title}</h1>

          <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <p>
              <span className="text-slate-500">Élève :</span>{" "}
              {fiche.first_name} {fiche.last_name}
            </p>
            <p>
              <span className="text-slate-500">Statut :</span> {fiche.status}
            </p>
            <p>
              <span className="text-slate-500">Complétude :</span>{" "}
              {fiche.completion_score ?? 0}% — {fiche.quality_status}
            </p>
            <p>
              <span className="text-slate-500">Commentaires actifs :</span>{" "}
              {fiche.active_comments_count}
            </p>
          </div>
        </div>

        {sectionsError && (
          <div className="mb-6 rounded-lg border border-red-500 bg-red-950/40 p-4">
            <p className="font-semibold text-red-300">Erreur sections</p>
            <p className="text-red-200">{sectionsError.message}</p>
          </div>
        )}

        {!sectionsError && (!sections || sections.length === 0) && (
          <div className="rounded-lg border border-yellow-500 bg-yellow-950/40 p-4">
            <p className="font-semibold text-yellow-300">Aucune section trouvée</p>
            <p className="text-yellow-200">
              La fiche existe, mais aucune section n’est encore associée.
            </p>
          </div>
        )}

        {!sectionsError && sections && sections.length > 0 && (
          <div className="space-y-4">
            {sections.map((section) => (
              <article
                key={section.id}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold">{section.section_title}</h2>

                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {section.completion_status} · {section.character_count} caractères
                  </span>
                </div>

                {section.content ? (
                  <p className="whitespace-pre-wrap leading-7 text-slate-200">
                    {section.content}
                  </p>
                ) : (
                  <p className="italic text-slate-500">Section non renseignée.</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

