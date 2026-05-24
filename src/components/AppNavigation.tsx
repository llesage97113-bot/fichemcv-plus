"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type UserRole = "professeur" | "eleve" | null;

export default function AppNavigation() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setIsAuthenticated(Boolean(session));
      setRole((session?.user?.app_metadata?.role as UserRole) ?? null);
      setIsCheckingSession(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
      setRole((session?.user?.app_metadata?.role as UserRole) ?? null);
      setIsCheckingSession(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setRole(null);
    router.push("/login");
    router.refresh();
  }

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
          {!isCheckingSession && isAuthenticated && role === "professeur" && (
            <>
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
                Prévisualiser espace élève
              </Link>
            </>
          )}

          {!isCheckingSession && isAuthenticated && role === "eleve" && (
            <Link
              href="/eleve"
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400"
            >
              Espace élève
            </Link>
          )}

          {!isCheckingSession && !isAuthenticated && (
            <Link
              href="/login"
              className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Connexion
            </Link>
          )}

          {!isCheckingSession && isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-red-400/50 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-950/40"
            >
              Déconnexion
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
