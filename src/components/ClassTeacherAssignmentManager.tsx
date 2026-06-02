"use client";

import { FormEvent, useEffect, useState } from "react";

type TeacherAccount = {
  id: string;
  email: string | null;
  is_active: boolean | null;
};

type ClassItem = {
  id: string;
  name: string | null;
  school_year: string | null;
  level: string | null;
};

type Assignment = {
  id: string;
  role_in_class: string | null;
  classes?: ClassItem | ClassItem[] | null;
  teachers?:
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        role_label: string | null;
      }
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        role_label: string | null;
      }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default function ClassTeacherAssignmentManager() {
  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [roleInClass, setRoleInClass] = useState("professeur référent");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function loadData() {
    setIsLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const response = await fetch("/api/admin/class-teachers");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Chargement des rattachements impossible.");
      }

      setTeachers(payload.teachers ?? []);
      setClasses(payload.classes ?? []);
      setAssignments(payload.assignments ?? []);
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

  async function createAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setIsError(false);

    try {
      const response = await fetch("/api/admin/class-teachers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appUserId: selectedTeacherId,
          classId: selectedClassId,
          roleInClass,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Rattachement impossible.");
      }

      setMessage(payload.message ?? "Professeur rattaché à la classe.");
      setIsError(false);
      setSelectedTeacherId("");
      setSelectedClassId("");
      setRoleInClass("professeur référent");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur inconnue.");
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteAssignment(assignment: Assignment) {
    const teacher = firstRelation(assignment.teachers);
    const classItem = firstRelation(assignment.classes);

    const confirmed = window.confirm(
      `Supprimer le rattachement entre ${teacher?.email ?? "ce professeur"} et ${
        classItem?.name ?? "cette classe"
      } ?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingAssignmentId(assignment.id);
    setMessage(null);
    setIsError(false);

    try {
      const response = await fetch("/api/admin/class-teachers", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentId: assignment.id,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Suppression impossible.");
      }

      setMessage(payload.message ?? "Rattachement supprimé.");
      setIsError(false);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur inconnue.");
      setIsError(true);
    } finally {
      setDeletingAssignmentId(null);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <section className="mb-6 rounded-2xl border border-purple-500/30 bg-slate-900/60 p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-300">
            Rattachements professeurs / classes
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-100">
            Affecter les professeurs aux classes
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Définis quelles classes sont suivies par chaque professeur. Ce réglage préparera le filtrage futur de l’espace professeur.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Actualiser
        </button>
      </div>

      <form
        onSubmit={createAssignment}
        className="mb-5 grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 lg:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <select
          required
          value={selectedTeacherId}
          onChange={(event) => setSelectedTeacherId(event.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-purple-400"
        >
          <option value="">Choisir un professeur</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.email} {teacher.is_active ? "" : "(inactif)"}
            </option>
          ))}
        </select>

        <select
          required
          value={selectedClassId}
          onChange={(event) => setSelectedClassId(event.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-purple-400"
        >
          <option value="">Choisir une classe</option>
          {classes.map((classItem) => (
            <option key={classItem.id} value={classItem.id}>
              {classItem.name} — {classItem.school_year}
            </option>
          ))}
        </select>

        <input
          value={roleInClass}
          onChange={(event) => setRoleInClass(event.target.value)}
          placeholder="professeur référent"
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-purple-400"
        />

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Ajout..." : "Rattacher"}
        </button>
      </form>

      {isLoading ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
          Chargement des rattachements…
        </p>
      ) : assignments.length === 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Aucun rattachement professeur / classe pour le moment.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Professeur</th>
                <th className="px-4 py-3">Classe</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {assignments.map((assignment) => {
                const teacher = firstRelation(assignment.teachers);
                const classItem = firstRelation(assignment.classes);

                return (
                  <tr key={assignment.id} className="bg-slate-900/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-100">
                        {teacher?.first_name} {teacher?.last_name}
                      </p>
                      <p className="font-mono text-xs text-slate-400">
                        {teacher?.email ?? "email inconnu"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-100">
                        {classItem?.name ?? "Classe inconnue"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {classItem?.school_year ?? "année inconnue"}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {assignment.role_in_class ?? "professeur référent"}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => deleteAssignment(assignment)}
                        disabled={deletingAssignmentId === assignment.id}
                        className="rounded-xl border border-red-400/50 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingAssignmentId === assignment.id
                          ? "Suppression..."
                          : "Retirer"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {message && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            isError
              ? "border-red-500/40 bg-red-500/10 text-red-100"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
          }`}
        >
          {message}
        </div>
      )}
    </section>
  );
}
