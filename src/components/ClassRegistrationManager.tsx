"use client";

import { FormEvent, useEffect, useState } from "react";

type ClassItem = {
  id: string;
  name: string | null;
  school_year: string | null;
  level: string | null;
  registration_code: string | null;
  is_registration_open: boolean | null;
};

export default function ClassRegistrationManager() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editedCode, setEditedCode] = useState("");
  const [editedOpen, setEditedOpen] = useState(true);

  const [newName, setNewName] = useState("");
  const [newSchoolYear, setNewSchoolYear] = useState("2025-2026");
  const [newLevel, setNewLevel] = useState("");
  const [newCode, setNewCode] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function loadClasses() {
    setIsLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const response = await fetch("/api/admin/classes");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Chargement des classes impossible.");
      }

      setClasses(payload.classes ?? []);
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

  function startEditing(classItem: ClassItem) {
    setEditingClassId(classItem.id);
    setEditedCode(classItem.registration_code ?? "");
    setEditedOpen(Boolean(classItem.is_registration_open));
  }

  async function saveClass(classId: string) {
    setMessage(null);
    setIsError(false);

    try {
      const response = await fetch("/api/admin/classes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classId,
          registrationCode: editedCode,
          isRegistrationOpen: editedOpen,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Mise à jour impossible.");
      }

      setMessage(payload.message ?? "Classe mise à jour.");
      setIsError(false);
      setEditingClassId(null);
      await loadClasses();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erreur inconnue."
      );
      setIsError(true);
    }
  }

  async function createClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsError(false);

    try {
      const response = await fetch("/api/admin/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newName,
          schoolYear: newSchoolYear,
          level: newLevel,
          registrationCode: newCode,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Création impossible.");
      }

      setMessage(payload.message ?? "Classe créée.");
      setIsError(false);

      setNewName("");
      setNewLevel("");
      setNewCode("");

      await loadClasses();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erreur inconnue."
      );
      setIsError(true);
    }
  }

  useEffect(() => {
    loadClasses();
  }, []);

  return (
    <section className="mb-8 rounded-2xl border border-sky-500/30 bg-slate-900/60 p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Classes et codes d’inscription
          </h2>
          <p className="text-sm leading-6 text-slate-400">
            Gère les classes, les codes transmis aux élèves et l’ouverture des inscriptions.
          </p>
        </div>

        <button
          type="button"
          onClick={loadClasses}
          disabled={isLoading}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Actualiser
        </button>
      </div>

      {isLoading && (
        <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
          Chargement des classes…
        </p>
      )}

      {!isLoading && (
        <div className="space-y-3">
          {classes.map((classItem) => {
            const isEditing = editingClassId === classItem.id;

            return (
              <article
                key={classItem.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-100">
                      {classItem.name} — {classItem.school_year}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {classItem.level || "Niveau non renseigné"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                      <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-sky-200">
                        Code : {classItem.registration_code || "non défini"}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 ${
                          classItem.is_registration_open
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                            : "border-red-500/40 bg-red-500/10 text-red-200"
                        }`}
                      >
                        {classItem.is_registration_open
                          ? "Inscriptions ouvertes"
                          : "Inscriptions fermées"}
                      </span>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                      <input
                        value={editedCode}
                        onChange={(event) => setEditedCode(event.target.value)}
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
                      />

                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={editedOpen}
                          onChange={(event) => setEditedOpen(event.target.checked)}
                        />
                        Ouvert
                      </label>

                      <button
                        type="button"
                        onClick={() => saveClass(classItem.id)}
                        className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
                      >
                        Enregistrer
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditing(classItem)}
                      className="rounded-xl border border-sky-500/40 px-4 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-950/40"
                    >
                      Modifier
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <form
        onSubmit={createClass}
        className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
      >
        <h3 className="mb-3 text-sm font-semibold text-slate-100">
          Créer une nouvelle classe
        </h3>

        <div className="grid gap-3 md:grid-cols-4">
          <input
            required
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="TMCV-A"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400"
          />

          <input
            required
            value={newSchoolYear}
            onChange={(event) => setNewSchoolYear(event.target.value)}
            placeholder="2025-2026"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400"
          />

          <input
            value={newLevel}
            onChange={(event) => setNewLevel(event.target.value)}
            placeholder="Terminale Bac Pro MCV option A"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400"
          />

          <input
            required
            value={newCode}
            onChange={(event) => setNewCode(event.target.value)}
            placeholder="TMCVA-2026"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400"
          />
        </div>

        <button
          type="submit"
          className="mt-3 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
        >
          Créer la classe
        </button>
      </form>

      {message && (
        <p
          className={`mt-3 text-sm ${
            isError ? "text-red-300" : "text-emerald-300"
          }`}
        >
          {message}
        </p>
      )}
    </section>
  );
}
