"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type TeacherWorkflowActionsProps = {
  ficheId: string;
  status: string | null;
};

function getTeacherStatusMessage(status: string | null) {
  switch (status) {
    case "soumise":
      return "Cette fiche a été soumise. Le professeur peut demander des corrections.";
    case "a_corriger":
      return "Cette fiche a été renvoyée à l’élève pour correction.";
    case "corrigee":
      return "Cette fiche a été corrigée.";
    case "validee":
      return "Cette fiche est validée.";
    case "verrouillee":
      return "Cette fiche est verrouillée.";
    case "archivee":
      return "Cette fiche est archivée.";
    default:
      return "Aucune action professeur disponible pour ce statut.";
  }
}

export default function TeacherWorkflowActions({
  ficheId,
  status,
}: TeacherWorkflowActionsProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );

  const canRequestCorrection = status === "soumise";

  async function handleRequestCorrection() {
    setMessage(null);
    setIsLoading(true);

    const { data, error } = await supabase.rpc("request_fiche_correction", {
      p_fiche_id: ficheId,
    });

    setIsLoading(false);

    if (error) {
      setMessageType("error");
      setMessage(error.message);
      return;
    }

    console.log("Correction demandée :", data);

    setMessageType("success");
    setMessage("La fiche a été renvoyée à l’élève pour correction.");

    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="mb-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Actions professeur
        </p>
        <p className="text-sm text-slate-300">
          {getTeacherStatusMessage(status)}
        </p>
      </div>

      {canRequestCorrection ? (
        <button
          type="button"
          onClick={handleRequestCorrection}
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
        >
          {isLoading ? "Renvoi en cours..." : "Renvoyer en correction"}
        </button>
      ) : (
        <p className="text-xs text-slate-500">
          Cette action sera disponible lorsque la fiche sera au statut soumise.
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
