import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentTeacherClassIds } from "@/lib/auth/currentUserProfiles";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("fr-FR");
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

async function requireTeacher() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.app_metadata?.role !== "professeur") {
    return null;
  }

  return user;
}

async function getTeacherClassIds(
  admin: ReturnType<typeof createAdminClient>,
  authUser: Awaited<ReturnType<typeof requireTeacher>>
) {
  if (!authUser) {
    return [];
  }

  return getCurrentTeacherClassIds(admin, authUser);
}

export async function GET() {
  const teacher = await requireTeacher();

  if (!teacher) {
    return NextResponse.json(
      { error: "Accès réservé au professeur." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const teacherClassIds = await getTeacherClassIds(admin, teacher);

  let studentsQuery = admin
    .from("students")
    .select(`
      id,
      class_id,
      first_name,
      last_name,
      student_code,
      registration_status,
      registration_submitted_at,
      validated_at,
      classes (
        name,
        school_year
      ),
      app_users:user_id (
        email,
        is_active
      )
    `)
    .neq("registration_status", "rejected")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (teacherClassIds.length > 0) {
    studentsQuery = studentsQuery.in("class_id", teacherClassIds);
  } else {
    studentsQuery = studentsQuery.eq(
      "class_id",
      "00000000-0000-0000-0000-000000000000"
    );
  }

  const { data, error } = await studentsQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = [
    [
      "Classe",
      "Annee scolaire",
      "Nom",
      "Prenom",
      "Identifiant",
      "Code eleve",
      "Statut",
      "Compte actif",
      "Date inscription",
      "Date validation",
    ],
    ...((data ?? []).map((student) => {
      const classInfo = firstRelation(student.classes);
      const appUser = firstRelation(student.app_users);

      return [
        classInfo?.name ?? "",
        classInfo?.school_year ?? "",
        student.last_name ?? "",
        student.first_name ?? "",
        appUser?.email ?? "",
        student.student_code ?? "",
        student.registration_status ?? "",
        appUser?.is_active ? "Oui" : "Non",
        formatDate(student.registration_submitted_at),
        formatDate(student.validated_at),
      ];
    })),
  ];

  const csv = "\ufeff" + rows.map((row) => row.map(csvEscape).join(";")).join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="eleves-inscrits-fichemcv.csv"',
    },
  });
}
