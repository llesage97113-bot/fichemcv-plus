import Link from "next/link";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export default function ResetPasswordPage() {
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

          <ResetPasswordForm />

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
