import Link from "next/link";
import AppNavigation from "@/components/AppNavigation";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import RecoveryEmailForm from "@/components/RecoveryEmailForm";
import RecoveryEmailVerificationButton from "@/components/RecoveryEmailVerificationButton";
import {
  type AccountContact,
  getMaskedAccountContact,
  getReadableContactPriority,
  getReadableContactType,
  getReadableContactVerification,
  getReadableRecoveryConsent,
  loadAccountOverview,
} from "@/lib/auth/accountManagement";
import { getRoleHomePath } from "@/lib/auth/getRoleHomePath";
import { requireUser } from "@/lib/auth/requireUser";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AccountPage() {
  const authUser = await requireUser();
  const admin = createAdminClient();
  const { overview, errorMessage } = await loadAccountOverview(admin, authUser);
  const homePath = getRoleHomePath(authUser.app_metadata?.role) ?? "/login";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <AppNavigation maxWidth="5xl" />

      <section className="mx-auto max-w-5xl">
        <Link
          href={homePath}
          className="mb-6 inline-flex items-center rounded-lg border border-slate-800 px-3 py-2 text-sm text-sky-300 hover:bg-slate-900 hover:text-sky-200"
        >
          ← Retour à mon espace
        </Link>

        <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm">
          <p className="mb-2 text-sm uppercase tracking-wide text-sky-300">
            FicheMCV+
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Mon compte</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Consulte tes informations de connexion, tes coordonnées de récupération
            et les réglages de sécurité de ton compte.
          </p>
        </header>

        {!overview && (
          <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-amber-100">
              Compte indisponible
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-100/80">
              {errorMessage || "Aucun compte applicatif n’est associé à cette session."}
            </p>
          </section>
        )}

        {overview && (
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-500">
                    Mon compte
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-100">
                    {overview.identityLabel}
                  </h2>
                </div>

                <span className="rounded-full border border-sky-500/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-300">
                  {overview.roleLabel}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InfoItem label="Rôle" value={overview.roleLabel} />
                <InfoItem label="Statut du compte" value={overview.accountStatusLabel} />
                <InfoItem
                  label="Identifiant de connexion"
                  value={
                    overview.studentLoginIdentifier ||
                    overview.authEmail ||
                    overview.appUser.email ||
                    "Non renseigné"
                  }
                />
                <InfoItem
                  label="Adresse email de récupération"
                  value={getPrimaryEmailRecoveryLabel(overview.contacts)}
                />
              </div>
            </section>

            {overview.isLegacyAccount && (
              <section className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5 shadow-sm">
                <h2 className="text-xl font-semibold text-amber-100">
                  {overview.studentLoginIdentifier
                    ? "Nouvel identifiant de connexion"
                    : "Identifiant historique"}
                </h2>
                {overview.studentLoginIdentifier ? (
                  <>
                    <p className="mt-2 text-sm leading-6 text-amber-100/85">
                      Ton nouvel identifiant de connexion est :{" "}
                      <span className="font-mono font-semibold">
                        {overview.studentLoginIdentifier}
                      </span>
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Ton ancien identifiant reste temporairement utilisable.
                    </p>
                    <p className="mt-2 break-words font-mono text-sm text-slate-400">
                      {overview.appUser.legacy_login_email ||
                        overview.authEmail ||
                        overview.appUser.email}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm leading-6 text-amber-100/85">
                      Ton compte utilise encore un identifiant de connexion interne.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Une adresse email réelle pourra prochainement être ajoutée pour
                      faciliter la récupération du compte.
                    </p>
                  </>
                )}
              </section>
            )}

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-500">
                    Coordonnées de récupération
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-100">
                    Contacts enregistrés
                  </h2>
                </div>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
                  Téléphone bientôt disponible
                </span>
              </div>

              <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <RecoveryEmailForm />
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  L’adresse enregistrée ne sera utilisable pour la récupération
                  du compte qu’après vérification.
                </p>
              </div>

              {overview.contacts.length === 0 ? (
                <p className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                  Aucune coordonnée de récupération n’est encore enregistrée.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {overview.contacts.map((contact) => (
                    <article
                      key={contact.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {getReadableContactType(contact.contact_type)}
                      </p>
                      <p className="mt-2 break-words font-mono text-sm text-slate-100">
                        {getMaskedAccountContact(contact)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-sky-500/40 px-2 py-1 text-sky-300">
                          {getReadableContactVerification(contact)}
                        </span>
                        <span className="rounded-full border border-slate-700 px-2 py-1 text-slate-300">
                          {getReadableContactPriority(contact)}
                        </span>
                        {contact.contact_type === "email" && (
                          <span className="rounded-full border border-slate-700 px-2 py-1 text-slate-300">
                            {getReadableRecoveryConsent(contact)}
                          </span>
                        )}
                      </div>
                      {contact.contact_type === "email" &&
                        contact.verified_at &&
                        contact.can_be_used_for_recovery && (
                        <p className="mt-3 text-sm leading-6 text-slate-400">
                          Adresse disponible pour récupérer ton compte.
                        </p>
                      )}
                      {contact.contact_type === "email" && (
                        <RecoveryEmailVerificationButton
                          contactId={contact.id}
                          isVerified={Boolean(contact.verified_at)}
                        />
                      )}
                    </article>
                  ))}
                </div>
              )}

              <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
                Le téléphone de récupération sera ajouté dans un prochain patch.
              </p>
            </section>

            <PasswordChangeForm />
          </div>
        )}
      </section>
    </main>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-base font-medium text-slate-100">
        {value}
      </p>
    </div>
  );
}

function getPrimaryEmailRecoveryLabel(
  contacts: AccountContact[]
) {
  const emailContacts = contacts.filter((contact) => contact.contact_type === "email");
  const primaryEmail =
    emailContacts.find((contact) => contact.is_primary) ?? emailContacts[0];

  return primaryEmail ? getMaskedAccountContact(primaryEmail) : "Non renseignée";
}
