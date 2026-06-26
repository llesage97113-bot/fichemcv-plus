import Link from "next/link";
import VerifyRecoveryEmailConfirmButton from "@/components/VerifyRecoveryEmailConfirmButton";
import {
  classifyContactVerificationToken,
  hashContactVerificationToken,
  isValidContactVerificationTokenFormat,
  maskVerificationEmailContact,
  type ContactVerificationContact,
  type ContactVerificationTokenRow,
} from "@/lib/auth/contactVerification";
import { createAdminClient } from "@/lib/supabase/admin";

type VerifyRecoveryEmailPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function VerifyRecoveryEmailPage({
  searchParams,
}: VerifyRecoveryEmailPageProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const state = await loadVerificationState(token ?? "");

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm sm:p-8">
        <p className="mb-2 text-sm uppercase tracking-wide text-sky-300">
          FicheMCV+
        </p>

        {state.status === "valid" && (
          <>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Confirmer la vérification de cette adresse email
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Adresse concernée:{" "}
              <span className="font-mono text-slate-100">{state.maskedEmail}</span>
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              La vérification ne sera enregistrée qu’après confirmation explicite.
            </p>
            <VerifyRecoveryEmailConfirmButton token={token ?? ""} />
          </>
        )}

        {state.status !== "valid" && (
          <>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {getStateTitle(state.status)}
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              {getStateDescription(state.status)}
            </p>
            <Link
              href="/compte"
              className="mt-6 inline-flex rounded-xl border border-sky-500/50 px-4 py-3 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/10"
            >
              Demander un nouveau lien depuis Mon compte
            </Link>
          </>
        )}
      </section>
    </main>
  );
}

async function loadVerificationState(rawToken: string): Promise<
  | { status: "valid"; maskedEmail: string }
  | { status: "invalid" | "expired" | "consumed" }
> {
  if (!isValidContactVerificationTokenFormat(rawToken)) {
    return { status: "invalid" };
  }

  const tokenHash = hashContactVerificationToken(rawToken);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_contact_verification_tokens")
    .select(
      "id, user_contact_id, token_hash, expires_at, consumed_at, created_at, user_contacts(id, contact_type, contact_value, normalized_value, verified_at)"
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) {
    return { status: "invalid" };
  }

  const row = data as ContactVerificationTokenRow;
  const status = classifyContactVerificationToken(row);

  if (status !== "valid") {
    return { status };
  }

  const relatedContact = Array.isArray(row.user_contacts)
    ? row.user_contacts[0]
    : row.user_contacts;
  const contact = relatedContact as ContactVerificationContact | null;

  if (!contact || contact.contact_type !== "email") {
    return { status: "invalid" };
  }

  return {
    status: "valid",
    maskedEmail: maskVerificationEmailContact(contact),
  };
}

function getStateTitle(status: "invalid" | "expired" | "consumed") {
  if (status === "expired") {
    return "Ce lien de vérification a expiré.";
  }

  if (status === "consumed") {
    return "Ce lien de vérification a déjà été utilisé.";
  }

  return "Ce lien de vérification est invalide.";
}

function getStateDescription(status: "invalid" | "expired" | "consumed") {
  if (status === "expired") {
    return "Demande un nouveau lien depuis Mon compte pour vérifier cette adresse.";
  }

  if (status === "consumed") {
    return "Ce lien ne peut plus être utilisé pour vérifier une adresse.";
  }

  return "Le lien utilisé ne permet pas de vérifier une adresse de récupération.";
}
