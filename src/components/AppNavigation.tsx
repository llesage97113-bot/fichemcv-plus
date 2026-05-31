"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSupabaseAuthStorage, createClient } from "@/lib/supabase/client";

type UserRole = "admin" | "professeur" | "eleve" | null;

type AppNavigationProps = {
  maxWidth?: "4xl" | "5xl" | "6xl";
};

const maxWidthClasses = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
};

export default function AppNavigation({ maxWidth = "6xl" }: AppNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const isAdminSpace = pathname.startsWith("/admin");
  const isTeacherSpace = pathname === "/" || pathname.startsWith("/fiches");
  const isStudentSpace = pathname.startsWith("/eleve");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    async function checkSession() {
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
          setIsAuthenticated(false);
          setRole(null);
          setIsCheckingSession(false);
          return;
        }

        setIsAuthenticated(Boolean(session));
        setRole((session?.user?.app_metadata?.role as UserRole) ?? null);
        setIsCheckingSession(false);
      } catch (error) {
        const message =
          error instanceof Error ? error.message.toLowerCase() : "";

        if (message.includes("refresh token")) {
          clearSupabaseAuthStorage();
          await supabase.auth.signOut({ scope: "local" }).catch(() => null);
        }

        setIsAuthenticated(false);
        setRole(null);
        setIsCheckingSession(false);
      }
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

  function navigateTo(path: string) {
    router.push(path);
    router.refresh();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setRole(null);
    router.push("/login");
    router.refresh();
  }

  return (
    <nav
      className={`mx-auto mb-6 w-full ${maxWidthClasses[maxWidth]} rounded-2xl border border-slate-700 bg-slate-900/80 px-5 py-4 shadow-sm`}
    >
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
          {!isCheckingSession && isAuthenticated && (role === "professeur" || role === "admin") && (
            <>
              {role === "admin" && (
                <button
                  type="button"
                  onClick={() => navigateTo("/admin")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    isAdminSpace
                      ? "bg-purple-500 text-white hover:bg-purple-400"
                      : "border border-slate-700 bg-slate-950/40 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  Administration
                </button>
              )}

              <button
                type="button"
                onClick={() => navigateTo("/")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  isTeacherSpace
                    ? "border border-sky-300 bg-sky-500 text-white shadow shadow-sky-500/20 hover:bg-sky-400"
                    : "border border-slate-700 bg-slate-950/40 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Espace professeur
              </button>

              <button
                type="button"
                onClick={() => navigateTo("/eleve")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  isStudentSpace
                    ? "border border-emerald-300 bg-emerald-500 text-white shadow shadow-emerald-500/20 hover:bg-emerald-400"
                    : "border border-slate-700 bg-slate-950/40 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Prévisualiser espace élève
              </button>
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
