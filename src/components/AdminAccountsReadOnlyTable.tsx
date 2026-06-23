"use client";

import { useMemo, useState } from "react";

export type AdminAccountRow = {
  id: string;
  source: "app_user" | "orphan_student" | "orphan_teacher";
  role: "student" | "teacher" | "other";
  roleLabel: string;
  firstName: string;
  lastName: string;
  identifier: string;
  isActive: boolean | null;
  accountType: "internal" | "real" | "missing";
  className: string;
  studentCode: string;
  candidateNumber: string;
  registrationStatus: string;
  profileStatus: "linked" | "missing" | "orphan" | "unknown";
  profileStatusLabel: string;
  searchableText: string;
};

type AdminAccountsReadOnlyTableProps = {
  accounts: AdminAccountRow[];
};

const roleOptions = [
  { value: "all", label: "Tous les rôles" },
  { value: "student", label: "Élèves" },
  { value: "teacher", label: "Professeurs" },
  { value: "other", label: "Autres" },
];

const activeOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Actifs" },
  { value: "inactive", label: "Inactifs" },
  { value: "missing", label: "Sans compte" },
];

const accountTypeOptions = [
  { value: "all", label: "Tous les identifiants" },
  { value: "internal", label: "Internes" },
  { value: "real", label: "Réels" },
  { value: "missing", label: "Manquants" },
];

const registrationOptions = [
  { value: "all", label: "Toutes les inscriptions" },
  { value: "pending", label: "En attente" },
  { value: "validated", label: "Validées" },
  { value: "rejected", label: "Refusées" },
  { value: "none", label: "Sans statut élève" },
];

function getActiveLabel(value: boolean | null) {
  if (value === null) {
    return "Sans compte";
  }

  return value ? "Actif" : "Inactif";
}

function getActiveClasses(value: boolean | null) {
  if (value === null) {
    return "border-slate-600 bg-slate-800/60 text-slate-300";
  }

  return value
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
    : "border-red-500/40 bg-red-500/10 text-red-200";
}

function getRegistrationLabel(value: string) {
  if (value === "pending") return "En attente";
  if (value === "validated") return "Validée";
  if (value === "rejected") return "Refusée";
  return "Non concerné";
}

function getRegistrationClasses(value: string) {
  if (value === "pending") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  }

  if (value === "validated") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }

  if (value === "rejected") {
    return "border-red-500/40 bg-red-500/10 text-red-200";
  }

  return "border-slate-700 bg-slate-900/80 text-slate-300";
}

function getAccountTypeLabel(value: AdminAccountRow["accountType"]) {
  if (value === "internal") return "Interne";
  if (value === "real") return "Réel";
  return "Manquant";
}

export default function AdminAccountsReadOnlyTable({
  accounts,
}: AdminAccountsReadOnlyTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [registrationFilter, setRegistrationFilter] = useState("all");

  const filteredAccounts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return accounts.filter((account) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        account.searchableText.includes(normalizedSearch);

      const matchesRole =
        roleFilter === "all" || account.role === roleFilter;

      const matchesActive =
        activeFilter === "all" ||
        (activeFilter === "active" && account.isActive === true) ||
        (activeFilter === "inactive" && account.isActive === false) ||
        (activeFilter === "missing" && account.isActive === null);

      const matchesAccountType =
        accountTypeFilter === "all" ||
        account.accountType === accountTypeFilter;

      const matchesRegistration =
        registrationFilter === "all" ||
        (registrationFilter === "none" && !account.registrationStatus) ||
        account.registrationStatus === registrationFilter;

      return (
        matchesSearch &&
        matchesRole &&
        matchesActive &&
        matchesAccountType &&
        matchesRegistration
      );
    });
  }, [
    accountTypeFilter,
    accounts,
    activeFilter,
    registrationFilter,
    roleFilter,
    search,
  ]);

  function resetFilters() {
    setSearch("");
    setRoleFilter("all");
    setActiveFilter("all");
    setAccountTypeFilter("all");
    setRegistrationFilter("all");
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-300">
            Lecture seule
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-100">
            Comptes utilisateurs
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Aucun changement de mot de passe, activation, suppression ou migration
            n’est disponible sur cette première version.
          </p>
        </div>

        <button
          type="button"
          onClick={resetFilters}
          className="w-fit rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
        >
          Réinitialiser les filtres
        </button>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Recherche
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nom, email, classe..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-purple-400"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Rôle
          </span>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-purple-400"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Statut compte
          </span>
          <select
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-purple-400"
          >
            {activeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Type identifiant
          </span>
          <select
            value={accountTypeFilter}
            onChange={(event) => setAccountTypeFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-purple-400"
          >
            {accountTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Inscription élève
          </span>
          <select
            value={registrationFilter}
            onChange={(event) => setRegistrationFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-purple-400"
          >
            {registrationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mb-3 text-sm text-slate-400">
        {filteredAccounts.length} compte(s) affiché(s) sur {accounts.length}.
      </p>

      {filteredAccounts.length === 0 ? (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
          <p className="font-semibold text-yellow-200">
            Aucun compte ne correspond aux filtres.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Identité</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Identifiant</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Profil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredAccounts.map((account) => (
                <tr key={account.id} className="bg-slate-900/40 align-top">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-100">
                      {`${account.firstName} ${account.lastName}`.trim() ||
                        "Nom non renseigné"}
                    </p>
                    {account.className && (
                      <p className="mt-1 text-xs text-slate-500">
                        {account.className}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-200">
                      {account.roleLabel}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <p className="font-mono text-xs text-slate-200">
                      {account.identifier || "Non renseigné"}
                    </p>
                    <span className="mt-2 inline-flex rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-300">
                      {getAccountTypeLabel(account.accountType)}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getActiveClasses(
                        account.isActive
                      )}`}
                    >
                      {getActiveLabel(account.isActive)}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-xs text-slate-300">
                    <div className="space-y-2">
                      <p>
                        Code :{" "}
                        <span className="font-mono text-slate-100">
                          {account.studentCode || "Non concerné"}
                        </span>
                      </p>
                      <p>
                        Candidat :{" "}
                        <span className="font-mono text-slate-100">
                          {account.candidateNumber || "Non renseigné"}
                        </span>
                      </p>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 font-semibold ${getRegistrationClasses(
                          account.registrationStatus
                        )}`}
                      >
                        {getRegistrationLabel(account.registrationStatus)}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                        account.profileStatus === "linked"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                          : account.profileStatus === "missing"
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                            : "border-red-500/40 bg-red-500/10 text-red-200"
                      }`}
                    >
                      {account.profileStatusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
