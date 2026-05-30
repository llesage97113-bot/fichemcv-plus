import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "professeur" | "eleve";

export async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(expectedRole: UserRole) {
  const user = await requireUser();
  const role = user.app_metadata?.role;

  if (expectedRole === "professeur" && role === "admin") {
    return user;
  }

  if (role !== expectedRole) {
    if (role === "admin") {
      redirect("/admin");
    }

    if (role === "professeur") {
      redirect("/");
    }

    if (role === "eleve") {
      redirect("/eleve");
    }

    redirect("/login");
  }

  return user;
}

export async function requireAnyRole(allowedRoles: UserRole[]) {
  const user = await requireUser();
  const role = user.app_metadata?.role;

  if (allowedRoles.includes("professeur") && role === "admin") {
    return user;
  }

  if (!allowedRoles.includes(role)) {
    if (role === "admin") {
      redirect("/admin");
    }

    if (role === "professeur") {
      redirect("/");
    }

    if (role === "eleve") {
      redirect("/eleve");
    }

    redirect("/login");
  }

  return user;
}
