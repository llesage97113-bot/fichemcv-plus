import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function generateStudentCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "MCV-";

  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

async function generateUniqueEmail(
  admin: ReturnType<typeof createAdminClient>,
  firstName: string,
  lastName: string
) {
  const first = normalizePart(firstName);
  const last = normalizePart(lastName);

  let base = first && last ? `${first}.${last}` : `eleve.${crypto.randomUUID().slice(0, 8)}`;
  let email = `${base}@fichemcv.local`;
  let suffix = 2;

  while (true) {
    const { data: existingAppUser } = await admin
      .from("app_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    const { data: existingAuthUser } =
      await admin.auth.admin.listUsers();

    const existsInAuth = existingAuthUser.users.some(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (!existingAppUser && !existsInAuth) {
      return email;
    }

    email = `${base}.${suffix}@fichemcv.local`;
    suffix += 1;
  }
}

export async function POST(request: Request) {
  const admin = createAdminClient();

  const body = await request.json().catch(() => null);

  const firstName = String(body?.firstName ?? "").trim();
  const lastName = String(body?.lastName ?? "").trim();
  const registrationCode = String(body?.registrationCode ?? "").trim().toUpperCase();
  const password = String(body?.password ?? "");
  const confirmPassword = String(body?.confirmPassword ?? "");

  if (!firstName || !lastName || !registrationCode || !password) {
    return NextResponse.json(
      { error: "Tous les champs obligatoires doivent être renseignés." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères." },
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: "Les deux mots de passe ne correspondent pas." },
      { status: 400 }
    );
  }

  const { data: classData, error: classError } = await admin
    .from("classes")
    .select("id, name, school_year, registration_code, is_registration_open")
    .eq("registration_code", registrationCode)
    .eq("is_registration_open", true)
    .single();

  if (classError || !classData) {
    return NextResponse.json(
      { error: "Code d’inscription invalide ou inscriptions fermées." },
      { status: 400 }
    );
  }

  const email = await generateUniqueEmail(admin, firstName, lastName);
  const studentCode = generateStudentCode();

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        role: "eleve",
      },
    });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Création du compte Auth impossible." },
      { status: 500 }
    );
  }

  const { data: appUser, error: appUserError } = await admin
    .from("app_users")
    .insert({
      id: authData.user.id,
      email,
      role: "student",
      is_active: true,
    })
    .select("id")
    .single();

  if (appUserError || !appUser) {
    await admin.auth.admin.deleteUser(authData.user.id);

    return NextResponse.json(
      { error: appUserError?.message ?? "Création du profil applicatif impossible." },
      { status: 500 }
    );
  }

  const { error: studentError } = await admin
    .from("students")
    .insert({
      id: crypto.randomUUID(),
      user_id: appUser.id,
      class_id: classData.id,
      first_name: firstName,
      last_name: lastName,
      student_code: studentCode,
      registration_status: "pending",
      registration_submitted_at: new Date().toISOString(),
    });

  if (studentError) {
    await admin.from("app_users").delete().eq("id", appUser.id);
    await admin.auth.admin.deleteUser(authData.user.id);

    return NextResponse.json(
      { error: studentError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    email,
    className: classData.name,
    schoolYear: classData.school_year,
    message:
      "Compte créé. Ton inscription est en attente de validation par le professeur.",
  });
}
