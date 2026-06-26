"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VerifyRecoveryEmailConfirmButtonProps = {
  token: string;
};

export default function VerifyRecoveryEmailConfirmButton({
  token,
}: VerifyRecoveryEmailConfirmButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleClick() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setMessage("");
    setErrorMessage("");

    const response = await fetch("/api/account/recovery-email/confirm-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      error?: string;
      redirectTo?: string;
    } | null;

    setIsLoading(false);

    if (!response.ok) {
      setErrorMessage(payload?.error || "Ce lien de vérification est invalide.");
      return;
    }

    setMessage(payload?.message || "Ton adresse email de récupération est maintenant vérifiée.");
    router.replace(payload?.redirectTo || "/verify-recovery-email/success");
  }

  return (
    <div className="mt-6 space-y-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
      >
        {isLoading ? "Vérification..." : "Vérifier cette adresse"}
      </button>

      {message && (
        <p className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
