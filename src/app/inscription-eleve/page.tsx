"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function StudentRegistrationPage() {
  const [registrationCode, setRegistrationCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState<{
    email: string;
    className: string;
    schoolYear: string;
    message: string;
  } | null>(null);

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
          password,
          confirmPassword,
        }),
      });

      const rawResponse = await response.text();
      let payload: any = null;

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

      setSuccess(payload);
      setRegistrationCode("");
      setFirstName("");
      setLastName("");
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
                <span className="font-mono font-semibold">{success.email}</span>
              </p>
              <p className="mt-1 text-sm text-emerald-100/90">
                Classe : {success.className} — {success.schoolYear}
              </p>
              <p className="mt-3 text-sm text-emerald-100/80">
                {success.message}
              </p>

              <Link
                href="/login"
                className="mt-5 inline-flex rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Aller à la connexion
              </Link>
            </div>
          ) : (
            <>
              <section className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-amber-200">
                  Tu as déjà créé ton compte ?
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Ne refais pas une inscription. Si tu as déjà créé ton compte,
                  attends la validation du professeur puis connecte-toi directement.
                </p>
                <Link
                  href="/login"
                  className="mt-3 inline-flex rounded-xl border border-amber-500/40 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-950/40"
                >
                  Se connecter
                </Link>
              </section>

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
                  onChange={(event) => setRegistrationCode(event.target.value)}
                  placeholder="TMCVB-2026"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400"
                />
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
                  <p>{errorMessage}</p>

                  {errorMessage.includes("Une inscription existe déjà") && (
                    <div className="mt-3">
                      <p className="mb-2 text-red-100/80">
                        Si ton compte a déjà été créé et validé par le professeur,
                        utilise directement la page de connexion.
                      </p>

                      <Link
                        href="/login"
                        className="inline-flex rounded-xl border border-red-400/50 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-950/40"
                      >
                        Se connecter
                      </Link>
                    </div>
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
