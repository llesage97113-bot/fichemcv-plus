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
      return "Action professeur attendue : lire la fiche et décider de la suite.";
    case "a_corriger":
      return "En attente de correction élève.";
    case "corrigee":
      return "Action professeur attendue : valider la fiche ou la rouvrir en correction.";
    case "validee":
      return "Action professeur attendue : verrouiller la fiche.";
    case "verrouillee":
      return "Action professeur attendue : archiver la fiche.";
    case "archivee":
      return "Fiche archivée : lecture seule, aucune action attendue.";
    default:
      return "Aucune action professeur disponible pour ce statut.";
  }
}

function getWorkflowBoxClasses(status: string | null) {
  switch (status) {
    case "soumise":
    case "corrigee":
      return "border-red-500/40 bg-red-500/10";
    case "a_corriger":
      return "border-emerald-500/40 bg-emerald-500/10";
    case "validee":
    case "verrouillee":
      return "border-amber-500/40 bg-amber-500/10";
    case "archivee":
      return "border-slate-700 bg-slate-950/50";
    default:
      return "border-slate-800 bg-slate-950/50";
  }
}

function getWorkflowLabelClasses(status: string | null) {
  switch (status) {
    case "soumise":
    case "corrigee":
      return "text-red-300";
    case "a_corriger":
      return "text-emerald-300";
    case "validee":
    case "verrouillee":
      return "text-amber-300";
    case "archivee":
      return "text-slate-400";
    default:
      return "text-slate-500";
  }
}

function getWorkflowMessageClasses(status: string | null) {
  switch (status) {
    case "soumise":
    case "corrigee":
      return "text-red-100";
    case "a_corriger":
      return "text-emerald-100";
    case "validee":
    case "verrouillee":
      return "text-amber-100";
    case "archivee":
      return "text-slate-400";
    default:
      return "text-slate-300";
  }
}

function getPassiveWorkflowLabel(status: string | null) {
  switch (status) {
    case "a_corriger":
      return "En attente de correction élève";
    case "archivee":
      return "Fiche archivée — lecture seule";
    default:
      return null;
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
  const canMarkCorrected = false;
  const canReopenForCorrection = status === "corrigee";
  const canValidate = status === "corrigee";
  const canLock = status === "validee";
  const canArchive = status === "verrouillee";
  const passiveWorkflowLabel = getPassiveWorkflowLabel(status);

  async function runWorkflowAction(
    rpcName:
      | "request_fiche_correction"
      | "mark_fiche_corrected"
      | "reopen_fiche_for_correction"
      | "validate_fiche"
      | "lock_fiche"
      | "archive_fiche",
    successMessage: string
  ) {
    setMessage(null);
    setIsLoading(true);

    const { data, error } = await supabase.rpc(rpcName, {
      p_fiche_id: ficheId,
    });

    setIsLoading(false);

    if (error) {
      setMessageType("error");
      setMessage(error.message);
      return;
    }

    console.log("Action workflow réussie :", data);

    setMessageType("success");
    setMessage(successMessage);

    router.refresh();
  }

  return (
    <div className={`rounded-2xl border p-4 ${getWorkflowBoxClasses(status)}`}>
      <div className="mb-3">
        <p className={`text-xs uppercase tracking-wide ${getWorkflowLabelClasses(status)}`}>
          Actions professeur
        </p>
        <p className={`text-sm font-medium ${getWorkflowMessageClasses(status)}`}>
          {getTeacherStatusMessage(status)}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {canRequestCorrection && (
          <button
            type="button"
            onClick={() =>
              runWorkflowAction(
                "request_fiche_correction",
                "La fiche a été renvoyée à l’élève pour correction."
              )
            }
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-red-950/30 transition hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
          >
            {isLoading ? "Renvoi en cours..." : "Renvoyer en correction"}
          </button>
        )}

        {canMarkCorrected && (
          <button
            type="button"
            onClick={() => {
              const confirmed = window.confirm(
                "Confirmez-vous que la correction professeur est terminée ?\n\nLa fiche passera au statut « Corrigée ». L’élève ne pourra plus la modifier, sauf si vous la rouvrez ensuite en correction."
              );

              if (!confirmed) {
                return;
              }

              runWorkflowAction(
                "mark_fiche_corrected",
                "La fiche a été marquée comme corrigée."
              );
            }}
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
          >
            {isLoading ? "Traitement en cours..." : "Marquer la correction comme traitée"}
          </button>
        )}

        {canReopenForCorrection && (
          <button
            type="button"
            onClick={() => {
              const confirmed = window.confirm(
                "Réouvrir cette fiche en correction ?\n\nL’élève pourra de nouveau modifier sa fiche et la resoumettre."
              );

              if (!confirmed) {
                return;
              }

              runWorkflowAction(
                "reopen_fiche_for_correction",
                "La fiche a été rouverte en correction."
              );
            }}
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center rounded-lg border border-amber-400/50 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
          >
            {isLoading ? "Réouverture en cours..." : "Réouvrir en correction"}
          </button>
        )}

        {canValidate && (
          <button
            type="button"
            onClick={() =>
              runWorkflowAction("validate_fiche", "La fiche a été validée.")
            }
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-red-950/30 transition hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
          >
            {isLoading ? "Validation en cours..." : "Valider la fiche"}
          </button>
        )}

        {canLock && (
          <button
            type="button"
            onClick={() =>
              runWorkflowAction("lock_fiche", "La fiche a été verrouillée.")
            }
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-amber-950/30 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
          >
            {isLoading ? "Verrouillage en cours..." : "Verrouiller la fiche"}
          </button>
        )}

        {canArchive && (
          <button
            type="button"
            onClick={() =>
              runWorkflowAction("archive_fiche", "La fiche a été archivée.")
            }
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-amber-950/30 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
          >
            {isLoading ? "Archivage en cours..." : "Archiver la fiche"}
          </button>
        )}

        {passiveWorkflowLabel && (
          <button
            type="button"
            disabled
            className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-100 sm:w-auto"
          >
            {passiveWorkflowLabel}
          </button>
        )}

        {!canRequestCorrection &&
          !canMarkCorrected &&
          !canReopenForCorrection &&
          !canValidate &&
          !canLock &&
          !canArchive &&
          !passiveWorkflowLabel && (
            <p className="text-xs text-slate-500">
              Aucune action professeur disponible à ce stade du workflow.
            </p>
          )}
      </div>

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
