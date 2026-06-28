"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type RegistrationSuccess = {
  email: string;
  loginIdentifier?: string;
  className: string;
  schoolYear: string;
  hasRecoveryEmail?: boolean;
  canRecoverWithEmail?: boolean;
  recoveryContactMessage?: string;
  message: string;
};

export default function StudentRegistrationPage() {
  const [registrationCode, setRegistrationCode] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return new URLSearchParams(window.location.search)
      .get("code")
      ?.toUpperCase() ?? "";
  });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [useEmailForRecovery, setUseEmailForRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState<RegistrationSuccess | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccess(null);

    try {
      const response = await fetch("/api/register-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registrationCode,
          firstName,
          lastName,
          personalEmail,
          useEmailForRecovery,
          password,
          confirmPassword,
        }),
      });

      const rawResponse = await response.text();
      let payload: {
        error?: string;
        email?: string;
        loginIdentifier?: string;
        className?: string;
        schoolYear?: string;
        hasRecoveryEmail?: boolean;
        canRecoverWithEmail?: boolean;
        recoveryContactMessage?: string;
        message?: string;
      } | null = null;

      try {
        payload = rawResponse ? JSON.parse(rawResponse) : null;
      } catch {
        throw new Error(
          rawResponse || "Réponse serveur illisible pendant l’inscription."
        );
      }

      if (!response.ok) {
        throw new Error(payload?.error ?? "Inscription impossible.");
      }

      if (!payload) {
        throw new Error("Réponse serveur vide pendant l’inscription.");
      }

      const successPayload = parseRegistrationSuccess(payload);
      setSuccess(successPayload);
      setRegistrationCode("");
      setFirstName("");
      setLastName("");
      setPersonalEmail("");
      setUseEmailForRecovery(false);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur inconnue."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-10">
      <section className="mx-auto flex min-h-[80vh] max-w-xl items-center">
        <div className="w-full rounded-2xl border border-sky-500/30 bg-slate-900/80 p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-wide text-sky-400">
              FicheMCV+
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">
              Inscription élève
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Renseigne le code donné par ton professeur pour créer ton compte.
              Ton inscription devra ensuite être validée.
            </p>
          </div>

          {success ? (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
              <p className="font-semibold text-emerald-200">
                Inscription enregistrée
              </p>
              <p className="mt-2 text-sm text-emerald-100/90">
                Identifiant :{" "}
                <span className="font-mono font-semibold">
                  {success.loginIdentifier ?? success.email}
                </span>
              </p>
              <p className="mt-1 text-xs text-emerald-100/80">
                La forme complète reste utilisable :{" "}
                <span className="font-mono">{success.email}</span>
              </p>
              <p className="mt-1 text-sm text-emerald-100/90">
                Classe : {success.className} — {success.schoolYear}
              </p>
              <p className="mt-3 text-sm text-emerald-100/80">
                {success.message}
              </p>
              <p className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-50">
                {success.recoveryContactMessage}
              </p>
              {!success.canRecoverWithEmail && (
                <p className="mt-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm leading-6 text-amber-50">
                  Sans adresse vérifiée autorisée pour la récupération, tu ne pourras
                  pas réinitialiser ton mot de passe de manière autonome. Tu devras
                  demander l’aide de ton professeur ou de l’administrateur.
                </p>
              )}

              <Link
                href="/login"
                className="mt-5 inline-flex rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                {success.hasRecoveryEmail
                  ? "Me connecter pour vérifier mon adresse"
                  : "Aller à la connexion"}
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">
                  Code d’inscription
                </label>
                <input
                  required
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  value={registrationCode}
                  onChange={(event) => setRegistrationCode(event.target.value.toUpperCase())}
                  placeholder="TMCVB-2026"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400"
                />

                {registrationCode && (
                  <p className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    Code classe renseigné :{" "}
                    <span className="font-mono font-semibold">
                      {registrationCode}
                    </span>
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-200">
                    Prénom
                  </label>
                  <input
                    required
                    autoCapitalize="words"
                    autoCorrect="off"
                    spellCheck={false}
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-200">
                    Nom
                  </label>
                  <input
                    required
                    autoCapitalize="words"
                    autoCorrect="off"
                    spellCheck={false}
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <label className="mb-1 block text-sm font-medium text-slate-200">
                  Adresse mail personnelle
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={personalEmail}
                  onChange={(event) => setPersonalEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400"
                  placeholder="adresse@example.fr"
                />
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Cette adresse permettra de recevoir les messages importants liés
                  à ton compte FicheMCV+ et de récupérer ton accès en cas d’oubli
                  du mot de passe. Elle ne sera pas utilisée comme identifiant de
                  connexion.
                </p>
                <p className="mt-2 text-sm leading-6 text-amber-100">
                  Sans adresse vérifiée, tu ne pourras pas réinitialiser ton mot de
                  passe de manière autonome. Tu devras demander l’aide de ton
                  professeur ou de l’administrateur.
                </p>
                <label className="mt-3 flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={useEmailForRecovery}
                    onChange={(event) => setUseEmailForRecovery(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950"
                  />
                  <span>Utiliser cette adresse pour récupérer mon compte</span>
                </label>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">
                  Mot de passe
                </label>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">
                  Confirmer le mot de passe
                </label>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
                />
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage.includes("Une inscription existe déjà") ? (
                    <div>
                      <p className="text-sm font-semibold text-red-100">
                        Tu as probablement déjà un compte.
                      </p>

                      <p className="mt-2 text-sm leading-6 text-red-100/80">
                        Ne refais pas une inscription. Si ton compte a été validé
                        par le professeur, va directement sur la page de connexion
                        avec ton identifiant et ton mot de passe.
                      </p>

                      <Link
                        href="/login"
                        className="mt-3 inline-flex rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
                      >
                        Aller à la connexion
                      </Link>
                    </div>
                  ) : (
                    <p className="font-semibold">{errorMessage}</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Inscription en cours..." : "Créer mon compte"}
              </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function parseRegistrationSuccess(payload: {
  email?: string;
  loginIdentifier?: string;
  className?: string;
  schoolYear?: string;
  hasRecoveryEmail?: boolean;
  canRecoverWithEmail?: boolean;
  recoveryContactMessage?: string;
  message?: string;
}): RegistrationSuccess {
  if (
    typeof payload.email !== "string" ||
    typeof payload.className !== "string" ||
    typeof payload.schoolYear !== "string" ||
    typeof payload.message !== "string"
  ) {
    throw new Error("Réponse serveur incomplète pendant l’inscription.");
  }

  return {
    email: payload.email,
    loginIdentifier: payload.loginIdentifier,
    className: payload.className,
    schoolYear: payload.schoolYear,
    hasRecoveryEmail: payload.hasRecoveryEmail,
    canRecoverWithEmail: payload.canRecoverWithEmail,
    recoveryContactMessage: payload.recoveryContactMessage,
    message: payload.message,
  };
}
