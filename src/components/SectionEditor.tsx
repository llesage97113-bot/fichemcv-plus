"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type SectionEditorProps = {
  section: {
    id: string;
    section_title: string;
    student_question?: string | null;
    help_text?: string | null;
    content: string | null;
    completion_status: string;
    character_count: number;
    is_core?: boolean | null;
  };
  isReadOnly?: boolean;
};

function getStatusLabel(status: string) {
  if (status === "vide") return "[À compléter]";
  if (status === "trop_court") return "[Trop court]";
  if (status === "partiel") return "[Partiel]";
  if (status === "exploitable") return "[Exploitable]";
  return status;
}

function getStatusHelp(status: string) {
  if (status === "vide") {
    return "Cette section est vide. Elle doit être renseignée pour rendre la fiche exploitable.";
  }

  if (status === "trop_court") {
    return "La réponse est encore trop courte. Ajoute des détails concrets sur la situation.";
  }

  if (status === "partiel") {
    return "La réponse contient des éléments utiles, mais elle peut être précisée.";
  }

  if (status === "exploitable") {
    return "Cette réponse semble suffisamment développée pour être analysée.";
  }

  return "Statut de complétude à vérifier.";
}

function getStatusClasses(status: string) {
  if (status === "vide") {
    return {
      badge: "bg-slate-800 text-slate-200 border-slate-600",
      box: "border-slate-700 bg-slate-950/60 text-slate-300",
      bar: "bg-slate-800",
      progress: "w-1/12 bg-slate-500",
    };
  }

  if (status === "trop_court") {
    return {
      badge: "bg-amber-500/20 text-amber-200 border-amber-400/50",
      box: "border-amber-400/40 bg-amber-950/30 text-amber-100",
      bar: "bg-slate-800",
      progress: "w-1/4 bg-amber-400",
    };
  }

  if (status === "partiel") {
    return {
      badge: "bg-sky-500/20 text-sky-200 border-sky-400/50",
      box: "border-sky-400/40 bg-sky-950/30 text-sky-100",
      bar: "bg-slate-800",
      progress: "w-2/3 bg-sky-400",
    };
  }

  if (status === "exploitable") {
    return {
      badge: "bg-emerald-500/20 text-emerald-200 border-emerald-400/50",
      box: "border-emerald-400/40 bg-emerald-950/30 text-emerald-100",
      bar: "bg-slate-800",
      progress: "w-full bg-emerald-400",
    };
  }

  return {
    badge: "bg-slate-800 text-slate-200 border-slate-600",
    box: "border-slate-700 bg-slate-950/60 text-slate-300",
    bar: "bg-slate-800",
    progress: "w-1/12 bg-slate-500",
  };
}

function getSaveMessage(saveState: SaveState, isReadOnly: boolean) {
  if (isReadOnly) {
    return "Lecture seule : cette fiche n’est plus modifiable librement.";
  }

  if (saveState === "dirty") return "Modification en cours…";
  if (saveState === "saving") return "Sauvegarde automatique…";
  if (saveState === "saved") return "Sauvegardé automatiquement";
  if (saveState === "error") return "Erreur de sauvegarde";
  return "La sauvegarde automatique se déclenche après quelques secondes d’inactivité.";
}

function getSaveMessageClass(saveState: SaveState, isReadOnly: boolean) {
  if (isReadOnly) return "text-amber-300";
  if (saveState === "dirty") return "text-amber-300";
  if (saveState === "saving") return "text-sky-300";
  if (saveState === "saved") return "text-emerald-300";
  if (saveState === "error") return "text-red-300";
  return "text-slate-400";
}

export default function SectionEditor({
  section,
  isReadOnly = false,
}: SectionEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState(section.content ?? "");
  const [status, setStatus] = useState(section.completion_status);
  const [characterCount, setCharacterCount] = useState(
    section.character_count ?? 0
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const statusClasses = getStatusClasses(status);
  const initialContentRef = useRef(section.content ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function saveSection(nextContent: string) {
    if (isReadOnly) {
      setSaveState("error");
      setErrorMessage("Cette fiche est en lecture seule et ne peut plus être modifiée.");
      return;
    }

    setSaveState("saving");
    setErrorMessage(null);

    const { data, error } = await supabase.rpc(
      "prototype_update_section_content",
      {
        p_section_id: section.id,
        p_content: nextContent,
      }
    );

    if (error) {
      setSaveState("error");
      setErrorMessage(error.message);
      return;
    }

    const updated = data?.[0];

    if (updated) {
      setStatus(updated.completion_status);
      setCharacterCount(updated.character_count);
      initialContentRef.current = nextContent;
      setSaveState("saved");
      router.refresh();
    }
  }

  useEffect(() => {
    if (isReadOnly) {
      return;
    }

    if (content === initialContentRef.current) {
      return;
    }

    setSaveState("dirty");

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveSection(content);
    }, 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, isReadOnly]);

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {section.is_core && (
              <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                Section centrale
              </span>
            )}

            {isReadOnly && (
              <span className="rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                Lecture seule
              </span>
            )}

            <span
              className={`rounded-full border px-4 py-2 text-sm font-bold shadow-sm ${statusClasses.badge}`}
            >
              {getStatusLabel(status)} · {characterCount} caractères
            </span>
          </div>

          <h2 className="text-lg font-semibold leading-snug text-slate-100 sm:text-xl">
            {section.section_title}
          </h2>
        </div>
      </div>

      <div className={`mb-4 h-3 overflow-hidden rounded-full ${statusClasses.bar}`}>
        <div className={`h-full rounded-full ${statusClasses.progress}`} />
      </div>

      {(section.student_question || section.help_text) && (
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          {section.student_question && (
            <p className="mb-2 font-medium text-sky-200">
              {section.student_question}
            </p>
          )}

          {section.help_text && (
            <p className="text-sm leading-6 text-slate-400">
              {section.help_text}
            </p>
          )}
        </div>
      )}

      {isReadOnly && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-950/30 p-3 text-amber-100">
          <p className="text-sm">
            Cette fiche a été soumise ou verrouillée. Les sections sont désormais consultables en lecture seule.
          </p>
        </div>
      )}

      <div className={`mb-4 rounded-xl border p-3 ${statusClasses.box}`}>
        <p className="text-sm">{getStatusHelp(status)}</p>
      </div>

      <textarea
        value={content}
        onChange={(event) => {
          const nextContent = event.target.value;
          setContent(nextContent);
          setCharacterCount(nextContent.trim().length);
        }}
        disabled={isReadOnly}
        rows={8}
        className="min-h-40 w-full rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-900/80 disabled:text-slate-400 sm:text-base"
        placeholder="Rédige ta réponse ici..."
      />

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p
            className={`text-sm font-medium ${getSaveMessageClass(
              saveState,
              isReadOnly
            )}`}
          >
            {getSaveMessage(saveState, isReadOnly)}
          </p>

          {errorMessage && (
            <p className="mt-1 text-xs text-red-300">{errorMessage}</p>
          )}
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => saveSection(content)}
            disabled={saveState === "saving"}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveState === "saving" ? "Sauvegarde..." : "Sauvegarder maintenant"}
          </button>
        )}
      </div>
    </article>
  );
}
