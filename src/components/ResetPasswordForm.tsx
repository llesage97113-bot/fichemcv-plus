"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RECOVERY_SUCCESS_MESSAGE,
  validateNewPassword,
} from "@/lib/auth/passwordRecovery";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

type CustomTokenStatus = "none" | "valid" | "invalid" | "expired" | "consumed";
type RecoveryState =
  | "initializing"
  | "ready"
  | "custom-ready"
  | "invalid"
  | "success";

const INVALID_RECOVERY_LINK_MESSAGE =
  "Ce lien de réinitialisation est invalide ou a expiré.";
const EXPIRED_CUSTOM_LINK_MESSAGE = "Ce lien de réinitialisation a expiré.";
const CONSUMED_CUSTOM_LINK_MESSAGE =
  "Ce lien de réinitialisation a déjà été utilisé.";

function getFragmentParams() {
  if (typeof window === "undefined" || !window.location.hash) {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.hash.slice(1));
}

function hasExpiredRecoveryFragment(params: URLSearchParams) {
  return (
    params.get("error") === "access_denied" &&
    params.get("error_code") === "otp_expired"
  );
}

function hasRecoveryErrorFragment(params: URLSearchParams) {
  return Boolean(params.get("error"));
}

function hasRecoverySessionFragment(params: URLSearchParams) {
  return (
    params.get("type") === "recovery" &&
    Boolean(params.get("access_token")) &&
    Boolean(params.get("refresh_token"))
  );
}

function cleanSensitiveFragment() {
  if (typeof window === "undefined" || !window.location.hash) {
    return;
  }

  window.history.replaceState(
    window.history.state,
    document.title,
    `${window.location.pathname}${window.location.search}`
  );
}

type ResetPasswordFormProps = {
  customToken?: string;
  customTokenStatus?: CustomTokenStatus;
};

export default function ResetPasswordForm({
  customToken = "",
  customTokenStatus = "none",
}: ResetPasswordFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const hasValidCustomToken = customTokenStatus === "valid" && Boolean(customToken);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>(
    customTokenStatus === "none"
      ? "initializing"
      : hasValidCustomToken
        ? "custom-ready"
        : "invalid"
  );
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState(
    customTokenStatus === "none" || hasValidCustomToken
      ? ""
      : getCustomTokenStatusMessage(customTokenStatus)
  );

  useEffect(() => {
    if (customTokenStatus !== "none") {
      return;
    }

    let isMounted = true;
    let isResolved = false;
    const fragmentParams = getFragmentParams();
    const hadRecoveryFragment = hasRecoverySessionFragment(fragmentParams);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" && session) {
        isResolved = true;
        setRecoveryState("ready");
        setErrorMessage("");
        cleanSensitiveFragment();
      }
    });

    if (
      hasExpiredRecoveryFragment(fragmentParams) ||
      hasRecoveryErrorFragment(fragmentParams)
    ) {
      isResolved = true;
      queueMicrotask(() => {
        if (!isMounted) {
          return;
        }

        setRecoveryState("invalid");
        setErrorMessage(INVALID_RECOVERY_LINK_MESSAGE);
        cleanSensitiveFragment();
      });
      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!isMounted || isResolved) {
          return;
        }

        if (hadRecoveryFragment && session) {
          isResolved = true;
          setRecoveryState("ready");
          cleanSensitiveFragment();
          return;
        }

        isResolved = true;
        setRecoveryState("invalid");
        setErrorMessage(INVALID_RECOVERY_LINK_MESSAGE);
      })
      .catch(() => {
        if (!isMounted || isResolved) {
          return;
        }

        isResolved = true;
        setRecoveryState("invalid");
        setErrorMessage(INVALID_RECOVERY_LINK_MESSAGE);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [customToken, customTokenStatus, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (recoveryState !== "ready" && recoveryState !== "custom-ready") {
      setErrorMessage(INVALID_RECOVERY_LINK_MESSAGE);
      return;
    }

    const validationError = validateNewPassword(newPassword, confirmPassword);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsLoading(true);

    if (recoveryState === "custom-ready") {
      const response = await fetch("/api/auth/confirm-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: customToken,
          newPassword,
          confirmPassword,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        redirectTo?: string;
      } | null;

      if (!response.ok) {
        setIsLoading(false);
        setErrorMessage(
          payload?.error ||
            "Modification impossible. Demande un nouveau lien de réinitialisation."
        );
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setMessage(payload?.message || PASSWORD_RECOVERY_SUCCESS_MESSAGE);
      setRecoveryState("success");

      window.setTimeout(() => {
        router.replace(payload?.redirectTo || "/login");
        router.refresh();
      }, 1800);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setIsLoading(false);
      setErrorMessage(
        "Modification impossible. Le lien est peut-être expiré ou déjà utilisé."
      );
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setMessage(PASSWORD_RECOVERY_SUCCESS_MESSAGE);
    setRecoveryState("success");
    await supabase.auth.signOut().catch(() => null);

    window.setTimeout(() => {
      router.replace("/login");
      router.refresh();
    }, 1800);
  }

  if (recoveryState === "initializing") {
    return (
      <p className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300">
        Vérification du lien de réinitialisation...
      </p>
    );
  }

  if (recoveryState === "invalid") {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage || INVALID_RECOVERY_LINK_MESSAGE}
        </p>

        <Link
          href="/forgot-password"
          className="inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
        >
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="new-password"
          className="mb-1 block text-sm font-medium text-slate-200"
        >
          Nouveau mot de passe
        </label>
        <PasswordInput
          id="new-password"
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
          Confirmer le nouveau mot de passe
        </label>
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400"
          placeholder="Répète le mot de passe"
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
        {isLoading ? "Modification en cours..." : "Modifier le mot de passe"}
      </button>
    </form>
  );
}

function getCustomTokenStatusMessage(status: CustomTokenStatus) {
  if (status === "expired") {
    return EXPIRED_CUSTOM_LINK_MESSAGE;
  }

  if (status === "consumed") {
    return CONSUMED_CUSTOM_LINK_MESSAGE;
  }

  return INVALID_RECOVERY_LINK_MESSAGE;
}
