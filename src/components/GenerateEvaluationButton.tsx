"use client";

import { useState } from "react";

type GenerateEvaluationButtonProps = {
  ficheId: string;
  initialReport?: PedagogicalReport | null;
  initialReportCreatedAt?: string | null;
};

type PedagogicalReport = {
  version?: string;
  diagnostic?: {
    avis_global?: string;
    sections_total?: number;
    sections_renseignees?: number;
    sections_vides?: number;
  };
  points_forts?: string[];
  points_a_ameliorer?: string[];
  questions_de_relance?: string[];
  recommandation_professeur?: string;
};

function formatAvisGlobal(value?: string) {
  switch (value) {
    case "exploitable_a_verifier":
      return "Exploitable, à vérifier par le professeur";
    case "fragile_a_completer":
      return "Fragile, à compléter";
    default:
      return value ?? "Non renseigné";
  }
}

function ReportList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items?: string[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      {items && items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{emptyLabel}</p>
      )}
    </div>
  );
}

export default function GenerateEvaluationButton({
  ficheId,
  initialReport = null,
  initialReportCreatedAt = null,
}: GenerateEvaluationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [report, setReport] = useState<PedagogicalReport | null>(initialReport);
  const [reportCreatedAt, setReportCreatedAt] = useState<string | null>(
    initialReportCreatedAt
  );

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

      setReport(payload.report?.report_json ?? null);
      setReportCreatedAt(payload.report?.created_at ?? null);
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

      {report && (
        <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-100">
                Rapport d’analyse généré
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Version : {report.version ?? "non renseignée"}
              </p>
              {reportCreatedAt && (
                <p className="mt-1 text-xs text-slate-500">
                  Généré le : {new Date(reportCreatedAt).toLocaleString("fr-FR")}
                </p>
              )}
            </div>

            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
              À vérifier
            </span>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Avis global
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-100">
                {formatAvisGlobal(report.diagnostic?.avis_global)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Sections renseignées
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-100">
                {report.diagnostic?.sections_renseignees ?? 0} /{" "}
                {report.diagnostic?.sections_total ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Sections vides
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-100">
                {report.diagnostic?.sections_vides ?? 0}
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ReportList
              title="Points forts"
              items={report.points_forts}
              emptyLabel="Aucun point fort automatiquement détecté."
            />

            <ReportList
              title="Points à améliorer"
              items={report.points_a_ameliorer}
              emptyLabel="Aucun point d’amélioration automatiquement détecté."
            />

            <ReportList
              title="Questions de relance"
              items={report.questions_de_relance}
              emptyLabel="Aucune question de relance générée."
            />

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recommandation professeur
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {report.recommandation_professeur ??
                  "Le professeur doit vérifier cette analyse avant toute utilisation."}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
