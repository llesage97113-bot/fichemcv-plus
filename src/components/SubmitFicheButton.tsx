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
    case "corrigee":
      return "En attente de la réponse professeur";
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

function getStudentWorkflowBoxClasses(
  status: string | null,
  isTooIncomplete: boolean
) {
  if (status === "brouillon" || status === "a_corriger" || isTooIncomplete) {
    return "border-red-500/40 bg-red-500/10";
  }

  if (status === "soumise" || status === "corrigee") {
    return "border-emerald-500/40 bg-emerald-500/10";
  }

  if (
    status === "validee" ||
    status === "verrouillee" ||
    status === "archivee"
  ) {
    return "border-slate-700 bg-slate-950/50";
  }

  return "border-red-500/40 bg-red-500/10";
}

function getStudentWorkflowLabelClasses(
  status: string | null,
  isTooIncomplete: boolean
) {
  if (status === "brouillon" || status === "a_corriger" || isTooIncomplete) {
    return "text-red-300";
  }

  if (status === "soumise" || status === "corrigee") {
    return "text-emerald-300";
  }

  if (
    status === "validee" ||
    status === "verrouillee" ||
    status === "archivee"
  ) {
    return "text-slate-400";
  }

  return "text-red-300";
}

function getStudentWorkflowMessageClasses(
  status: string | null,
  isTooIncomplete: boolean
) {
  if (status === "brouillon" || status === "a_corriger" || isTooIncomplete) {
    return "text-red-100";
  }

  if (status === "soumise" || status === "corrigee") {
    return "text-emerald-100";
  }

  if (
    status === "validee" ||
    status === "verrouillee" ||
    status === "archivee"
  ) {
    return "text-slate-400";
  }

  return "text-red-100";
}

function getStudentWorkflowMessage(
  status: string | null,
  isTooIncomplete: boolean,
  completionScore: number
) {
  if (isTooIncomplete && status !== "soumise" && status !== "corrigee") {
    return `Action élève attendue : complète encore ta fiche avant de pouvoir la soumettre. Score actuel : ${completionScore} %.`;
  }

  switch (status) {
    case "a_corriger":
      return "Action élève attendue : corrige ta fiche puis resoumets-la au professeur.";
    case "brouillon":
    case "non_commencee":
    case null:
      return "Action élève attendue : complète ta fiche puis soumets-la au professeur.";
    case "soumise":
      return "En attente du professeur : ta fiche a été soumise.";
    case "corrigee":
      return "En attente du professeur : ta fiche a été corrigée et attend validation.";
    case "validee":
      return "Fiche validée : elle reste consultable.";
    case "verrouillee":
      return "Fiche verrouillée : elle est conservée en lecture seule.";
    case "archivee":
      return "Fiche archivée : lecture seule.";
    default:
      return "Consulte l’état de ta fiche.";
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
    <div
      className={`rounded-2xl border p-4 ${getStudentWorkflowBoxClasses(
        status,
        isTooIncomplete
      )}`}
    >
      <div className="mb-3">
        <p
          className={`text-xs uppercase tracking-wide ${getStudentWorkflowLabelClasses(
            status,
            isTooIncomplete
          )}`}
        >
          Action élève
        </p>

        <p
          className={`text-sm font-medium ${getStudentWorkflowMessageClasses(
            status,
            isTooIncomplete
          )}`}
        >
          {getStudentWorkflowMessage(status, isTooIncomplete, completionScore)}
        </p>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isDisabled}
        className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto ${
          isWorkflowLocked
            ? "border border-emerald-400/50 bg-emerald-500/10 font-bold text-emerald-100"
            : isTooIncomplete
              ? "bg-slate-700 text-slate-400"
              : "bg-red-500 text-white shadow-sm shadow-red-950/30 hover:bg-red-400"
        }`}
      >
        {buttonLabel}
      </button>

      {isWorkflowLocked && (
        <p className="mt-3 text-xs text-emerald-200">
          {status === "soumise" || status === "corrigee"
            ? "Tu n’as rien à faire pour le moment : ton professeur doit traiter cette fiche."
            : "Cette fiche est maintenant en lecture seule."}
        </p>
      )}

      {!isWorkflowLocked && isTooIncomplete && (
        <p className="mt-3 text-xs text-red-200">
          La fiche doit atteindre au moins 55 % de complétude avant soumission.
        </p>
      )}

      {!isWorkflowLocked && !isTooIncomplete && (
        <p className="mt-3 text-xs text-red-100">
          {isCorrectionMode
            ? "Après correction, renvoie ta fiche au professeur."
            : "Quand ta fiche est prête, soumets-la au professeur."}
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
