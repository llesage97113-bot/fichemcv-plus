"use client";

import { FormEvent, useEffect, useState } from "react";

type McvOptionFormValue = "" | "A" | "B";

type ClassItem = {
  id: string;
  name: string | null;
  school_year: string | null;
  level: string | null;
  mcv_option: string | null;
  registration_code: string | null;
  is_registration_open: boolean | null;
  students_total?: number;
  students_pending?: number;
  students_validated?: number;
  students_rejected?: number;
};

export default function ClassRegistrationManager() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editedCode, setEditedCode] = useState("");
  const [editedOpen, setEditedOpen] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedInvitationClassId, setCopiedInvitationClassId] = useState<string | null>(null);
  const [expandedStatsClassId, setExpandedStatsClassId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newSchoolYear, setNewSchoolYear] = useState("2025-2026");
  const [newLevel, setNewLevel] = useState("");
  const [newMcvOption, setNewMcvOption] = useState<McvOptionFormValue>("");
  const [newCode, setNewCode] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const visibleMessage =
    message?.startsWith("Accès réservé") && message.includes("professeur")
      ? null
      : message;

  function getMcvOptionLabel(option: string | null) {
    if (option === "A") {
      return "Option A – Animation et gestion de l’espace commercial";
    }

    if (option === "B") {
      return "Option B – Prospection clientèle et valorisation de l’offre commerciale";
    }

    return "Option non renseignée";
  }

  function buildRegistrationCode(className: string, schoolYear: string) {
    const normalizedClass = className
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/g, "");

    const yearSuffix =
      schoolYear.match(/20\d{2}$/)?.[0]?.slice(-2) ??
      schoolYear.match(/20\d{2}/)?.[0]?.slice(-2) ??
      "26";

    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const randomSuffix = Array.from({ length: 4 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)]
    ).join("");

    return `${normalizedClass || "MCV"}${yearSuffix}-${randomSuffix}`;
  }

  function generateNewCode() {
    setNewCode(buildRegistrationCode(newName, newSchoolYear));
  }

  async function copyCode(code: string | null) {
    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setMessage(`Code copié : ${code}`);
      setIsError(false);

      window.setTimeout(() => {
        setCopiedCode((currentCode) => (currentCode === code ? null : currentCode));
      }, 2500);
    } catch {
      setMessage("Copie impossible depuis ce navigateur.");
      setIsError(true);
    }
  }

  function buildInvitationMessage(classItem: ClassItem) {
    const code = classItem.registration_code ?? "CODE_CLASSE";
    const inscriptionUrl = `${window.location.origin}/inscription-eleve?code=${encodeURIComponent(
      code
    )}`;

    return `Bonjour,

Pour créer ton compte FicheMCV+, clique sur ce lien :
${inscriptionUrl}

Le code classe est normalement déjà renseigné.
Code classe : ${code}

Après inscription, ton professeur devra valider ton compte.`;
  }

  async function copyInvitation(classItem: ClassItem) {
    if (!classItem.registration_code) {
      setMessage("Impossible de copier l’invitation : code classe manquant.");
      setIsError(true);
      return;
    }

    try {
      await navigator.clipboard.writeText(buildInvitationMessage(classItem));
      setCopiedInvitationClassId(classItem.id);
      setMessage(`Invitation copiée pour ${classItem.name ?? "la classe"}.`);
      setIsError(false);

      window.setTimeout(() => {
        setCopiedInvitationClassId((currentId) =>
          currentId === classItem.id ? null : currentId
        );
      }, 2500);
    } catch {
      setMessage("Copie de l’invitation impossible depuis ce navigateur.");
      setIsError(true);
    }
  }

  async function loadClasses({ resetMessage = true } = {}) {
    setIsLoading(true);

    if (resetMessage) {
      setMessage(null);
      setIsError(false);
    }

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
      await loadClasses({ resetMessage: false });
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

    if (newMcvOption !== "A" && newMcvOption !== "B") {
      setMessage("Choisis une option MCV valide avant de créer la classe.");
      setIsError(true);
      return;
    }

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
          mcvOption: newMcvOption,
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
      setNewMcvOption("");
      setNewCode("");

      await loadClasses({ resetMessage: false });
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
          onClick={() => loadClasses()}
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
                          classItem.mcv_option === "A"
                            ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                            : classItem.mcv_option === "B"
                              ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                              : "border-amber-500/40 bg-amber-500/10 text-amber-200"
                        }`}
                      >
                        {getMcvOptionLabel(classItem.mcv_option)}
                      </span>

                      {classItem.registration_code && (
                        <>
                          <button
                            type="button"
                            onClick={() => copyCode(classItem.registration_code)}
                            className={`rounded-full border px-3 py-1 transition ${
                              copiedCode === classItem.registration_code
                                ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                                : "border-slate-600 bg-slate-900/80 text-slate-200 hover:bg-slate-800"
                            }`}
                          >
                            {copiedCode === classItem.registration_code
                              ? "Code copié ✓"
                              : "Copier le code"}
                          </button>

                          <button
                            type="button"
                            onClick={() => copyInvitation(classItem)}
                            className={`rounded-full border px-3 py-1 transition ${
                              copiedInvitationClassId === classItem.id
                                ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                                : "border-sky-500/40 bg-sky-500/10 text-sky-200 hover:bg-sky-950/40"
                            }`}
                          >
                            {copiedInvitationClassId === classItem.id
                              ? "Invitation copiée ✓"
                              : "Copier l’invitation"}
                          </button>
                        </>
                      )}

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

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedStatsClassId((currentId) =>
                            currentId === classItem.id ? null : classItem.id
                          )
                        }
                        className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
                      >
                        {expandedStatsClassId === classItem.id
                          ? "Masquer les compteurs"
                          : "Afficher les compteurs"}
                      </button>

                      {expandedStatsClassId === classItem.id && (
                        <div className="mt-3 grid gap-2 text-xs font-medium sm:grid-cols-4">
                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-200">
                            <p className="uppercase tracking-wide opacity-80">
                              Validés
                            </p>
                            <p className="mt-1 text-lg font-bold">
                              {classItem.students_validated ?? 0}
                            </p>
                          </div>

                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-200">
                            <p className="uppercase tracking-wide opacity-80">
                              En attente
                            </p>
                            <p className="mt-1 text-lg font-bold">
                              {classItem.students_pending ?? 0}
                            </p>
                          </div>

                          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200">
                            <p className="uppercase tracking-wide opacity-80">
                              Refusés
                            </p>
                            <p className="mt-1 text-lg font-bold">
                              {classItem.students_rejected ?? 0}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-slate-200">
                            <p className="uppercase tracking-wide opacity-80">
                              Total
                            </p>
                            <p className="mt-1 text-lg font-bold">
                              {classItem.students_total ?? 0}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Réglages du code et des inscriptions
                      </p>

                      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
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
                          Inscriptions ouvertes
                        </label>

                        <button
                          type="button"
                          onClick={() => saveClass(classItem.id)}
                          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
                        >
                          Enregistrer les réglages
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingClassId(null)}
                          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditing(classItem)}
                      className="rounded-xl border border-sky-500/40 px-4 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-950/40"
                    >
                      Gérer le code / inscriptions
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

        <div className="grid gap-3 md:grid-cols-5">
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

          <label className="block">
            <span className="sr-only">Option MCV</span>
            <select
              required
              value={newMcvOption}
              onChange={(event) =>
                setNewMcvOption(event.target.value as McvOptionFormValue)
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
            >
              <option value="">Option MCV</option>
              <option value="A">
                Option A – Animation et gestion de l’espace commercial
              </option>
              <option value="B">
                Option B – Prospection clientèle et valorisation de l’offre commerciale
              </option>
            </select>
          </label>

          <div className="flex gap-2">
            <input
              required
              value={newCode}
              onChange={(event) => setNewCode(event.target.value)}
              placeholder="TMCVA26-8K3P"
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400"
            />

            <button
              type="button"
              onClick={generateNewCode}
              className="rounded-xl border border-sky-500/40 px-3 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-950/40"
            >
              Générer
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="mt-3 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
        >
          Créer la classe
        </button>
      </form>

      {visibleMessage && (
        <p
          className={`mt-3 text-sm ${
            isError ? "text-red-300" : "text-emerald-300"
          }`}
        >
          {visibleMessage}
        </p>
      )}
    </section>
  );
}
