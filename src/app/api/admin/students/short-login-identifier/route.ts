import { NextResponse } from "next/server";
import { getCurrentTeacherClassIds } from "@/lib/auth/currentUserProfiles";
import {
  createShortIdentifierForExistingStudent,
  type ExistingStudentIdentifierClient,
} from "@/lib/auth/studentLoginIdentifier";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireTeacherOrAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (
    error ||
    !user ||
    !["professeur", "admin"].includes(user.app_metadata?.role)
  ) {
    return null;
  }

  return user;
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
  const studentId = String(body?.studentId ?? "");

  if (!studentId) {
    return NextResponse.json(
      { error: "Identifiant élève manquant." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  if (teacher.app_metadata?.role !== "admin") {
    const { data: student } = await admin
      .from("students")
      .select("id, class_id")
      .eq("id", studentId)
      .maybeSingle();

    const teacherClassIds = await getCurrentTeacherClassIds(admin, teacher);
    const studentClassId = String(student?.class_id ?? "");

    if (!studentClassId || !teacherClassIds.includes(studentClassId)) {
      return NextResponse.json(
        { error: "Tu n’es pas autorisé à gérer cet élève." },
        { status: 403 }
      );
    }
  }

  const result = await createShortIdentifierForExistingStudent(
    admin as unknown as ExistingStudentIdentifierClient,
    studentId
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.status }
    );
  }

  return NextResponse.json({
    message:
      "Identifiant court créé. Le compte Auth, les fiches et l’historique n’ont pas été recréés.",
    identifier: result.identifier,
    legacyIdentifier: result.legacyLoginEmail ?? result.authEmail,
    authEmail: result.authEmail,
    userId: result.userId,
    studentId: result.studentId,
  });
}
