import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.app_metadata?.role !== "admin") {
    return null;
  }

  return user;
}

export async function POST(request: Request) {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return NextResponse.json(
      { error: "Accès réservé à l’administrateur." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const teacherId = String(body?.teacherId ?? "");
  const isActive = Boolean(body?.isActive);

  if (!teacherId) {
    return NextResponse.json(
      { error: "Identifiant professeur manquant." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: teacher, error: teacherError } = await admin
    .from("app_users")
    .select("id, email, role, is_active")
    .eq("id", teacherId)
    .eq("role", "teacher")
    .single();

  if (teacherError || !teacher) {
    return NextResponse.json(
      {
        error:
          teacherError?.message ??
          "Compte professeur introuvable ou non modifiable.",
      },
      { status: 404 }
    );
  }

  const { error: updateError } = await admin
    .from("app_users")
    .update({ is_active: isActive })
    .eq("id", teacherId)
    .eq("role", "teacher");

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: isActive
      ? "Compte professeur réactivé."
      : "Compte professeur désactivé.",
    teacher: {
      id: teacher.id,
      email: teacher.email,
      isActive,
    },
  });
}
