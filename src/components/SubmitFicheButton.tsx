"use client";

type SubmitFicheButtonProps = {
  ficheId: string;
  status: string | null;
  completionScore: number;
};

export default function SubmitFicheButton({
  ficheId,
  status,
  completionScore,
}: SubmitFicheButtonProps) {
  const isAlreadySubmitted =
    status === "submitted" ||
    status === "validated" ||
    status === "locked" ||
    status === "archived";

  const isTooIncomplete = completionScore < 55;

  const isDisabled = isAlreadySubmitted || isTooIncomplete;

  function handleSubmit() {
    if (isAlreadySubmitted) {
      alert("Cette fiche a déjà été soumise ou verrouillée.");
      return;
    }

    if (isTooIncomplete) {
      alert(
        "La fiche semble encore trop incomplète pour être soumise. Complète d'abord les sections essentielles."
      );
      return;
    }

    alert(
      `Prototype : la fiche ${ficheId} pourra bientôt être soumise via Supabase.`
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="mb-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Action sur la fiche
        </p>
        <p className="text-sm text-slate-300">
          La soumission signalera que la fiche est prête pour correction.
        </p>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isDisabled}
        className="inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
      >
        Soumettre la fiche
      </button>

      {isAlreadySubmitted && (
        <p className="mt-3 text-xs text-amber-300">
          Cette fiche n’est plus modifiable librement car son statut actuel est :
          {" "}
          {status}.
        </p>
      )}

      {!isAlreadySubmitted && isTooIncomplete && (
        <p className="mt-3 text-xs text-amber-300">
          La fiche doit atteindre au moins 55 % de complétude avant soumission.
        </p>
      )}

      {!isAlreadySubmitted && !isTooIncomplete && (
        <p className="mt-3 text-xs text-emerald-300">
          La fiche peut être soumise pour correction.
        </p>
      )}
    </div>
  );
}
