import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireUser";
import { createAdminClient } from "@/lib/supabase/admin";

function buildTeacherDisplayName(email: string | null) {
  const localPart = String(email ?? "professeur")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();

  const parts = localPart.split(/\s+/).filter(Boolean);

  const firstName = parts[0]
    ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    : "Professeur";

  const lastName = parts.length > 1 ? parts.slice(1).join(" ").toUpperCase() : "";

  return {
    firstName,
    lastName,
  };
}

async function ensureTeacherProfile(
  admin: ReturnType<typeof createAdminClient>,
  appUserId: string
) {
  const { data: appUser, error: appUserError } = await admin
    .from("app_users")
    .select("id, email, role, is_active")
    .eq("id", appUserId)
    .eq("role", "teacher")
    .single();

  if (appUserError || !appUser) {
    throw new Error(appUserError?.message ?? "Compte professeur introuvable.");
  }

  const { data: existingTeacher, error: existingTeacherError } = await admin
    .from("teachers")
    .select("id, user_id, email")
    .eq("user_id", appUser.id)
    .maybeSingle();

  if (existingTeacherError) {
    throw new Error(existingTeacherError.message);
  }

  if (existingTeacher) {
    return existingTeacher;
  }

  const { data: teacherByEmail, error: teacherByEmailError } = await admin
    .from("teachers")
    .select("id, user_id, email")
    .eq("email", appUser.email)
    .maybeSingle();

  if (teacherByEmailError) {
    throw new Error(teacherByEmailError.message);
  }

  if (teacherByEmail) {
    const { data: updatedTeacher, error: updateError } = await admin
      .from("teachers")
      .update({
        user_id: appUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", teacherByEmail.id)
      .select("id, user_id, email")
      .single();

    if (updateError || !updatedTeacher) {
      throw new Error(updateError?.message ?? "Synchronisation professeur impossible.");
    }

    return updatedTeacher;
  }

  const { firstName, lastName } = buildTeacherDisplayName(appUser.email);

  const { data: createdTeacher, error: createError } = await admin
    .from("teachers")
    .insert({
      id: crypto.randomUUID(),
      user_id: appUser.id,
      first_name: firstName,
      last_name: lastName,
      email: appUser.email,
      role_label: "Professeur",
    })
    .select("id, user_id, email")
    .single();

  if (createError || !createdTeacher) {
    throw new Error(createError?.message ?? "Création du profil professeur impossible.");
  }

  return createdTeacher;
}

export async function GET() {
  await requireRole("admin");

  const admin = createAdminClient();

  const { data: teachers, error: teachersError } = await admin
    .from("app_users")
    .select("id, email, is_active")
    .eq("role", "teacher")
    .order("email", { ascending: true });

  if (teachersError) {
    return NextResponse.json({ error: teachersError.message }, { status: 500 });
  }

  const { data: teacherProfiles, error: teacherProfilesError } = await admin
    .from("teachers")
    .select("id, user_id, first_name, last_name, email, role_label")
    .order("last_name", { ascending: true });

  if (teacherProfilesError) {
    return NextResponse.json({ error: teacherProfilesError.message }, { status: 500 });
  }

  const { data: classes, error: classesError } = await admin
    .from("classes")
    .select("id, name, school_year, level")
    .order("school_year", { ascending: false })
    .order("name", { ascending: true });

  if (classesError) {
    return NextResponse.json({ error: classesError.message }, { status: 500 });
  }

  const { data: assignments, error: assignmentsError } = await admin
    .from("class_teachers")
    .select(`
      id,
      role_in_class,
      created_at,
      classes (
        id,
        name,
        school_year,
        level
      ),
      teachers (
        id,
        user_id,
        first_name,
        last_name,
        email,
        role_label
      )
    `)
    .order("created_at", { ascending: false });

  if (assignmentsError) {
    return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
  }

  return NextResponse.json({
    teachers: teachers ?? [],
    teacherProfiles: teacherProfiles ?? [],
    classes: classes ?? [],
    assignments: assignments ?? [],
  });
}

export async function POST(request: Request) {
  await requireRole("admin");

  const body = await request.json().catch(() => null);
  const appUserId = String(body?.appUserId ?? "");
  const classId = String(body?.classId ?? "");
  const roleInClass = String(body?.roleInClass ?? "professeur référent").trim();

  if (!appUserId || !classId) {
    return NextResponse.json(
      { error: "Professeur ou classe manquant." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  try {
    const teacherProfile = await ensureTeacherProfile(admin, appUserId);

    const { data: existingAssignment, error: existingAssignmentError } = await admin
      .from("class_teachers")
      .select("id")
      .eq("teacher_id", teacherProfile.id)
      .eq("class_id", classId)
      .maybeSingle();

    if (existingAssignmentError) {
      throw new Error(existingAssignmentError.message);
    }

    if (existingAssignment) {
      return NextResponse.json(
        { error: "Ce professeur est déjà rattaché à cette classe." },
        { status: 409 }
      );
    }

    const { data, error } = await admin
      .from("class_teachers")
      .insert({
        id: crypto.randomUUID(),
        class_id: classId,
        teacher_id: teacherProfile.id,
        role_in_class: roleInClass || "professeur référent",
      })
      .select("id, class_id, teacher_id, role_in_class")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Rattachement impossible.");
    }

    return NextResponse.json({
      message: "Professeur rattaché à la classe.",
      assignment: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue pendant le rattachement.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  await requireRole("admin");

  const body = await request.json().catch(() => null);
  const assignmentId = String(body?.assignmentId ?? "");

  if (!assignmentId) {
    return NextResponse.json(
      { error: "Rattachement manquant." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("class_teachers")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Rattachement supprimé.",
  });
}
