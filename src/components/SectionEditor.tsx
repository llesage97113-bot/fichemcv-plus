"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SectionEditorProps = {
  section: {
    id: string;
    section_title: string;
    content: string | null;
    completion_status: string;
    character_count: number;
  };
};

export default function SectionEditor({ section }: SectionEditorProps) {
  const [content, setContent] = useState(section.content ?? "");
  const [status, setStatus] = useState(section.completion_status);
  const [characterCount, setCharacterCount] = useState(section.character_count);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveSection() {
    setSaving(true);
    setMessage(null);

    const { data, error } = await supabase.rpc("prototype_update_section_content", {
      p_section_id: section.id,
      p_content: content,
    });

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
        <h2 className="text-lg font-semibold leading-snug text-slate-100 sm:text-xl">
          {section.section_title}
        </h2>

        <span className="w-fit rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
          {status} · {characterCount} caractères
        </span>
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
          {message ?? "Les modifications ne sont enregistrées qu’après clic sur Sauvegarder."}
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
