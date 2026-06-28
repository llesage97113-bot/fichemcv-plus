"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  compareRecoveryEmails,
  RECOVERY_EMAIL_GENERIC_ERROR_MESSAGE,
} from "@/lib/auth/recoveryEmail";

export default function RecoveryEmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const validation = compareRecoveryEmails(email, confirmEmail);

    if (!validation.ok) {
      setErrorMessage(validation.message);
      return;
    }

    setIsLoading(true);

    const response = await fetch("/api/account/recovery-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        confirmEmail,
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      error?: string;
    } | null;

    setIsLoading(false);

    if (!response.ok) {
      setErrorMessage(payload?.error || RECOVERY_EMAIL_GENERIC_ERROR_MESSAGE);
      return;
    }

    setEmail("");
    setConfirmEmail("");
    setMessage(payload?.message || "");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="recovery-email"
            className="mb-1 block text-sm font-medium text-slate-200"
          >
            Adresse email de récupération
          </label>
          <input
            id="recovery-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            placeholder="adresse@example.fr"
          />
        </div>

        <div>
          <label
            htmlFor="confirm-recovery-email"
            className="mb-1 block text-sm font-medium text-slate-200"
          >
            Confirmer l’adresse email
          </label>
          <input
            id="confirm-recovery-email"
            type="email"
            autoComplete="email"
            required
            value={confirmEmail}
            onChange={(event) => setConfirmEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            placeholder="adresse@example.fr"
          />
        </div>
      </div>

      <p className="text-sm leading-6 text-slate-400">
        Cette adresse permettra de recevoir les messages importants liés à ton
        compte FicheMCV+ et de récupérer ton accès en cas d’oubli du mot de
        passe. Elle ne sera pas utilisée comme identifiant de connexion.
      </p>

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
        {isLoading ? "Enregistrement..." : "Enregistrer l’adresse email"}
      </button>
    </form>
  );
}
