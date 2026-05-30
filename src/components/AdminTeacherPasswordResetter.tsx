"use client";

import { useState } from "react";

export default function AdminTeacherPasswordResetter() {
  const [email, setEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");
    setTemporaryPassword("");
    setTeacherEmail("");
    setIsCopied(false);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/teachers/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Réinitialisation impossible.");
      }

      setMessage(payload.message ?? "Mot de passe professeur réinitialisé.");
      setTeacherEmail(payload.teacher?.email ?? email);
      setTemporaryPassword(payload.temporaryPassword ?? "");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur inconnue pendant la réinitialisation."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyAccess() {
    const content = `Bonjour,

Ton mot de passe professeur FicheMCV+ a été réinitialisé.

Identifiant : ${teacherEmail}
Mot de passe provisoire : ${temporaryPassword}
Lien de connexion : https://fichemcv-plus.vercel.app/login`;

    await navigator.clipboard.writeText(content);
    setIsCopied(true);

    window.setTimeout(() => {
      setIsCopied(false);
    }, 2500);
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-purple-300">
          Accès professeurs
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-100">
          Réinitialiser un mot de passe professeur
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Génère un mot de passe provisoire pour un professeur déjà existant.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="teacher-reset-email"
            className="mb-1 block text-sm font-medium text-slate-200"
          >
            Email professeur
          </label>
          <input
            id="teacher-reset-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="jd.lacascade@gmail.com"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-purple-400"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl border border-purple-500/50 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-950/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Réinitialisation..." : "Réinitialiser le MDP"}
        </button>
      </form>

      {(message || errorMessage) && (
        <div
          className={`mt-4 rounded-xl border p-4 text-sm ${
            errorMessage
              ? "border-red-500/40 bg-red-500/10 text-red-200"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          <p>{errorMessage || message}</p>

          {temporaryPassword && !errorMessage && (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-emerald-500/30 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-emerald-300">
                  Nouveaux accès professeur
                </p>

                <p className="mt-2 text-sm text-slate-200">
                  Identifiant :{" "}
                  <span className="font-mono text-emerald-100">
                    {teacherEmail}
                  </span>
                </p>

                <p className="mt-1 text-sm text-slate-200">
                  Mot de passe provisoire :{" "}
                  <span className="font-mono text-emerald-100">
                    {temporaryPassword}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={copyAccess}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  isCopied
                    ? "border-emerald-300 bg-emerald-400/20 text-emerald-50"
                    : "border-emerald-500/40 text-emerald-100 hover:bg-emerald-950/40"
                }`}
              >
                {isCopied ? "Accès copiés ✓" : "Copier les accès complets"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
