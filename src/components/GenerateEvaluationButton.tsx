"use client";

import { useState } from "react";

type GenerateEvaluationButtonProps = {
  ficheId: string;
};

export default function GenerateEvaluationButton({
  ficheId,
}: GenerateEvaluationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function generateEvaluation() {
    const confirmed = window.confirm(
      "Générer une analyse pédagogique provisoire pour cette fiche ?"
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/evaluations/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ficheId }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Analyse impossible.");
      }

      setMessage(
        "Analyse pédagogique générée. Elle est enregistrée avec le statut “à vérifier”."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue pendant la génération."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-sky-100">
            Analyse pédagogique
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            Génère une première analyse provisoire de la fiche. Cette analyse devra
            être vérifiée par le professeur avant toute utilisation certificative.
          </p>
        </div>

        <button
          type="button"
          onClick={generateEvaluation}
          disabled={isLoading}
          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Analyse en cours..." : "Générer l’analyse"}
        </button>
      </div>

      {message && (
        <p className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
