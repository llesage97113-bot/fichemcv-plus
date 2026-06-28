"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  isValidEmail,
  PASSWORD_RESET_REQUEST_PUBLIC_MESSAGE,
} from "@/lib/auth/passwordRecovery";
import { normalizeLoginIdentifier } from "@/lib/auth/loginIdentifier";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const normalizedIdentifier = normalizeLoginIdentifier(identifier);

    if (!isValidEmail(normalizedIdentifier)) {
      setErrorMessage("Identifiant invalide.");
      return;
    }

    setIsLoading(true);

    const response = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: normalizedIdentifier,
      }),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as {
      message?: string;
    } | null;

    setIsLoading(false);
    setMessage(payload?.message || PASSWORD_RESET_REQUEST_PUBLIC_MESSAGE);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-10">
      <section className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-wide text-sky-400">
              FicheMCV+
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">
              Mot de passe perdu ?
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Saisis ton identifiant de connexion pour demander un lien de
              réinitialisation sécurisé.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-slate-200"
              >
                Identifiant de connexion
              </label>
              <input
                id="email"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400"
                placeholder="lea4827 ou prenom.nom@fichemcv.local"
              />
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
              className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading
                ? "Envoi en cours..."
                : "Envoyer le lien de réinitialisation"}
            </button>
          </form>

          <Link
            href="/login"
            className="mt-5 inline-flex text-sm font-medium text-sky-300 transition hover:text-sky-200"
          >
            Retour à la connexion
          </Link>
        </div>
      </section>
    </main>
  );
}
