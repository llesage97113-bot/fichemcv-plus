"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type SubmitFicheButtonProps = {
  ficheId: string;
  status: string | null;
  completionScore: number;
};

function getStatusLabel(status: string | null) {
  switch (status) {
    case "soumise":
      return "Fiche déjà soumise";
    case "corrigee":
      return "Fiche corrigée";
    case "validee":
      return "Fiche validée";
    case "verrouillee":
      return "Fiche verrouillée";
    case "archivee":
      return "Fiche archivée";
    default:
      return null;
  }
}

export default function SubmitFicheButton({
  ficheId,
  status,
  completionScore,
}: SubmitFicheButtonProps) {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );

  const isWorkflowLocked =
    status === "soumise" ||
    status === "corrigee" ||
    status === "validee" ||
    status === "verrouillee" ||
    status === "archivee";

  const isCorrectionMode = status === "a_corriger";
  const isTooIncomplete = completionScore < 55;

  const isDisabled = isSubmitting || isWorkflowLocked || isTooIncomplete;

  const statusLabel = getStatusLabel(status);

  const buttonLabel = isSubmitting
    ? "Soumission en cours..."
    : statusLabel
      ? statusLabel
      : isTooIncomplete
        ? "Fiche incomplète"
        : isCorrectionMode
          ? "Resoumettre la fiche"
          : "Soumettre la fiche";

  async function handleSubmit() {
    setMessage(null);

    if (isWorkflowLocked) {
      setMessageType("error");
      setMessage("Cette fiche ne peut plus être soumise à ce stade du workflow.");
      return;
    }

    if (isTooIncomplete) {
      setMessageType("error");
      setMessage(
        "La fiche semble encore trop incomplète pour être soumise. Complète d'abord les sections essentielles."
      );
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.rpc("submit_fiche", {
      p_fiche_id: ficheId,
    });

    setIsSubmitting(false);

    if (error) {
      setMessageType("error");
      setMessage(error.message);
      return;
    }

    setMessageType("success");
    setMessage(
      isCorrectionMode
        ? "La fiche a bien été resoumise après correction."
        : "La fiche a bien été soumise pour correction."
    );

    console.log("Soumission réussie :", data);

    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="mb-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Action sur la fiche
        </p>
        <p className="text-sm text-slate-300">
          {isCorrectionMode
            ? "Après correction, tu peux renvoyer ta fiche au professeur."
            : "La soumission signalera que la fiche est prête pour correction."}
        </p>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isDisabled}
        className="inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
      >
        {buttonLabel}
      </button>

      {isWorkflowLocked && (
        <p className="mt-3 text-xs text-amber-300">
          Cette fiche n’est plus modifiable librement car son statut actuel est :{" "}
          {status}.
        </p>
      )}

      {!isWorkflowLocked && isTooIncomplete && (
        <p className="mt-3 text-xs text-amber-300">
          La fiche doit atteindre au moins 55 % de complétude avant soumission.
          Score actuel : {completionScore} %.
        </p>
      )}

      {!isWorkflowLocked && !isTooIncomplete && (
        <p className="mt-3 text-xs text-emerald-300">
          {isCorrectionMode
            ? "La fiche peut être resoumise après correction."
            : "La fiche peut être soumise pour correction."}
        </p>
      )}

      {message && (
        <p
          className={`mt-3 text-sm ${
            messageType === "success"
              ? "text-emerald-300"
              : messageType === "error"
                ? "text-red-300"
                : "text-slate-300"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
