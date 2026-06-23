"use client";

import { useEffect, useState } from "react";

type PendingRegistration = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  student_code: string | null;
  registration_status: string | null;
  registration_submitted_at: string | null;
  classes?: {
    name: string | null;
    school_year: string | null;
    level: string | null;
  } | null;
  app_users?: {
    email: string | null;
    role: string | null;
    is_active: boolean | null;
  } | null;
  possible_duplicate?: boolean;
  duplicate_student_id?: string | null;
  duplicate_registration_status?: string | null;
  duplicate_created_at?: string | null;
};

export default function PendingStudentRegistrations() {
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionStudentId, setActionStudentId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [validatedStudentName, setValidatedStudentName] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const visibleMessage =
    message?.startsWith("Accès réservé") && message.includes("professeur")
      ? null
      : message;

  async function loadRegistrations() {
    setIsLoading(true);
    setMessage(null);
    setValidatedStudentName(null);
    setIsError(false);

    try {
      const response = await fetch("/api/admin/student-registrations");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Chargement impossible.");
      }

      setRegistrations(payload.registrations ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue pendant le chargement."
      );
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExportCsv() {
    try {
      const response = await fetch("/api/admin/student-registrations/export");

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Export CSV impossible.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "eleves-inscrits-fichemcv.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue pendant l’export CSV."
      );
      setIsError(true);
    }
  }

  async function handleExportXlsx() {
    try {
      const response = await fetch("/api/admin/student-registrations/export-xlsx");

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Export Excel impossible.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "eleves-inscrits-fichemcv.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue pendant l’export Excel."
      );
      setIsError(true);
    }
  }

  async function handleAction(studentId: string, action: "validate" | "reject") {
    const registration = registrations.find((item) => item.id === studentId);

    const confirmed = window.confirm(
      action === "validate" && registration?.possible_duplicate
        ? "Attention : un élève portant le même prénom et le même nom existe déjà dans cette classe. Valider quand même cette inscription ?"
        : action === "validate"
          ? "Valider cette inscription élève ?"
          : "Refuser cette inscription élève ? Le compte applicatif sera désactivé."
    );

    if (!confirmed) {
      return;
    }

    setActionStudentId(studentId);
    setMessage(null);
    setValidatedStudentName(null);
    setIsError(false);

    try {
      const response = await fetch("/api/admin/student-registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId, action }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Action impossible.");
      }

      if (action === "validate") {
        const studentName = `${registration?.first_name ?? ""} ${
          registration?.last_name ?? ""
        }`.trim();

        setValidatedStudentName(studentName || "Élève validé");
        setMessage(
          payload.message ??
            "Inscription validée. Les 3 fiches E31 et les 4 fiches E32 ont été générées."
        );
      } else {
        setValidatedStudentName(null);
        setMessage(payload.message ?? "Inscription refusée.");
      }

      setIsError(false);
      await loadRegistrations();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue pendant l’action."
      );
      setIsError(true);
    } finally {
      setActionStudentId(null);
    }
  }

  useEffect(() => {
    loadRegistrations();
  }, []);

  return (
    <section className="mb-8 rounded-2xl border border-sky-500/30 bg-slate-900/60 p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Inscriptions élèves en attente
          </h2>
          <p className="text-sm leading-6 text-slate-400">
            Valide les élèves inscrits avec le code de classe avant de générer ou rattacher leurs fiches.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportXlsx}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            Exporter les élèves Excel
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-xl border border-sky-500/40 px-4 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-950/40"
          >
            Exporter CSV
          </button>

          <button
            type="button"
            onClick={loadRegistrations}
            disabled={isLoading}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Actualiser
          </button>
        </div>
      </div>

      {isLoading && (
        <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
          Chargement des inscriptions…
        </p>
      )}

      {!isLoading && registrations.length === 0 && (
        <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/60 p-4">
          <p className="text-sm font-medium text-emerald-100">
            ✅ Aucune inscription élève en attente.
          </p>
        </div>
      )}

      {!isLoading && registrations.length > 0 && (
        <div className="grid gap-3">
          {registrations.map((registration) => (
            <article
              key={registration.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-100">
                    {registration.first_name} {registration.last_name}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                    <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-sky-200">
                      {registration.classes?.name ?? "Classe inconnue"} —{" "}
                      {registration.classes?.school_year ?? "année inconnue"}
                    </span>

                    <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-slate-300">
                      Code : {registration.student_code ?? "non généré"}
                    </span>

                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-amber-200">
                      En attente
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-400">
                    Identifiant :{" "}
                    <span className="font-mono text-slate-200">
                      {registration.app_users?.email ?? "non renseigné"}
                    </span>
                  </p>

                  {registration.possible_duplicate && (
                    <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">
                      <p className="font-semibold">
                        Doublon probable détecté
                      </p>
                      <p className="mt-1 leading-6 text-red-100/80">
                        Un élève avec le même prénom et le même nom existe déjà
                        dans cette classe. Vérifie avant toute validation.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAction(registration.id, "validate")}
                    disabled={actionStudentId === registration.id}
                    className={
                      registration.possible_duplicate
                        ? "rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                        : "rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    }
                  >
                    Valider
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction(registration.id, "reject")}
                    disabled={actionStudentId === registration.id}
                    className="rounded-xl border border-red-400/50 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {visibleMessage && (
        <div
          className={`mt-4 rounded-2xl border p-4 text-sm ${
            isError
              ? "border-red-500/40 bg-red-500/10 text-red-100"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
          }`}
        >
          {!isError && validatedStudentName && (
            <p className="mb-2 font-semibold text-emerald-200">
              Inscription validée pour {validatedStudentName}
            </p>
          )}

          <p className="leading-6">{visibleMessage}</p>

          {!isError && validatedStudentName && (
            <p className="mt-2 text-xs leading-5 text-emerald-200/90">
              L’élève peut maintenant accéder à son espace. Les fiches générées
              apparaissent en brouillon dans son tableau de bord.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
