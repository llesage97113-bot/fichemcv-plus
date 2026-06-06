"use client";

import { FormEvent, useState } from "react";

export default function StudentPasswordChangeForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (newPassword.length < 8) {
      setErrorMessage("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);

    const response = await fetch("/api/student/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newPassword }),
    });

    const payload = await response.json().catch(() => null);

    setIsLoading(false);

    if (!response.ok) {
      setErrorMessage(
        payload?.error ?? "Modification impossible pour le moment."
      );
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setMessage(payload?.message ?? "Mot de passe modifié avec succès.");
  }

  return (
    <section className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
          Sécurité du compte
        </p>

        <h2 className="mt-2 text-xl font-bold text-emerald-100">
          Changer mon mot de passe
        </h2>

        <p className="mt-2 text-sm leading-6 text-emerald-100/80">
          Si ton professeur t’a transmis un mot de passe provisoire, remplace-le
          ici par un mot de passe personnel.
        </p>

        <p className="mt-3 rounded-xl border border-emerald-400/40 bg-slate-950/50 px-4 py-3 text-sm font-medium text-emerald-100">
          Pense à copier ce mot de passe et à le conserver pour tes prochaines connexions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="new-password"
              className="mb-1 block text-sm font-medium text-slate-200"
            >
              Nouveau mot de passe
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400"
              placeholder="Au moins 8 caractères"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1 block text-sm font-medium text-slate-200"
            >
              Confirmer le mot de passe
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400"
              placeholder="Répète le mot de passe"
            />
          </div>
        </div>

        {errorMessage && (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </p>
        )}

        {message && (
          <p className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
        >
          {isLoading ? "Modification en cours..." : "Modifier mon mot de passe"}
        </button>
      </form>
    </section>
  );
}
