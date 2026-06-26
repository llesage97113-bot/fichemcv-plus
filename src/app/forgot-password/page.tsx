"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { normalizeEmail } from "@/lib/normalizers";
import { createClient } from "@/lib/supabase/client";
import {
  isValidEmail,
  PASSWORD_RECOVERY_NEUTRAL_MESSAGE,
} from "@/lib/auth/passwordRecovery";

function getPasswordRecoveryRedirectTo() {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000/reset-password";
  }

  return `${window.location.origin}/reset-password`;
}

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage("Adresse email invalide.");
      return;
    }

    setIsLoading(true);

    await supabase.auth
      .resetPasswordForEmail(normalizedEmail, {
        redirectTo: getPasswordRecoveryRedirectTo(),
      })
      .catch(() => null);

    setIsLoading(false);
    setMessage(PASSWORD_RECOVERY_NEUTRAL_MESSAGE);
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
              Saisis ton adresse email pour demander un lien de
              réinitialisation sécurisé.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-slate-200"
              >
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400"
                placeholder="exemple@domaine.fr"
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
