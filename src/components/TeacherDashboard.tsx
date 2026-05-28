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

function getPriorityActionLabel(statut: string) {
  switch (statut) {
    case "soumise":
      return "Action attendue : ouvrir la fiche pour demander une correction.";
    case "corrigee":
      return "Action attendue : ouvrir la fiche pour valider la fiche.";
    case "validee":
      return "Action attendue : ouvrir la fiche pour verrouiller la fiche.";
    case "verrouillee":
      return "Action attendue : ouvrir la fiche pour archiver la fiche.";
    default:
      return "Action attendue : consulter la fiche.";
  }
}

function getPriorityLabel(statut: string) {
  switch (statut) {
    case "soumise":
      return "À corriger";
    case "corrigee":
      return "À valider";
    case "validee":
      return "À verrouiller";
    case "verrouillee":
      return "À archiver";
    default:
      return statut;
  }
}

function getProgressClasses(score: number) {
  if (score >= 80) {
    return {
      text: "text-emerald-300",
      bar: "bg-emerald-400",
      track: "bg-slate-800",
    };
  }

  if (score >= 55) {
    return {
      text: "text-sky-300",
      bar: "bg-sky-400",
      track: "bg-slate-800",
    };
  }

  if (score > 0) {
    return {
      text: "text-amber-300",
      bar: "bg-amber-400",
      track: "bg-slate-800",
    };
  }

  return {
    text: "text-slate-400",
    bar: "bg-slate-500",
    track: "bg-slate-800",
  };
}

function getCompletionBucket(score: number) {
  if (score >= 80) return "avancee";
  if (score >= 55) return "intermediaire";
  if (score > 0) return "fragile";
  return "vide";
}

function formatActivityDate(value: string | null) {
  if (!value) {
    return "aucune activité";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isTeacherActionStatus(status: string | null | undefined) {
  return ["soumise", "corrigee", "validee", "verrouillee"].includes(status ?? "");
}

function normalizeClassName(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export default function TeacherDashboard({ fiches }: TeacherDashboardProps) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [epreuveFilter, setEpreuveFilter] = useState("all");
  const [numeroFicheFilter, setNumeroFicheFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [completionFilter, setCompletionFilter] = useState("all");
  const [isFicheDetailsOpen, setIsFicheDetailsOpen] = useState(false);
  const [isCockpitFiltersOpen, setIsCockpitFiltersOpen] = useState(false);
  const [studentActivityFilter, setStudentActivityFilter] = useState<
    "all" | "to_restart" | "active"
  >("all");
  const [isReminderMessageCopied, setIsReminderMessageCopied] = useState(false);
  const [isQuickPilotOpen, setIsQuickPilotOpen] = useState(false);
  const [isTeacherActionsOpen, setIsTeacherActionsOpen] = useState(false);
  const [isWorkflowSummaryOpen, setIsWorkflowSummaryOpen] = useState(false);
  const [resetPasswordMessage, setResetPasswordMessage] = useState("");
  const [resetPasswordError, setResetPasswordError] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [isTemporaryPasswordCopied, setIsTemporaryPasswordCopied] = useState(false);
  const [resetPasswordLoadingId, setResetPasswordLoadingId] = useState<string | null>(null);

  const classes = useMemo(() => {
    return Array.from(
      new Set(fiches.map((fiche) => fiche.class_name).filter(Boolean))
    ).sort();
  }, [fiches]);

  const statuses = useMemo(() => {
    return Array.from(
      new Set(fiches.map((fiche) => fiche.status).filter(Boolean))
    ).sort();
  }, [fiches]);

  const epreuves = useMemo(() => {
    return Array.from(
      new Set(fiches.map((fiche) => fiche.epreuve).filter(Boolean))
    ).sort();
  }, [fiches]);

  const ficheNumbers = useMemo(() => {
    return Array.from(
      new Set(
        fiches
          .map((fiche) => fiche.numero_fiche)
          .filter((numero): numero is number => typeof numero === "number")
      )
    ).sort((a, b) => a - b);
  }, [fiches]);
  const filteredFiches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return fiches.filter((fiche) => {
      const score = Number(fiche.completion_score ?? 0);

      const studentName = `${fiche.first_name ?? ""} ${
        fiche.last_name ?? ""
      }`.toLowerCase();

      const title = `${fiche.title ?? ""}`.toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        studentName.includes(normalizedSearch) ||
        title.includes(normalizedSearch);

      const matchesClass =
        classFilter === "all" ||
        normalizeClassName(fiche.class_name) === normalizeClassName(classFilter);

      const matchesEpreuve =
        epreuveFilter === "all" || fiche.epreuve === epreuveFilter;

      const matchesNumeroFiche =
        numeroFicheFilter === "all" ||
        String(fiche.numero_fiche) === numeroFicheFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "teacher_actions" && isTeacherActionStatus(fiche.status)) ||
        fiche.status === statusFilter;

      const matchesCompletion =
        completionFilter === "all" ||
        getCompletionBucket(score) === completionFilter;

      return (
        matchesSearch &&
        matchesClass &&
        matchesEpreuve &&
        matchesNumeroFiche &&
        matchesStatus &&
        matchesCompletion
      );
    });
  }, [
    fiches,
    search,
    classFilter,
    epreuveFilter,
    numeroFicheFilter,
    statusFilter,
    completionFilter,
  ]);

  const displayedClasses = useMemo(() => {
    return Array.from(
      new Set(filteredFiches.map((fiche) => fiche.class_name ?? "Classe non renseignée"))
    ).sort();
  }, [filteredFiches]);

  const dashboardStats = useMemo(() => {
    return {
      total: fiches.length,
      drafts: fiches.filter(
        (fiche) =>
          fiche.status === "non_commencee" || fiche.status === "brouillon"
      ).length,
      submitted: fiches.filter((fiche) => fiche.status === "soumise").length,
      correction: fiches.filter((fiche) => fiche.status === "a_corriger").length,
      final:
        fiches.filter(
          (fiche) =>
            fiche.status === "validee" ||
            fiche.status === "verrouillee" ||
            fiche.status === "archivee"
        ).length,
    };
  }, [fiches]);
  const priorityFiches = useMemo(() => {
    return filteredFiches.filter((fiche) =>
      isTeacherActionStatus(fiche.status)
    );
  }, [filteredFiches]);

  const priorityGroups = useMemo(() => {
    return [
      {
        status: "soumise",
        title: "À corriger",
        description: "Fiches soumises par les élèves, en attente d’une première lecture professeur.",
        items: priorityFiches.filter((fiche) => fiche.status === "soumise"),
      },
      {
        status: "corrigee",
        title: "À valider",
        description: "Fiches corrigées par les élèves, en attente de validation.",
        items: priorityFiches.filter((fiche) => fiche.status === "corrigee"),
      },
      {
        status: "validee",
        title: "À verrouiller",
        description: "Fiches validées, prêtes à être verrouillées.",
        items: priorityFiches.filter((fiche) => fiche.status === "validee"),
      },
      {
        status: "verrouillee",
        title: "À archiver",
        description: "Fiches verrouillées, prêtes pour l’archivage final.",
        items: priorityFiches.filter((fiche) => fiche.status === "verrouillee"),
      },
    ];
  }, [priorityFiches]);

  const studentSummaries = useMemo(() => {
    const summaries = new Map<
      string,
      {
        key: string;
        studentId: string;
        firstName: string;
        lastName: string;
        className: string;
        totalFiches: number;
        startedCount: number;
        notStartedCount: number;
        submittedCount: number;
        finalizedCount: number;
        latestActivityAt: string | null;
        e31Created: number;
        e31Engaged: number;
        e32Created: number;
        e32Engaged: number;
        fragileCount: number;
        professorActions: number;
        analysesToVerify: number;
      }
    >();

    for (const fiche of filteredFiches) {
      const key = `${fiche.class_name ?? "sans-classe"}-${fiche.last_name ?? ""}-${fiche.first_name ?? ""}`;

      if (!summaries.has(key)) {
        summaries.set(key, {
          key,
          studentId: fiche.student_id,
          firstName: fiche.first_name ?? "",
          lastName: fiche.last_name ?? "",
          className: fiche.class_name ?? "Classe non renseignée",
          totalFiches: 0,
          startedCount: 0,
          notStartedCount: 0,
          submittedCount: 0,
          finalizedCount: 0,
          latestActivityAt: null,
          e31Created: 0,
          e31Engaged: 0,
          e32Created: 0,
          e32Engaged: 0,
          fragileCount: 0,
          professorActions: 0,
          analysesToVerify: 0,
        });
      }

      const summary = summaries.get(key);
      if (!summary) {
        continue;
      }

      const score = Number(fiche.completion_score ?? 0);
      const isEngaged =
        score > 0 ||
        !["non_commencee", "brouillon"].includes(fiche.status ?? "");

      summary.totalFiches += 1;

      if (isEngaged) {
        summary.startedCount += 1;

        if (
          fiche.updated_at &&
          (!summary.latestActivityAt ||
            new Date(fiche.updated_at).getTime() >
              new Date(summary.latestActivityAt).getTime())
        ) {
          summary.latestActivityAt = fiche.updated_at;
        }
      } else {
        summary.notStartedCount += 1;
      }

      if (fiche.status === "soumise" || fiche.status === "corrigee") {
        summary.submittedCount += 1;
      }

      if (
        fiche.status === "validee" ||
        fiche.status === "verrouillee" ||
        fiche.status === "archivee"
      ) {
        summary.finalizedCount += 1;
      }

      if (fiche.epreuve === "E31") {
        summary.e31Created += 1;
        if (isEngaged) {
          summary.e31Engaged += 1;
        }
      }

      if (fiche.epreuve === "E32") {
        summary.e32Created += 1;
        if (isEngaged) {
          summary.e32Engaged += 1;
        }
      }

      if (getCompletionBucket(score) === "fragile") {
        summary.fragileCount += 1;
      }

      if (isTeacherActionStatus(fiche.status)) {
        summary.professorActions += 1;
      }

      if (fiche.latest_analysis_status === "a_verifier") {
        summary.analysesToVerify += 1;
      }
    }

    return Array.from(summaries.values()).sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) {
        return lastNameCompare;
      }

      return a.firstName.localeCompare(b.firstName);
    });
  }, [filteredFiches]);

  function resetFilters() {
    setSearch("");
    setClassFilter("all");
    setEpreuveFilter("all");
    setNumeroFicheFilter("all");
    setStatusFilter("all");
    setCompletionFilter("all");
  }

  function scrollToFicheResults() {
    window.setTimeout(() => {
      const firstFicheResult =
        document.getElementById("teacher-first-fiche-result") ??
        document.getElementById("teacher-fiche-list");

      firstFicheResult?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  function focusStudentFiches(firstName: string, lastName: string, className: string) {
    setSearch(`${firstName} ${lastName}`.trim());
    setClassFilter(className === "Classe non renseignée" ? "all" : className);
    setEpreuveFilter("all");
    setNumeroFicheFilter("all");
    setStatusFilter("all");
    setCompletionFilter("all");
    setIsFicheDetailsOpen(true);
    scrollToFicheResults();
  }

  function focusStudentTeacherActions(firstName: string, lastName: string, className: string) {
    setSearch(`${firstName} ${lastName}`.trim());
    setClassFilter(className === "Classe non renseignée" ? "all" : className);
    setEpreuveFilter("all");
    setNumeroFicheFilter("all");
    setStatusFilter("teacher_actions");
    setCompletionFilter("all");
    setIsFicheDetailsOpen(true);
    scrollToFicheResults();
  }

  async function copyReminderMessage() {
    const message = `Bonjour,

Tu as bien accès à FicheMCV+, mais aucune fiche n’a encore été commencée.

Connecte-toi à ton espace élève, ouvre une première fiche et complète au minimum le contexte, l’entreprise, la situation observée et les acteurs concernés.

Lien de connexion : https://fichemcv-plus.vercel.app/login`;

    try {
      await navigator.clipboard.writeText(message);
      setIsReminderMessageCopied(true);

      window.setTimeout(() => {
        setIsReminderMessageCopied(false);
      }, 2500);
    } catch {
      setIsReminderMessageCopied(false);
      window.alert("Copie impossible. Sélectionne le texte manuellement.");
    }
  }

  async function resetStudentPassword(studentId: string, studentName: string) {
    const confirmed = window.confirm(
      `Réinitialiser le mot de passe de ${studentName} ? Un mot de passe temporaire sera généré.`
    );

    if (!confirmed) {
      return;
    }

    setResetPasswordMessage("");
    setResetPasswordError("");
    setTemporaryPassword("");
    setIsTemporaryPasswordCopied(false);
    setResetPasswordLoadingId(studentId);

    try {
      const response = await fetch("/api/admin/students/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Réinitialisation impossible.");
      }

      const generatedTemporaryPassword = payload.temporaryPassword;

      setTemporaryPassword(generatedTemporaryPassword);
      setResetPasswordMessage(
        `Mot de passe temporaire généré pour ${studentName}. Copie-le maintenant et transmets-le à l’élève.`
      );
    } catch (error) {
      setResetPasswordError(
        error instanceof Error
          ? error.message
          : "Erreur inconnue pendant la réinitialisation."
      );
    } finally {
      setResetPasswordLoadingId(null);
    }
  }

  const visibleStudentSummaries = studentSummaries.filter((summary) => {
    if (studentActivityFilter === "to_restart") {
      return summary.startedCount === 0;
    }

    if (studentActivityFilter === "active") {
      return summary.startedCount > 0;
    }

    return true;
  });

  const sortedStudentSummaries = [...visibleStudentSummaries].sort((a, b) => {
    const lastNameCompare = a.lastName.localeCompare(b.lastName);

    if (lastNameCompare !== 0) {
      return lastNameCompare;
    }

    return a.firstName.localeCompare(b.firstName);
  });

  return (
    <>
      <section className="mb-4 rounded-2xl border border-sky-500/30 bg-slate-900/60 px-5 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-300">
              Pilotage rapide
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {filteredFiches.length} fiche(s) affichée(s) sur {fiches.length}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsQuickPilotOpen((current) => !current)}
            className="rounded-xl border border-sky-500/40 px-3 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-950/40"
          >
            {isQuickPilotOpen ? "Masquer le pilotage" : "Afficher le pilotage"}
          </button>
        </div>

        {isQuickPilotOpen && (
          <div className="mt-4 border-t border-slate-800 pt-4">
            <p className="mb-3 text-xs text-slate-500">
              Filtre classe : {classFilter === "all" ? "Toutes" : classFilter}
              {" · "}
              Classes affichées : {displayedClasses.join(", ") || "aucune"}
            </p>

            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-slate-300">
                Total : <span className="font-bold text-slate-100">{dashboardStats.total}</span>
              </span>

              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-amber-200">
                Brouillons : <span className="font-bold">{dashboardStats.drafts}</span>
              </span>

              <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-sky-200">
                Soumises : <span className="font-bold">{dashboardStats.submitted}</span>
              </span>

              <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-orange-200">
                À corriger : <span className="font-bold">{dashboardStats.correction}</span>
              </span>

              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                Finalisées : <span className="font-bold">{dashboardStats.final}</span>
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="mb-8 rounded-2xl border border-sky-500/30 bg-slate-900/60 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Cycle de traitement des fiches
            </h2>
            <p className="text-sm text-slate-400">
              Rappel du parcours complet d’une fiche, de sa rédaction jusqu’à son archivage.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsWorkflowSummaryOpen((current) => !current)}
            className="rounded-xl border border-sky-500/40 px-3 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-950/40"
          >
            {isWorkflowSummaryOpen ? "Masquer le cycle" : "Afficher le cycle"}
          </button>
        </div>

        {isWorkflowSummaryOpen && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-300">Brouillon</span>
              <span className="text-slate-500">→</span>
              <span className="rounded-full border border-sky-500/40 px-3 py-1 text-sky-300">Soumise</span>
              <span className="text-slate-500">→</span>
              <span className="rounded-full border border-amber-500/40 px-3 py-1 text-amber-300">À corriger</span>
              <span className="text-slate-500">→</span>
              <span className="rounded-full border border-indigo-500/40 px-3 py-1 text-indigo-300">Corrigée</span>
              <span className="text-slate-500">→</span>
              <span className="rounded-full border border-emerald-500/40 px-3 py-1 text-emerald-300">Validée</span>
              <span className="text-slate-500">→</span>
              <span className="rounded-full border border-purple-500/40 px-3 py-1 text-purple-300">Verrouillée</span>
              <span className="text-slate-500">→</span>
              <span className="rounded-full border border-slate-500 px-3 py-1 text-slate-300">Archivée</span>
            </div>

            <p className="mt-3 text-sm text-slate-400">
              Une fiche archivée reste complète, consultable en lecture seule et ne doit jamais apparaître vierge.
            </p>
          </div>
        )}
      </section>

<section className="mb-8 rounded-2xl border border-sky-500/30 bg-slate-900/60 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Actions professeur — {priorityFiches.length} fiche(s) à traiter
            </h2>
            <p className="text-sm text-slate-400">
              {priorityFiches.length > 0
                ? "Les fiches sont regroupées selon l’action attendue dans le workflow."
                : "Aucune action urgente actuellement : toutes les fiches sont à jour dans le workflow."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsTeacherActionsOpen((current) => !current)}
            className="rounded-xl border border-amber-500/40 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-950/30"
          >
            {isTeacherActionsOpen ? "Masquer le détail" : "Afficher le détail"}
          </button>
        </div>

        {isTeacherActionsOpen && (
          <div className="mt-4 flex flex-wrap gap-2">
            {priorityGroups.map((group) => (
              <span
                key={group.status}
                className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300"
              >
                {group.title} : {group.items.length}
              </span>
            ))}
          </div>
        )}

        {isTeacherActionsOpen && priorityFiches.length === 0 && (
          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-slate-950/60 p-4">
            <p className="text-sm font-medium text-emerald-100">
              ✅ Toutes les fiches sont à jour dans le workflow.
            </p>
          </div>
        )}

        {isTeacherActionsOpen && priorityFiches.length > 0 && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {priorityGroups.map((group) => (
              <div
                key={group.status}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-100">
                      {group.title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {group.description}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      group.items.length > 0
                        ? "bg-amber-400/15 text-amber-200"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {group.items.length}
                  </span>
                </div>

                {group.items.length === 0 && (
                  <p className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-500">
                    Aucune fiche.
                  </p>
                )}

                {group.items.length > 0 && (
                  <div className="space-y-3">
                    {group.items.map((fiche) => (
                      <Link
                        key={fiche.fiche_id}
                        href={`/fiches/${fiche.fiche_id}`}
                        className="block rounded-xl border border-slate-800 bg-slate-900/80 p-3 transition hover:border-amber-300/60 hover:bg-slate-900"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-100">
                              {fiche.first_name} {fiche.last_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {fiche.epreuve} · Fiche n°{fiche.numero_fiche}
                            </p>
                          </div>

                          <span className="rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                            {getPriorityLabel(fiche.status ?? "")}
                          </span>
                        </div>

                        <p className="text-sm text-slate-400">
                          Complétude : {fiche.completion_score ?? 0} %
                        </p>

                        <p className="mt-1 text-xs leading-5 text-amber-100/80">
                          {getPriorityActionLabel(fiche.status ?? "")}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
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
            <h2 className="text-lg font-semibold text-slate-100">
              Filtres du cockpit
            </h2>
            <p className="text-sm text-slate-400">
              {filteredFiches.length} fiche(s) affichée(s) sur {fiches.length}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsCockpitFiltersOpen((current) => !current)}
              className="rounded-lg border border-sky-500/40 px-4 py-2 text-sm font-medium text-sky-200 hover:bg-sky-950/40"
            >
              {isCockpitFiltersOpen ? "Masquer les filtres" : "Afficher les filtres"}
            </button>

            <button
              type="button"
              onClick={() => setIsFicheDetailsOpen((current) => !current)}
              className="rounded-lg border border-sky-500/40 px-4 py-2 text-sm font-medium text-sky-200 hover:bg-sky-950/40"
            >
              {isFicheDetailsOpen ? "Masquer le détail" : "Afficher le détail"}
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {isCockpitFiltersOpen && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Rechercher
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom, prénom ou titre"
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
              Numéro
            </span>
            <select
              value={numeroFicheFilter}
              onChange={(event) => setNumeroFicheFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
            >
              <option value="all">Toutes les fiches</option>
              {ficheNumbers.map((numero) => (
                <option key={numero} value={String(numero)}>
                  Fiche n°{numero}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Statut
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
            >
              <option value="all">Tous les statuts</option>
              <option value="teacher_actions">Actions prof</option>
              {statuses.map((status) => (
                <option key={status} value={status ?? ""}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Progression
            </span>
            <select
              value={completionFilter}
              onChange={(event) => setCompletionFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
            >
              <option value="all">Tous les niveaux</option>
              <option value="vide">Vide — 0 %</option>
              <option value="fragile">Fragile — 1 à 54 %</option>
              <option value="intermediaire">Intermédiaire — 55 à 79 %</option>
              <option value="avancee">Avancée — 80 % et plus</option>
            </select>
          </label>
          </div>
        )}

        {!isFicheDetailsOpen && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">
              Le détail fiche par fiche est masqué pour alléger le tableau de bord.
              Utilise “Afficher le détail” ou “Voir ses fiches” depuis une carte élève.
            </p>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-2xl border border-sky-500/30 bg-slate-900/60 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-100">
            Synthèse par élève
          </h2>
          <p className="text-sm text-slate-400">
            Vue rapide de l’avancement des fiches par élève, selon les filtres actifs.
          </p>
        </div>

        {(resetPasswordMessage || resetPasswordError) && (
          <div
            className={`mb-4 rounded-xl border p-4 text-sm ${
              resetPasswordError
                ? "border-red-500/40 bg-red-500/10 text-red-200"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            <p>{resetPasswordError || resetPasswordMessage}</p>

            {temporaryPassword && !resetPasswordError && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="rounded-lg border border-emerald-500/30 bg-slate-950 px-3 py-2 font-mono text-base text-emerald-100">
                  {temporaryPassword}
                </code>

                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(temporaryPassword);
                    setIsTemporaryPasswordCopied(true);

                    window.setTimeout(() => {
                      setIsTemporaryPasswordCopied(false);
                    }, 2000);
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    isTemporaryPasswordCopied
                      ? "border-emerald-300 bg-emerald-400/20 text-emerald-50"
                      : "border-emerald-500/40 text-emerald-100 hover:bg-emerald-950/40"
                  }`}
                >
                  {isTemporaryPasswordCopied
                    ? "Mot de passe copié ✓"
                    : "Copier le mot de passe"}
                </button>
              </div>
            )}
          </div>
        )}

        {studentSummaries.length > 0 && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
                Élèves à relancer
              </p>
              <p className="mt-2 text-3xl font-bold text-amber-100">
                {
                  studentSummaries.filter(
                    (summary) => summary.startedCount === 0
                  ).length
                }
              </p>
              <p className="mt-1 text-sm text-amber-100/70">
                Aucun travail commencé sur les fiches affichées.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
                Élèves actifs
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-100">
                {
                  studentSummaries.filter(
                    (summary) => summary.startedCount > 0
                  ).length
                }
              </p>
              <p className="mt-1 text-sm text-emerald-100/70">
                Au moins une fiche démarrée.
              </p>
            </div>
          </div>
        )}

        {studentSummaries.some((summary) => summary.startedCount === 0) && (
          <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
                  Message de relance rapide
                </p>
                <p className="mt-2 text-sm leading-6 text-amber-100/80">
                  Un message prêt à copier pour les élèves qui ont créé leur compte
                  mais n’ont encore commencé aucune fiche.
                </p>
              </div>

              <button
                type="button"
                onClick={copyReminderMessage}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  isReminderMessageCopied
                    ? "bg-emerald-500 text-white"
                    : "bg-amber-500 text-slate-950 hover:bg-amber-400"
                }`}
              >
                {isReminderMessageCopied ? "Message copié" : "Copier le message"}
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/30 bg-slate-950/50 p-4 text-sm leading-6 text-slate-200">
              <p>Bonjour,</p>
              <p className="mt-2">
                Tu as bien accès à FicheMCV+, mais aucune fiche n’a encore été commencée.
              </p>
              <p className="mt-2">
                Connecte-toi à ton espace élève, ouvre une première fiche et complète
                au minimum le contexte, l’entreprise, la situation observée et les
                acteurs concernés.
              </p>
              <p className="mt-2">
                Lien de connexion : https://fichemcv-plus.vercel.app/login
              </p>
            </div>
          </div>
        )}

        {studentSummaries.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStudentActivityFilter("all")}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                studentActivityFilter === "all"
                  ? "border-sky-400 bg-sky-500/20 text-sky-100"
                  : "border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Tous
            </button>

            <button
              type="button"
              onClick={() => setStudentActivityFilter("to_restart")}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                studentActivityFilter === "to_restart"
                  ? "border-amber-400 bg-amber-500/20 text-amber-100"
                  : "border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              À relancer
            </button>

            <button
              type="button"
              onClick={() => setStudentActivityFilter("active")}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                studentActivityFilter === "active"
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                  : "border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Actifs
            </button>
          </div>
        )}

        {studentSummaries.length > 0 && sortedStudentSummaries.length === 0 && (
          <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">
              Aucun élève ne correspond au filtre sélectionné.
            </p>
          </div>
        )}

        {studentSummaries.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">
              Aucun élève ne correspond aux filtres actifs.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {sortedStudentSummaries.map((summary) => (
              <article
                key={summary.key}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-100">
                      {summary.firstName} {summary.lastName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {summary.className} · {summary.totalFiches} fiche(s) affichée(s)
                    </p>

                    <div
                      className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
                        summary.startedCount > 0
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-200"
                      }`}
                    >
                      <p className="font-semibold">
                        Suivi terrain
                      </p>
                      <p className="mt-1 leading-5">
                        {summary.startedCount > 0
                          ? `${summary.startedCount} fiche(s) démarrée(s) · dernière activité le ${formatActivityDate(summary.latestActivityAt)}`
                          : "À relancer : aucune fiche commencée"}
                      </p>
                    </div>
                  </div>

                  {summary.professorActions > 0 ? (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
                      {summary.professorActions} action(s) prof
                    </span>
                  ) : (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                      À jour
                    </span>
                  )}
                </div>

                <div className="mb-3 flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-sky-200">
                    E31 : <span className="font-bold">{summary.e31Engaged}/3</span>
                  </span>

                  <span className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-indigo-200">
                    E32 : <span className="font-bold">{summary.e32Engaged}/4</span>
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 ${
                      summary.professorActions > 0
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    }`}
                  >
                    Actions prof : <span className="font-bold">{summary.professorActions}</span>
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 ${
                      summary.fragileCount > 0
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                        : "border-slate-700 bg-slate-900/70 text-slate-300"
                    }`}
                  >
                    Fragiles : <span className="font-bold">{summary.fragileCount}</span>
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 ${
                      summary.analysesToVerify > 0
                        ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
                        : "border-slate-700 bg-slate-900/70 text-slate-300"
                    }`}
                  >
                    Analyses : <span className="font-bold">{summary.analysesToVerify}</span>
                  </span>
                </div>

                <div className="mb-3 grid gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Démarrées
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-200">
                      {summary.startedCount}/{summary.totalFiches}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      À démarrer
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {summary.notStartedCount}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      À traiter
                    </p>
                    <p className="mt-1 text-sm font-semibold text-amber-200">
                      {summary.submittedCount}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Finalisées
                    </p>
                    <p className="mt-1 text-sm font-semibold text-sky-200">
                      {summary.finalizedCount}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Détail E31
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {summary.e31Engaged}/3 engagée(s)
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {summary.e31Created}/3 créée(s)
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Détail E32
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {summary.e32Engaged}/4 engagée(s)
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {summary.e32Created}/4 créée(s)
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  {summary.fragileCount > 0 ? (
                    <p className="text-xs text-amber-200">
                      ⚠️ {summary.fragileCount} fiche(s) fragile(s) à surveiller.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Aucun signal fragile sur les fiches affichées.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        focusStudentFiches(
                          summary.firstName,
                          summary.lastName,
                          summary.className
                        )
                      }
                      className="rounded-xl border border-sky-500/40 px-3 py-2 text-xs font-medium text-sky-200 transition hover:bg-sky-950/40"
                    >
                      Voir ses fiches
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        focusStudentTeacherActions(
                          summary.firstName,
                          summary.lastName,
                          summary.className
                        )
                      }
                      disabled={summary.professorActions === 0}
                      className="rounded-xl border border-amber-500/40 px-3 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-950/30 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Voir à traiter
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        resetStudentPassword(
                          summary.studentId,
                          `${summary.firstName} ${summary.lastName}`.trim()
                        )
                      }
                      disabled={resetPasswordLoadingId === summary.studentId}
                      className="rounded-xl border border-amber-500/40 px-3 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-950/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {resetPasswordLoadingId === summary.studentId
                        ? "Réinitialisation..."
                        : "Réinitialiser MDP"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>



      {isFicheDetailsOpen && filteredFiches.length === 0 && (
        <div className="rounded-lg border border-yellow-500 bg-yellow-950/40 p-4">
          <p className="font-semibold text-yellow-300">
            Aucune fiche ne correspond aux filtres
          </p>
          <p className="text-yellow-200">
            Modifie les critères ou réinitialise les filtres.
          </p>
        </div>
      )}

      {isFicheDetailsOpen && filteredFiches.length > 0 && (
        <div id="teacher-first-fiche-result" className="scroll-mt-6" />
      )}

      {isFicheDetailsOpen && filteredFiches.length > 0 && (
        <>
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
                      {fiche.epreuve} · Fiche n°{fiche.numero_fiche}
                    </span>

                    <span className="text-xs text-slate-400">
                      {fiche.class_name}
                    </span>
                  </div>

                  <h2 className="mb-2 text-lg font-semibold">
                    <Link
                      href={`/fiches/${fiche.fiche_id}`}
                      className="text-sky-300 hover:text-sky-200 hover:underline"
                    >
                      {fiche.title}
                    </Link>
                  </h2>

                  <p className="mb-4 text-sm text-slate-300">
                    {fiche.first_name} {fiche.last_name}
                  </p>

                  <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs uppercase tracking-wide text-slate-500">
                        Progression
                      </span>

                      <span className={`text-sm font-bold ${progress.text}`}>
                        {score} %
                      </span>
                    </div>

                    <div
                      className={`h-3 overflow-hidden rounded-full ${progress.track}`}
                    >
                      <div
                        className={`h-full rounded-full ${progress.bar}`}
                        style={{
                          width: `${Math.min(Math.max(score, 0), 100)}%`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      Statut qualité :{" "}
                      <span className={progress.text}>
                        {fiche.quality_status ?? "non évalué"}
                      </span>
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-300">
                    <p>
                      <span className="text-slate-500">Statut :</span>{" "}
                      {fiche.status}
                    </p>

                    <p>
                      <span className="text-slate-500">Commentaires :</span>{" "}
                      {fiche.active_comments_count}
                    </p>
                  </div>

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
                  <th className="p-3 text-left">Épreuve</th>
                  <th className="p-3 text-left">Fiche</th>
                  <th className="p-3 text-left">Statut</th>
                  <th className="p-3 text-left">Progression</th>
                  <th className="p-3 text-left">Commentaires</th>
                </tr>
              </thead>

              <tbody>
                {filteredFiches.map((fiche) => {
                  const score = Number(fiche.completion_score ?? 0);
                  const progress = getProgressClasses(score);

                  return (
                    <tr
                      key={fiche.fiche_id}
                      className="border-t border-slate-800"
                    >
                      <td className="p-3">{fiche.class_name}</td>

                      <td className="p-3">
                        {fiche.first_name} {fiche.last_name}
                      </td>

                      <td className="p-3">{fiche.epreuve}</td>

                      <td className="p-3">
                        <Link
                          href={`/fiches/${fiche.fiche_id}`}
                          className="font-medium text-sky-300 hover:text-sky-200 hover:underline"
                        >
                          {fiche.title}
                        </Link>
                        <div className="text-slate-500">
                          Fiche n°{fiche.numero_fiche}
                        </div>
                      </td>

                      <td className="p-3">{fiche.status}</td>

                      <td className="p-3">
                        <div className="min-w-36">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className={`font-bold ${progress.text}`}>
                              {score} %
                            </span>
                            <span className="text-xs text-slate-500">
                              {fiche.quality_status}
                            </span>
                          </div>

                          <div
                            className={`h-2 overflow-hidden rounded-full ${progress.track}`}
                          >
                            <div
                              className={`h-full rounded-full ${progress.bar}`}
                              style={{
                                width: `${Math.min(Math.max(score, 0), 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="p-3">{fiche.active_comments_count}</td>
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

