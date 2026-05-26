import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let randomPart = "";

  for (let index = 0; index < 8; index += 1) {
    randomPart += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return `MCV-${randomPart}!`;
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
  const studentId = String(body?.studentId ?? "");

  if (!studentId) {
    return NextResponse.json(
      { error: "Identifiant élève manquant." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id, user_id, first_name, last_name")
    .eq("id", studentId)
    .single();

  if (studentError || !student) {
    return NextResponse.json(
      { error: studentError?.message ?? "Élève introuvable." },
      { status: 404 }
    );
  }

  if (!student.user_id) {
    return NextResponse.json(
      { error: "Aucun compte utilisateur n’est rattaché à cet élève." },
      { status: 400 }
    );
  }

  const temporaryPassword = generateTemporaryPassword();

  const { error: updateError } = await admin.auth.admin.updateUserById(
    student.user_id,
    {
      password: temporaryPassword,
    }
  );

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Mot de passe réinitialisé.",
    student: {
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
    },
    temporaryPassword,
  });
}
