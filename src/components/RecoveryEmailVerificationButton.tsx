"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SEND_ERROR_MESSAGE =
  "Le mail de vérification n’a pas pu être envoyé pour le moment.";

type RecoveryEmailVerificationButtonProps = {
  contactId: string;
  isVerified: boolean;
};

export default function RecoveryEmailVerificationButton({
  contactId,
  isVerified,
}: RecoveryEmailVerificationButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  if (isVerified) {
    return null;
  }

  async function handleClick() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setMessage("");
    setErrorMessage("");

    const response = await fetch("/api/account/recovery-email/send-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      error?: string;
    } | null;

    setIsLoading(false);

    if (!response.ok) {
      setErrorMessage(payload?.error || SEND_ERROR_MESSAGE);
      return;
    }

    setHasSent(true);
    setMessage(payload?.message || "Un mail de vérification a été envoyé. Consulte ta boîte de réception.");
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center rounded-lg border border-sky-500/50 px-3 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
      >
        {isLoading
          ? "Envoi..."
          : hasSent
            ? "Renvoyer le lien de vérification"
            : "Envoyer le lien de vérification"}
      </button>

      {message && (
        <p className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
