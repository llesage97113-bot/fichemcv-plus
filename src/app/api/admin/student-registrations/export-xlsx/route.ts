import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

function getStatusLabel(status: string | null) {
  if (status === "pending") return "En attente";
  if (status === "validated") return "Validé";
  if (status === "rejected") return "Refusé";
  return status ?? "";
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

export async function GET() {
  const teacher = await requireTeacher();

  if (!teacher) {
    return NextResponse.json(
      { error: "Accès réservé au professeur." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const teacherClassIds = await getTeacherClassIds(admin, teacher.email);

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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FicheMCV+";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Élèves inscrits");

  worksheet.columns = [
    { header: "Classe", key: "className", width: 22 },
    { header: "Année scolaire", key: "schoolYear", width: 16 },
    { header: "Nom", key: "lastName", width: 20 },
    { header: "Prénom", key: "firstName", width: 20 },
    { header: "Identifiant de connexion", key: "email", width: 34 },
    { header: "Code élève", key: "studentCode", width: 18 },
    { header: "Statut inscription", key: "registrationStatus", width: 18 },
    { header: "Compte actif", key: "isActive", width: 14 },
    { header: "Date inscription", key: "submittedAt", width: 18 },
    { header: "Date validation", key: "validatedAt", width: 18 },
  ];

  for (const student of data ?? []) {
    const classInfo = firstRelation(student.classes);
    const appUser = firstRelation(student.app_users);

    worksheet.addRow({
      className: classInfo?.name ?? "",
      schoolYear: classInfo?.school_year ?? "",
      lastName: student.last_name ?? "",
      firstName: student.first_name ?? "",
      email: appUser?.email ?? "",
      studentCode: student.student_code ?? "",
      registrationStatus: getStatusLabel(student.registration_status),
      isActive: appUser?.is_active ? "Oui" : "Non",
      submittedAt: formatDate(student.registration_submitted_at),
      validatedAt: formatDate(student.validated_at),
    });
  }

  worksheet.views = [
    {
      state: "frozen",
      ySplit: 1,
      showGridLines: false,
    },
  ];

  worksheet.autoFilter = {
    from: "A1",
    to: "J1",
  };

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    for (let columnIndex = 1; columnIndex <= 10; columnIndex += 1) {
      const cell = row.getCell(columnIndex);

      cell.alignment = { vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF1E3A8A" } },
        left: { style: "thin", color: { argb: "FF1E3A8A" } },
        bottom: { style: "thin", color: { argb: "FF1E3A8A" } },
        right: { style: "thin", color: { argb: "FF1E3A8A" } },
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="eleves-inscrits-fichemcv.xlsx"',
    },
  });
}
