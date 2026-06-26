"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PasswordChangeFormProps = {
  description?: string;
};

const GENERIC_ERROR_MESSAGE = "Modification impossible pour le moment.";
const PASSWORD_MIN_LENGTH = 8;

export default function PasswordChangeForm({
  description = "Choisis un mot de passe personnel d’au moins huit caractères. La session reste ouverte après modification.",
}: PasswordChangeFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (!newPassword || !confirmPassword) {
      setErrorMessage("Le nouveau mot de passe et sa confirmation sont obligatoires.");
      return;
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setErrorMessage("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(GENERIC_ERROR_MESSAGE);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setMessage("Ton mot de passe a été modifié.");
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-300">
          Sécurité
        </p>

        <h2 className="mt-2 text-xl font-bold text-slate-100">
          Changer mon mot de passe
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          {description}
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
              minLength={PASSWORD_MIN_LENGTH}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400"
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
              minLength={PASSWORD_MIN_LENGTH}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400"
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
          className="inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
        >
          {isLoading ? "Modification en cours..." : "Modifier mon mot de passe"}
        </button>
      </form>
    </section>
  );
}
