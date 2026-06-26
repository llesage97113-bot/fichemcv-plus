import Link from "next/link";

export default function VerifyRecoveryEmailSuccessPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm sm:p-8">
        <p className="mb-2 text-sm uppercase tracking-wide text-sky-300">
          FicheMCV+
        </p>
        <h1 className="text-2xl font-bold sm:text-3xl">
          Ton adresse email de récupération est maintenant vérifiée.
        </h1>
        <Link
          href="/compte"
          className="mt-6 inline-flex rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
        >
          Retour à Mon compte
        </Link>
      </section>
    </main>
  );
}
