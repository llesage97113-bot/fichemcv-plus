"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSupabaseAuthStorage, createClient } from "@/lib/supabase/client";
import { normalizeEmail } from "@/lib/normalizers";
import { getRoleHomePath } from "@/lib/auth/getRoleHomePath";

type ExistingSession = {
  email: string;
  homePath: string;
};

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [existingSession, setExistingSession] =
    useState<ExistingSession | null>(null);

  useEffect(() => {
    async function cleanExpiredLocalSession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (
          error &&
          error.message.toLowerCase().includes("refresh token")
        ) {
          clearSupabaseAuthStorage();
          await supabase.auth.signOut({ scope: "local" }).catch(() => null);
          setErrorMessage(
            "Ancienne session expirée nettoyée. Tu peux te reconnecter."
          );
          return;
        }

        if (session) {
          const homePath = getRoleHomePath(session.user.app_metadata?.role);

          if (homePath) {
            setExistingSession({
              email: session.user.email ?? "compte connecté",
              homePath,
            });
            return;
          }

          setErrorMessage(
            "Rôle utilisateur inconnu. Contacte l’administrateur de l’application."
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message.toLowerCase() : "";

        if (message.includes("refresh token")) {
          clearSupabaseAuthStorage();
          await supabase.auth.signOut({ scope: "local" }).catch(() => null);
          setErrorMessage(
            "Ancienne session expirée nettoyée. Tu peux te reconnecter."
          );
        }
      }
    }

    cleanExpiredLocalSession();
  }, [supabase]);

  async function handleSignOut() {
    setIsSigningOut(true);
    setErrorMessage("");
    await supabase.auth.signOut().catch(() => null);
    clearSupabaseAuthStorage();
    setExistingSession(null);
    setIsSigningOut(false);
    router.refresh();
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    const normalizedEmail = normalizeEmail(email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(
        "Connexion impossible. Vérifie ton identifiant et ton mot de passe."
      );
      return;
    }

    const role = data.user?.app_metadata?.role;
    const homePath = getRoleHomePath(role);

    if (!homePath) {
      await supabase.auth.signOut().catch(() => null);
      setErrorMessage(
        "Connexion refusée : rôle utilisateur inconnu. Contacte l’administrateur de l’application."
      );
      return;
    }

    router.push(homePath);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-10">
      <section className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-wide text-sky-400">
              FicheMCV+
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">
              Connexion
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Connecte-toi pour accéder à ton espace professeur ou élève.
            </p>
          </div>

          {existingSession ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                <p className="font-semibold">Tu es déjà connecté en tant que :</p>
                <p className="mt-1 break-words text-slate-200">
                  {existingSession.email}
                </p>
              </div>

              <Link
                href={existingSession.homePath}
                className="inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Accéder à mon espace
              </Link>

              <button
                type="button"
                disabled={isSigningOut}
                onClick={handleSignOut}
                className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-sky-400 hover:text-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSigningOut
                  ? "Déconnexion en cours..."
                  : "Se connecter avec un autre compte"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-slate-200"
                >
                  Adresse email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400"
                  placeholder="exemple@domaine.fr"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium text-slate-200"
                >
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400"
                  placeholder="••••••••"
                />
                <Link
                  href="/forgot-password"
                  className="mt-2 inline-flex text-sm font-medium text-sky-300 transition hover:text-sky-200"
                >
                  Mot de passe perdu ?
                </Link>
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Connexion en cours..." : "Se connecter"}
              </button>
            </form>
          )}

          <div className="mt-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
            <p className="text-sm font-semibold text-sky-100">
              Première connexion ?
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Les élèves peuvent créer leur compte avec le code d’inscription transmis
              par leur professeur. Les accès professeur sont créés séparément par
              l’administrateur de l’application.
            </p>

            <Link
              href="/inscription-eleve"
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Créer mon compte élève
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
