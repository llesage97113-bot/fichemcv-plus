import Link from "next/link";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import {
  classifyPasswordResetToken,
  hashPasswordResetToken,
  isValidPasswordResetTokenFormat,
  type PasswordResetTokenRow,
  type PasswordResetTokenStatus,
} from "@/lib/auth/passwordResetTokens";
import { createAdminClient } from "@/lib/supabase/admin";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const customTokenState = await loadCustomTokenState(token ?? "");

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-10">
      <section className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-wide text-sky-400">
              FicheMCV+
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">
              Réinitialiser le mot de passe
            </h1>
          </div>

          <ResetPasswordForm
            customToken={customTokenState.status === "valid" ? token ?? "" : ""}
            customTokenStatus={customTokenState.status}
          />

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

async function loadCustomTokenState(
  rawToken: string
): Promise<{ status: PasswordResetTokenStatus | "none" }> {
  if (!rawToken) {
    return { status: "none" };
  }

  if (!isValidPasswordResetTokenFormat(rawToken)) {
    return { status: "invalid" };
  }

  const tokenHash = hashPasswordResetToken(rawToken);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_password_reset_tokens")
    .select("id, user_id, token_hash, expires_at, consumed_at, created_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) {
    return { status: "invalid" };
  }

  return {
    status: classifyPasswordResetToken(data as PasswordResetTokenRow),
  };
}
