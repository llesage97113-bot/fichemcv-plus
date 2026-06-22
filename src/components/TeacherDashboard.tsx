"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type FicheDashboardItem = {
  student_id: string;
  fiche_id: string;
  class_name: string | null;
  first_name: string | null;
  last_name: string | null;
  epreuve: string | null;
  numero_fiche: number | null;
  title: string | null;
  status: string | null;
  completion_score: number | null;
  quality_status: string | null;
  active_comments_count: number | null;
  updated_at?: string | null;
  submitted_at?: string | null;
  validated_at?: string | null;
  latest_analysis_status?: string | null;
  latest_analysis_created_at?: string | null;
};

type TeacherDashboardProps = {
  fiches: FicheDashboardItem[];
};

type StatusGroup = "all" | "to_process" | "waiting_student" | "finalized" | "drafts";

const TO_PROCESS_STATUSES = ["soumise", "corrigee"];
const WAITING_STUDENT_STATUSES = ["a_corriger"];
const FINALIZED_STATUSES = ["validee", "verrouillee", "archivee"];
const DRAFT_STATUSES = ["non_commencee", "brouillon"];

function normalizeClassName(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function getStudentName(fiche: FicheDashboardItem) {
  return `${fiche.first_name ?? ""} ${fiche.last_name ?? ""}`.trim() || "Élève sans nom";
}

function getLatestActivity(fiche: FicheDashboardItem) {
  return [fiche.updated_at, fiche.submitted_at, fiche.validated_at]
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
}

function formatActivityDate(value: string | null) {
  if (!value) {
    return "Aucune activité";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isInGroup(status: string | null | undefined, group: StatusGroup) {
  if (group === "all") return true;
  if (group === "to_process") return TO_PROCESS_STATUSES.includes(status ?? "");
  if (group === "waiting_student") return WAITING_STUDENT_STATUSES.includes(status ?? "");
  if (group === "finalized") return FINALIZED_STATUSES.includes(status ?? "");
  if (group === "drafts") return DRAFT_STATUSES.includes(status ?? "");
  return false;
}

function isStarted(fiche: FicheDashboardItem) {
  return (
    Number(fiche.completion_score ?? 0) > 0 ||
    !DRAFT_STATUSES.includes(fiche.status ?? "") ||
    Boolean(getLatestActivity(fiche))
  );
}

function getStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "non_commencee":
      return "Non commencée";
    case "brouillon":
      return "Brouillon";
    case "soumise":
      return "Soumise";
    case "a_corriger":
      return "À corriger par l’élève";
    case "corrigee":
      return "Corrigée";
    case "validee":
      return "Validée";
    case "verrouillee":
      return "Verrouillée";
    case "archivee":
      return "Archivée";
    default:
      return status ?? "Statut inconnu";
  }
}

function getStatusClasses(status: string | null | undefined) {
  if (TO_PROCESS_STATUSES.includes(status ?? "")) {
    return "border-red-500/40 bg-red-500/10 text-red-200";
  }

  if (WAITING_STUDENT_STATUSES.includes(status ?? "")) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }

  if (FINALIZED_STATUSES.includes(status ?? "")) {
    return "border-sky-500/40 bg-sky-500/10 text-sky-200";
  }

  return "border-slate-700 bg-slate-900/80 text-slate-300";
}

function getProgressClasses(score: number) {
  if (score >= 80) {
    return { text: "text-emerald-300", bar: "bg-emerald-400", track: "bg-slate-800" };
  }

  if (score >= 55) {
    return { text: "text-sky-300", bar: "bg-sky-400", track: "bg-slate-800" };
  }

  if (score > 0) {
    return { text: "text-amber-300", bar: "bg-amber-400", track: "bg-slate-800" };
  }

  return { text: "text-slate-400", bar: "bg-slate-500", track: "bg-slate-800" };
}

export default function TeacherDashboard({ fiches }: TeacherDashboardProps) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [epreuveFilter, setEpreuveFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusGroup>("all");

  const classes = useMemo(() => {
    return Array.from(
      new Set(fiches.map((fiche) => fiche.class_name).filter(Boolean))
    ).sort();
  }, [fiches]);

  const epreuves = useMemo(() => {
    return Array.from(
      new Set(fiches.map((fiche) => fiche.epreuve).filter(Boolean))
    ).sort();
  }, [fiches]);

  const dashboardStats = useMemo(() => {
    const studentSummaries = new Map<string, boolean>();

    for (const fiche of fiches) {
      const studentKey =
        fiche.student_id ||
        `${normalizeClassName(fiche.class_name)}-${fiche.last_name ?? ""}-${fiche.first_name ?? ""}`;
      studentSummaries.set(studentKey, (studentSummaries.get(studentKey) ?? false) || isStarted(fiche));
    }

    return {
      toProcess: fiches.filter((fiche) => TO_PROCESS_STATUSES.includes(fiche.status ?? "")).length,
      waitingStudent: fiches.filter((fiche) =>
        WAITING_STUDENT_STATUSES.includes(fiche.status ?? "")
      ).length,
      finalized: fiches.filter((fiche) => FINALIZED_STATUSES.includes(fiche.status ?? "")).length,
      inactiveStudents: Array.from(studentSummaries.values()).filter((hasActivity) => !hasActivity)
        .length,
    };
  }, [fiches]);

  const priorityFiches = useMemo(() => {
    return fiches
      .filter((fiche) => TO_PROCESS_STATUSES.includes(fiche.status ?? ""))
      .sort((a, b) => {
        const activityCompare =
          new Date(getLatestActivity(b) ?? 0).getTime() -
          new Date(getLatestActivity(a) ?? 0).getTime();

        if (activityCompare !== 0) return activityCompare;

        return getStudentName(a).localeCompare(getStudentName(b));
      });
  }, [fiches]);

  const filteredFiches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return fiches.filter((fiche) => {
      const searchableText = [
        fiche.first_name,
        fiche.last_name,
        fiche.title,
        fiche.epreuve,
        fiche.class_name,
        fiche.numero_fiche ? `fiche ${fiche.numero_fiche}` : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 || searchableText.includes(normalizedSearch);

      const matchesClass =
        classFilter === "all" ||
        normalizeClassName(fiche.class_name) === normalizeClassName(classFilter);

      const matchesEpreuve = epreuveFilter === "all" || fiche.epreuve === epreuveFilter;
      const matchesStatus = isInGroup(fiche.status, statusFilter);

      return matchesSearch && matchesClass && matchesEpreuve && matchesStatus;
    });
  }, [classFilter, epreuveFilter, fiches, search, statusFilter]);

  const classSummaries = useMemo(() => {
    const summaries = new Map<
      string,
      {
        className: string;
        total: number;
        toProcess: number;
        waitingStudent: number;
        finalized: number;
      }
    >();

    for (const fiche of filteredFiches) {
      const className = fiche.class_name ?? "Classe non renseignée";

      if (!summaries.has(className)) {
        summaries.set(className, {
          className,
          total: 0,
          toProcess: 0,
          waitingStudent: 0,
          finalized: 0,
        });
      }

      const summary = summaries.get(className);
      if (!summary) continue;

      summary.total += 1;
      if (TO_PROCESS_STATUSES.includes(fiche.status ?? "")) summary.toProcess += 1;
      if (WAITING_STUDENT_STATUSES.includes(fiche.status ?? "")) summary.waitingStudent += 1;
      if (FINALIZED_STATUSES.includes(fiche.status ?? "")) summary.finalized += 1;
    }

    return Array.from(summaries.values()).sort((a, b) =>
      a.className.localeCompare(b.className)
    );
  }, [filteredFiches]);

  const studentSummaries = useMemo(() => {
    const summaries = new Map<
      string,
      {
        key: string;
        firstName: string;
        lastName: string;
        className: string;
        total: number;
        started: number;
        toProcess: number;
        waitingStudent: number;
        finalized: number;
        latestActivityAt: string | null;
      }
    >();

    for (const fiche of filteredFiches) {
      const key =
        fiche.student_id ||
        `${fiche.class_name ?? "sans-classe"}-${fiche.last_name ?? ""}-${fiche.first_name ?? ""}`;

      if (!summaries.has(key)) {
        summaries.set(key, {
          key,
          firstName: fiche.first_name ?? "",
          lastName: fiche.last_name ?? "",
          className: fiche.class_name ?? "Classe non renseignée",
          total: 0,
          started: 0,
          toProcess: 0,
          waitingStudent: 0,
          finalized: 0,
          latestActivityAt: null,
        });
      }

      const summary = summaries.get(key);
      if (!summary) continue;

      const latestActivity = getLatestActivity(fiche);
      summary.total += 1;
      if (isStarted(fiche)) summary.started += 1;
      if (TO_PROCESS_STATUSES.includes(fiche.status ?? "")) summary.toProcess += 1;
      if (WAITING_STUDENT_STATUSES.includes(fiche.status ?? "")) summary.waitingStudent += 1;
      if (FINALIZED_STATUSES.includes(fiche.status ?? "")) summary.finalized += 1;

      if (
        latestActivity &&
        (!summary.latestActivityAt ||
          new Date(latestActivity).getTime() > new Date(summary.latestActivityAt).getTime())
      ) {
        summary.latestActivityAt = latestActivity;
      }
    }

    return Array.from(summaries.values()).sort((a, b) => {
      const classCompare = a.className.localeCompare(b.className);
      if (classCompare !== 0) return classCompare;

      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;

      return a.firstName.localeCompare(b.firstName);
    });
  }, [filteredFiches]);

  function resetFilters() {
    setSearch("");
    setClassFilter("all");
    setEpreuveFilter("all");
    setStatusFilter("all");
  }

  function focusClass(className: string) {
    setClassFilter(className === "Classe non renseignée" ? "all" : className);
    setSearch("");
  }

  function focusStudent(firstName: string, lastName: string, className: string) {
    setSearch(`${firstName} ${lastName}`.trim());
    setClassFilter(className === "Classe non renseignée" ? "all" : className);
  }

  return (
    <>
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-200">
            À traiter maintenant
          </p>
          <p className="mt-2 text-3xl font-bold text-red-100">{dashboardStats.toProcess}</p>
          <p className="mt-1 text-sm text-red-100/70">Soumises et corrigées.</p>
        </article>

        <article className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
            En attente élève
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-100">
            {dashboardStats.waitingStudent}
          </p>
          <p className="mt-1 text-sm text-emerald-100/70">Corrections demandées.</p>
        </article>

        <article className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">
            Finalisées
          </p>
          <p className="mt-2 text-3xl font-bold text-sky-100">{dashboardStats.finalized}</p>
          <p className="mt-1 text-sm text-sky-100/70">Validées, verrouillées, archivées.</p>
        </article>

        <article className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
            Élèves sans activité
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-100">
            {dashboardStats.inactiveStudents}
          </p>
          <p className="mt-1 text-sm text-amber-100/70">Aucune fiche démarrée.</p>
        </article>
      </section>

      <section className="mb-6 rounded-2xl border border-red-500/30 bg-slate-900/60 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">À traiter en priorité</h2>
            <p className="text-sm text-slate-400">
              {priorityFiches.length} fiche(s) soumise(s) ou corrigée(s).
            </p>
          </div>
        </div>

        {priorityFiches.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">Aucune fiche à traiter maintenant.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {priorityFiches.map((fiche) => (
              <article
                key={fiche.fiche_id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      {fiche.class_name ?? "Classe non renseignée"} · {getStudentName(fiche)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {fiche.epreuve ?? "Épreuve non renseignée"} · Fiche n°
                      {fiche.numero_fiche ?? "?"}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                      fiche.status
                    )}`}
                  >
                    {getStatusLabel(fiche.status)}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-400">
                    Dernière activité : {formatActivityDate(getLatestActivity(fiche))}
                  </p>

                  <Link
                    href={`/fiches/${fiche.fiche_id}`}
                    className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
                  >
                    Ouvrir la fiche
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        id="teacher-fiche-list"
        className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm"
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Filtres</h2>
            <p className="text-sm text-slate-400">
              {filteredFiches.length} fiche(s) affichée(s) sur {fiches.length}
            </p>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="w-fit rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Réinitialiser
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Recherche
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom, prénom, titre..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Classe
            </span>
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
            >
              <option value="all">Toutes les classes</option>
              {classes.map((className) => (
                <option key={className} value={className ?? ""}>
                  {className}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Épreuve
            </span>
            <select
              value={epreuveFilter}
              onChange={(event) => setEpreuveFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
            >
              <option value="all">Toutes les épreuves</option>
              {epreuves.map((epreuve) => (
                <option key={epreuve} value={epreuve ?? ""}>
                  {epreuve}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Statut regroupé
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusGroup)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
            >
              <option value="to_process">À traiter</option>
              <option value="waiting_student">En attente élève</option>
              <option value="finalized">Finalisées</option>
              <option value="drafts">Brouillons</option>
              <option value="all">Toutes</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-sky-500/30 bg-slate-900/60 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-100">Élèves et classes</h2>
          <p className="text-sm text-slate-400">
            Totaux simples calculés avec les filtres actifs.
          </p>
        </div>

        {classSummaries.length > 0 && (
          <div className="mb-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-200">Classes</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {classSummaries.map((summary) => (
                <button
                  key={summary.className}
                  type="button"
                  onClick={() => focusClass(summary.className)}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:border-sky-500/60"
                >
                  <p className="font-semibold text-slate-100">{summary.className}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <span>{summary.total} fiche(s)</span>
                    <span>{summary.toProcess} à traiter</span>
                    <span>{summary.waitingStudent} attente élève</span>
                    <span>{summary.finalized} finalisée(s)</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {studentSummaries.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">Aucun élève ne correspond aux filtres actifs.</p>
          </div>
        ) : (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-200">Élèves</h3>
            <div className="grid gap-3 lg:grid-cols-2">
              {studentSummaries.map((summary) => (
                <article
                  key={summary.key}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-100">
                        {`${summary.firstName} ${summary.lastName}`.trim() || "Élève sans nom"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {summary.className} · {summary.total} fiche(s)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        focusStudent(summary.firstName, summary.lastName, summary.className)
                      }
                      className="w-fit rounded-lg border border-sky-500/40 px-3 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-950/40"
                    >
                      Filtrer
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300 sm:grid-cols-4">
                    <span>{summary.started}/{summary.total} démarrée(s)</span>
                    <span>{summary.toProcess} à traiter</span>
                    <span>{summary.waitingStudent} attente élève</span>
                    <span>{summary.finalized} finalisée(s)</span>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Dernière activité : {formatActivityDate(summary.latestActivityAt)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {filteredFiches.length === 0 ? (
        <div className="rounded-lg border border-yellow-500 bg-yellow-950/40 p-4">
          <p className="font-semibold text-yellow-300">Aucune fiche ne correspond aux filtres</p>
          <p className="text-yellow-200">Modifie les critères ou réinitialise les filtres.</p>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-slate-100">Liste des fiches</h2>
          </div>

          <div className="space-y-4 md:hidden">
            {filteredFiches.map((fiche) => {
              const score = Number(fiche.completion_score ?? 0);
              const progress = getProgressClasses(score);

              return (
                <article
                  key={fiche.fiche_id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      {fiche.epreuve ?? "Épreuve"} · Fiche n°{fiche.numero_fiche ?? "?"}
                    </span>

                    <span className="text-xs text-slate-400">
                      {fiche.class_name ?? "Classe non renseignée"}
                    </span>
                  </div>

                  <h3 className="mb-2 text-lg font-semibold text-slate-100">
                    {fiche.title ?? "Fiche sans titre"}
                  </h3>

                  <p className="mb-3 text-sm text-slate-300">{getStudentName(fiche)}</p>

                  <span
                    className={`mb-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                      fiche.status
                    )}`}
                  >
                    {getStatusLabel(fiche.status)}
                  </span>

                  <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs uppercase tracking-wide text-slate-500">
                        Progression
                      </span>
                      <span className={`text-sm font-bold ${progress.text}`}>{score} %</span>
                    </div>

                    <div className={`h-3 overflow-hidden rounded-full ${progress.track}`}>
                      <div
                        className={`h-full rounded-full ${progress.bar}`}
                        style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-sm text-slate-400">
                    Dernière activité : {formatActivityDate(getLatestActivity(fiche))}
                  </p>

                  <Link
                    href={`/fiches/${fiche.fiche_id}`}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
                  >
                    Ouvrir la fiche
                  </Link>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-slate-800 md:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-900">
                <tr>
                  <th className="p-3 text-left">Classe</th>
                  <th className="p-3 text-left">Élève</th>
                  <th className="p-3 text-left">Épreuve / n°</th>
                  <th className="p-3 text-left">Titre</th>
                  <th className="p-3 text-left">Statut</th>
                  <th className="p-3 text-left">Progression</th>
                  <th className="p-3 text-left">Dernière activité</th>
                  <th className="p-3 text-left">Ouvrir</th>
                </tr>
              </thead>

              <tbody>
                {filteredFiches.map((fiche) => {
                  const score = Number(fiche.completion_score ?? 0);
                  const progress = getProgressClasses(score);

                  return (
                    <tr key={fiche.fiche_id} className="border-t border-slate-800">
                      <td className="p-3">{fiche.class_name ?? "Non renseignée"}</td>

                      <td className="p-3">{getStudentName(fiche)}</td>

                      <td className="p-3">
                        {fiche.epreuve ?? "Épreuve"} · n°{fiche.numero_fiche ?? "?"}
                      </td>

                      <td className="p-3">
                        <Link
                          href={`/fiches/${fiche.fiche_id}`}
                          className="font-medium text-sky-300 hover:text-sky-200 hover:underline"
                        >
                          {fiche.title ?? "Fiche sans titre"}
                        </Link>
                      </td>

                      <td className="p-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                            fiche.status
                          )}`}
                        >
                          {getStatusLabel(fiche.status)}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="min-w-32">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className={`font-bold ${progress.text}`}>{score} %</span>
                          </div>

                          <div className={`h-2 overflow-hidden rounded-full ${progress.track}`}>
                            <div
                              className={`h-full rounded-full ${progress.bar}`}
                              style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-slate-300">
                        {formatActivityDate(getLatestActivity(fiche))}
                      </td>

                      <td className="p-3">
                        <Link
                          href={`/fiches/${fiche.fiche_id}`}
                          className="inline-flex items-center justify-center rounded-lg border border-sky-500/40 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-950/40"
                        >
                          Ouvrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
