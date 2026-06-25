import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMcvOption } from "@/lib/ficheDefinitions";
import { normalizeRegistrationCode } from "@/lib/normalizers";

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

async function getTeacherProfile(
  admin: ReturnType<typeof createAdminClient>,
  teacherEmail: string | null | undefined
) {
  const { data: appUser, error: appUserError } = await admin
    .from("app_users")
    .select("id")
    .eq("email", teacherEmail ?? "")
    .eq("role", "teacher")
    .eq("is_active", true)
    .single();

  if (appUserError || !appUser) {
    throw new Error(appUserError?.message ?? "Compte professeur introuvable.");
  }

  const { data: teacherProfile, error: teacherProfileError } = await admin
    .from("teachers")
    .select("id")
    .eq("user_id", appUser.id)
    .single();

  if (teacherProfileError || !teacherProfile) {
    throw new Error(
      teacherProfileError?.message ?? "Profil professeur introuvable."
    );
  }

  return teacherProfile;
}

function isDuplicateClassError(error: { code?: string; message?: string }) {
  return (
    error.code === "23505" &&
    String(error.message ?? "").includes("classes_name_school_year_key")
  );
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

  const { data: appUser } = await admin
    .from("app_users")
    .select("id")
    .eq("email", teacher.email ?? "")
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

  const teacherClassIds = Array.from(
    new Set(
      (teacherClasses ?? [])
        .map((item) => String(item.class_id ?? ""))
        .filter(Boolean)
    )
  );

  let classesQuery = admin
    .from("classes")
    .select(
      "id, name, school_year, level, mcv_option, registration_code, is_registration_open, created_at, updated_at"
    )
    .order("school_year", { ascending: false })
    .order("name", { ascending: true });

  if (teacherClassIds.length > 0) {
    classesQuery = classesQuery.in("id", teacherClassIds);
  } else {
    classesQuery = classesQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  const { data, error } = await classesQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const classes = data ?? [];
  const classIds = classes.map((classItem) => classItem.id);

  const { data: students, error: studentsError } =
    classIds.length > 0
      ? await admin
          .from("students")
          .select("class_id, registration_status")
          .in("class_id", classIds)
      : { data: [], error: null };

  if (studentsError) {
    return NextResponse.json({ error: studentsError.message }, { status: 500 });
  }

  const countersByClass = new Map<
    string,
    {
      students_total: number;
      students_pending: number;
      students_validated: number;
      students_rejected: number;
    }
  >();

  for (const classId of classIds) {
    countersByClass.set(classId, {
      students_total: 0,
      students_pending: 0,
      students_validated: 0,
      students_rejected: 0,
    });
  }

  for (const student of students ?? []) {
    const classId = student.class_id;

    if (!classId) {
      continue;
    }

    const counters = countersByClass.get(classId);

    if (!counters) {
      continue;
    }

    counters.students_total += 1;

    if (student.registration_status === "pending") {
      counters.students_pending += 1;
    } else if (student.registration_status === "validated") {
      counters.students_validated += 1;
    } else if (student.registration_status === "rejected") {
      counters.students_rejected += 1;
    }
  }

  const classesWithCounters = classes.map((classItem) => ({
    ...classItem,
    ...(countersByClass.get(classItem.id) ?? {
      students_total: 0,
      students_pending: 0,
      students_validated: 0,
      students_rejected: 0,
    }),
  }));

  return NextResponse.json({ classes: classesWithCounters });
}

export async function POST(request: Request) {
  const teacher = await requireTeacher();

  if (!teacher) {
    return NextResponse.json(
      { error: "Accès réservé au professeur." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);

  const name = String(body?.name ?? "").trim();
  const schoolYear = String(body?.schoolYear ?? "").trim();
  const level = String(body?.level ?? "").trim();
  const mcvOption = String(body?.mcvOption ?? "");
  const registrationCode = normalizeRegistrationCode(
    String(body?.registrationCode ?? "")
  );

  if (!name || !schoolYear || !registrationCode || !isMcvOption(mcvOption)) {
    return NextResponse.json(
      {
        error:
          "Nom de classe, année scolaire, option MCV et code d’inscription sont obligatoires. L’option doit être A ou B.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  let teacherProfile: { id: string };

  try {
    teacherProfile = await getTeacherProfile(admin, teacher.email);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Profil professeur introuvable.",
      },
      { status: 500 }
    );
  }

  const { data, error } = await admin
    .from("classes")
    .insert({
      id: crypto.randomUUID(),
      name,
      school_year: schoolYear,
      level,
      mcv_option: mcvOption,
      registration_code: registrationCode,
      is_registration_open: true,
    })
    .select(
      "id, name, school_year, level, mcv_option, registration_code, is_registration_open"
    )
    .single();

  if (error) {
    if (isDuplicateClassError(error)) {
      return NextResponse.json(
        {
          error:
            "Une classe portant ce nom existe déjà pour cette année scolaire.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: assignmentError } = await admin.from("class_teachers").insert({
    id: crypto.randomUUID(),
    class_id: data.id,
    teacher_id: teacherProfile.id,
    role_in_class: "professeur référent",
  });

  if (assignmentError) {
    return NextResponse.json(
      {
        error:
          "Classe créée, mais le rattachement au professeur a échoué. Contacte l’administrateur avant de réessayer.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Classe créée.",
    class: data,
  });
}

export async function PATCH(request: Request) {
  const teacher = await requireTeacher();

  if (!teacher) {
    return NextResponse.json(
      { error: "Accès réservé au professeur." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);

  const classId = String(body?.classId ?? "");
  const registrationCode = normalizeRegistrationCode(
    String(body?.registrationCode ?? "")
  );
  const isRegistrationOpen = Boolean(body?.isRegistrationOpen);

  if (!classId || !registrationCode) {
    return NextResponse.json(
      { error: "Classe ou code d’inscription invalide." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("classes")
    .update({
      registration_code: registrationCode,
      is_registration_open: isRegistrationOpen,
      updated_at: new Date().toISOString(),
    })
    .eq("id", classId)
    .select(
      "id, name, school_year, level, registration_code, is_registration_open"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Classe mise à jour.",
    class: data,
  });
}
