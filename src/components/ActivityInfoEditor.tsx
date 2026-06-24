"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type ActivityInfo = {
  company_name: string | null;
  pfmp_period: string | null;
  situation_date: string | null;
  student_role: string | null;
  realization_conditions: string | null;
};

type ActivityInfoEditorProps = {
  ficheId: string;
  studentId: string;
  initialInfo: ActivityInfo;
  isReadOnly: boolean;
};

const EDITABLE_STATUSES = ["brouillon", "a_corriger"];

function normalizeInfo(info: ActivityInfo): Record<keyof ActivityInfo, string> {
  return {
    company_name: info.company_name ?? "",
    pfmp_period: info.pfmp_period ?? "",
    situation_date: info.situation_date ?? "",
    student_role: info.student_role ?? "",
    realization_conditions: info.realization_conditions ?? "",
  };
}

function getSaveMessage(saveState: SaveState, isReadOnly: boolean) {
  if (isReadOnly) {
    return "Lecture seule : ces informations ne sont plus modifiables.";
  }

  if (saveState === "dirty") return "Modification en cours...";
  if (saveState === "saving") return "Sauvegarde automatique...";
  if (saveState === "saved") return "Sauvegardé automatiquement";
  if (saveState === "error") return "Erreur de sauvegarde";
  return "La sauvegarde automatique se déclenche après quelques secondes d'inactivité.";
}

function getSaveMessageClass(saveState: SaveState, isReadOnly: boolean) {
  if (isReadOnly) return "text-amber-300";
  if (saveState === "dirty") return "text-amber-300";
  if (saveState === "saving") return "text-sky-300";
  if (saveState === "saved") return "text-emerald-300";
  if (saveState === "error") return "text-red-300";
  return "text-slate-400";
}

export default function ActivityInfoEditor({
  ficheId,
  studentId,
  initialInfo,
  isReadOnly,
}: ActivityInfoEditorProps) {
  const router = useRouter();
  const [info, setInfo] = useState(normalizeInfo(initialInfo));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initialInfoRef = useRef(JSON.stringify(normalizeInfo(initialInfo)));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function saveInfo(nextInfo: Record<keyof ActivityInfo, string>) {
    if (isReadOnly) {
      setSaveState("error");
      setErrorMessage("Cette fiche est en lecture seule et ne peut plus être modifiée.");
      return;
    }

    setSaveState("saving");
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("fiches")
      .update({
        company_name: nextInfo.company_name,
        pfmp_period: nextInfo.pfmp_period,
        situation_date: nextInfo.situation_date,
        student_role: nextInfo.student_role,
        realization_conditions: nextInfo.realization_conditions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ficheId)
      .eq("student_id", studentId)
      .in("status", EDITABLE_STATUSES)
      .select(
        "company_name, pfmp_period, situation_date, student_role, realization_conditions"
      );

    if (error) {
      setSaveState("error");
      setErrorMessage(error.message);
      return;
    }

    if (!data || data.length === 0) {
      setSaveState("error");
      setErrorMessage("Aucune fiche modifiable n'a été trouvée pour cette sauvegarde.");
      return;
    }

    const normalized = normalizeInfo(data[0]);
    setInfo(normalized);
    initialInfoRef.current = JSON.stringify(normalized);
    setSaveState("saved");
    router.refresh();
  }

  useEffect(() => {
    if (isReadOnly) {
      return;
    }

    const serializedInfo = JSON.stringify(info);

    if (serializedInfo === initialInfoRef.current) {
      return;
    }

    setSaveState("dirty");

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveInfo(info);
    }, 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [info, isReadOnly]);

  return (
    <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {isReadOnly && (
              <span className="rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                Lecture seule
              </span>
            )}
          </div>
          <h2 className="text-lg font-semibold leading-snug text-slate-100 sm:text-xl">
            Informations sur l'activité
          </h2>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Organisation concernée
          </span>
          <input
            type="text"
            value={info.company_name}
            onChange={(event) =>
              setInfo((current) => ({
                ...current,
                company_name: event.target.value,
              }))
            }
            disabled={isReadOnly}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-900/80 disabled:text-slate-400"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Période de PFMP
          </span>
          <input
            type="text"
            value={info.pfmp_period}
            onChange={(event) =>
              setInfo((current) => ({
                ...current,
                pfmp_period: event.target.value,
              }))
            }
            disabled={isReadOnly}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-900/80 disabled:text-slate-400"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Date de la situation
          </span>
          <input
            type="text"
            value={info.situation_date}
            onChange={(event) =>
              setInfo((current) => ({
                ...current,
                situation_date: event.target.value,
              }))
            }
            disabled={isReadOnly}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-900/80 disabled:text-slate-400"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Place et rôle de l'élève
          </span>
          <textarea
            value={info.student_role}
            onChange={(event) =>
              setInfo((current) => ({
                ...current,
                student_role: event.target.value,
              }))
            }
            disabled={isReadOnly}
            rows={4}
            className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-900/80 disabled:text-slate-400"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-200">
            Conditions de réalisation
          </span>
          <textarea
            value={info.realization_conditions}
            onChange={(event) =>
              setInfo((current) => ({
                ...current,
                realization_conditions: event.target.value,
              }))
            }
            disabled={isReadOnly}
            rows={4}
            className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-900/80 disabled:text-slate-400"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={`text-sm font-medium ${getSaveMessageClass(saveState, isReadOnly)}`}>
            {getSaveMessage(saveState, isReadOnly)}
          </p>

          {errorMessage && (
            <p className="mt-1 text-xs text-red-300">{errorMessage}</p>
          )}
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => saveInfo(info)}
            disabled={saveState === "saving"}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveState === "saving" ? "Sauvegarde..." : "Sauvegarder maintenant"}
          </button>
        )}
      </div>
    </section>
  );
}
