import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireTeacherOrAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const role = user?.app_metadata?.role;

  if (error || !user || (role !== "professeur" && role !== "admin")) {
    return null;
  }

  return user;
}

async function getTeacherClassIds(
  admin: ReturnType<typeof createAdminClient>,
  teacherEmail: string | null | undefined
) {
  const { data: appUser } = await admin
    .from("app_users")
    .select("id")
    .eq("email", teacherEmail ?? "")
    .eq("role", "teacher")
    .eq("is_active", true)
    .single();

  const { data: teacherProfile } = appUser
    ? await admin
        .from("teachers")
        .select("id")
        .eq("user_id", appUser.id)
        .single()
    : { data: null };

  const { data: teacherClasses } = teacherProfile
    ? await admin
        .from("class_teachers")
        .select("class_id")
        .eq("teacher_id", teacherProfile.id)
    : { data: null };

  return Array.from(
    new Set(
      (teacherClasses ?? [])
        .map((item) => String(item.class_id ?? ""))
        .filter(Boolean)
    )
  );
}

function isTeacherAllowedForClass(
  teacherClassIds: string[],
  classId: string | null | undefined
) {
  return Boolean(classId) && teacherClassIds.includes(String(classId));
}

export async function POST(request: Request) {
  const teacher = await requireTeacherOrAdmin();

  if (!teacher) {
    return NextResponse.json(
      { error: "Accès réservé au professeur ou à l’administrateur." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);

  const sectionId = String(body?.sectionId ?? "");
  const teacherFeedback =
    body?.teacherFeedback === null || body?.teacherFeedback === undefined
      ? null
      : String(body.teacherFeedback);

  if (!sectionId) {
    return NextResponse.json(
      { error: "Identifiant de section manquant." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: section, error: sectionError } = await admin
    .from("fiche_sections")
    .select("fiche_id")
    .eq("id", sectionId)
    .single();

  if (sectionError || !section) {
    return NextResponse.json(
      {
        error:
          sectionError?.message ??
          "Sauvegarde de la remarque professeur impossible.",
      },
      { status: 500 }
    );
  }

  const { data: fiche, error: ficheError } = await admin
    .from("fiches")
    .select("class_id")
    .eq("id", section.fiche_id)
    .single();

  if (ficheError || !fiche) {
    return NextResponse.json(
      {
        error:
          ficheError?.message ??
          "Sauvegarde de la remarque professeur impossible.",
      },
      { status: 500 }
    );
  }

  if (teacher.app_metadata?.role !== "admin") {
    const teacherClassIds = await getTeacherClassIds(admin, teacher.email);

    if (!isTeacherAllowedForClass(teacherClassIds, fiche.class_id)) {
      return NextResponse.json(
        {
          error:
            "Accès refusé : cette section appartient à une classe non rattachée à ce professeur.",
        },
        { status: 403 }
      );
    }
  }

  const { data, error } = await admin
    .from("fiche_sections")
    .update({
      teacher_feedback: teacherFeedback,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sectionId)
    .select("id, teacher_feedback, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        error:
          error?.message ??
          "Sauvegarde de la remarque professeur impossible.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Remarque professeur sauvegardée.",
    section: data,
  });
}
