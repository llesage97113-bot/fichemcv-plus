import Link from "next/link";

export default function AppNavigation() {
  return (
    <nav className="mb-6 rounded-2xl border border-slate-700 bg-slate-900/80 px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-sky-400">
            FicheMCV+
          </p>
          <h1 className="text-xl font-semibold text-white">
            Suivi des fiches MCV
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400"
          >
            Espace professeur
          </Link>

          <Link
            href="/eleve"
            className="rounded-xl border border-sky-400 px-4 py-2 text-sm font-medium text-sky-300 transition hover:bg-sky-950"
          >
            Espace élève
          </Link>
        </div>
      </div>
    </nav>
  );
}
