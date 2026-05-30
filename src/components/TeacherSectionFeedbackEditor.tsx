"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SaveState = "idle" | "saving" | "saved" | "error";

type TeacherSectionFeedbackEditorProps = {
  sectionId: string;
  initialFeedback?: string | null;
};

export default function TeacherSectionFeedbackEditor({
  sectionId,
  initialFeedback = null,
}: TeacherSectionFeedbackEditorProps) {
  const router = useRouter();

  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function saveFeedback() {
    setSaveState("saving");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/teacher/section-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sectionId,
          teacherFeedback: feedback.trim() || null,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Sauvegarde impossible.");
      }

      setSaveState("saved");
      router.refresh();
    } catch (error) {
      setSaveState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue pendant la sauvegarde."
      );
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-200">
          Remarque professeur
        </p>
        <p className="mt-1 text-sm leading-6 text-red-100">
          Cette remarque sera visible par l’élève dans un encadré rouge.
        </p>
      </div>

      <textarea
        value={feedback}
        onChange={(event) => {
          setFeedback(event.target.value);
          setSaveState("idle");
        }}
        rows={4}
        className="w-full rounded-xl border border-red-500/40 bg-slate-950/80 p-3 text-sm leading-6 text-red-50 outline-none placeholder:text-red-200/40 focus:border-red-300"
        placeholder="Exemple : développe cette partie, précise le contexte, le client, ton rôle et les éléments observés."
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {saveState === "saved" && (
            <p className="text-sm font-medium text-emerald-300">
              Remarque professeur sauvegardée.
            </p>
          )}

          {saveState === "error" && (
            <p className="text-sm font-medium text-red-300">
              {errorMessage ?? "Erreur de sauvegarde."}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={saveFeedback}
          disabled={saveState === "saving"}
          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveState === "saving"
            ? "Sauvegarde..."
            : "Sauvegarder la remarque"}
        </button>
      </div>
    </div>
  );
}
