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

export default async function StudentDashboardPage() {
  const { data, error } = await supabase
    .from("teacher_fiche_dashboard")
    .select("*")
    .eq("first_name", "Emma")
    .eq("last_name", "MARTIN")
    .order("epreuve", { ascending: true })
    .order("numero_fiche", { ascending: true });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm sm:p-6">
          <div className="mb-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-slate-800 px-3 py-2 text-sm text-sky-300 hover:bg-slate-900 hover:text-sky-200"
            >
              ← Retour espace professeur
            </Link>
          </div>

          <p className="mb-2 text-sm uppercase tracking-wide text-slate-500">
            Espace élève — prototype
          </p>

          <h1 className="text-3xl font-bold sm:text-4xl">Bonjour Emma</h1>

          <p className="mt-2 text-sm text-slate-400 sm:text-base">
            Retrouve ici tes fiches, leur état d’avancement et les actions à réaliser.
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
              Aucune fiche n’est associée à Emma MARTIN pour le moment.
            </p>
          </div>
        )}

        {!error && data && data.length > 0 && (
          <div className="grid gap-4">
            {data.map((fiche) => {
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

                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
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
        )}
      </section>
    </main>
  );
}
