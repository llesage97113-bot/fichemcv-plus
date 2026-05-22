"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

export default function SectionEditor({ section }: SectionEditorProps) {
  const [content, setContent] = useState(section.content ?? "");
  const [status, setStatus] = useState(section.completion_status);
  const [characterCount, setCharacterCount] = useState(
    section.character_count ?? 0
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const statusClasses = getStatusClasses(status);

  async function saveSection() {
    setSaving(true);
    setMessage(null);

    const { data, error } = await supabase.rpc(
      "prototype_update_section_content",
      {
        p_section_id: section.id,
        p_content: content,
      }
    );

    if (error) {
      setMessage(`Erreur : ${error.message}`);
      setSaving(false);
      return;
    }

    const updated = data?.[0];

    if (updated) {
      setStatus(updated.completion_status);
      setCharacterCount(updated.character_count);
      setMessage("Sauvegardé");
    }

    setSaving(false);
  }

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

      <div className={`mb-4 rounded-xl border p-3 ${statusClasses.box}`}>
        <p className="text-sm">{getStatusHelp(status)}</p>
      </div>

      <textarea
        value={content}
        onChange={(event) => {
          setContent(event.target.value);
          setCharacterCount(event.target.value.trim().length);
          setMessage(null);
        }}
        rows={8}
        className="min-h-40 w-full rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400 sm:text-base"
        placeholder="Rédige ta réponse ici..."
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">
          {message ??
            "Les modifications ne sont enregistrées qu’après clic sur Sauvegarder."}
        </p>

        <button
          type="button"
          onClick={saveSection}
          disabled={saving}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
      </div>
    </article>
  );
}
