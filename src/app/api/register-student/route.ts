import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeEmail,
  normalizePersonName,
  normalizeRegistrationCode,
} from "@/lib/normalizers";
import {
  buildInternalStudentEmail,
  generateUniqueStudentLoginIdentifier,
  type IdentifierAvailabilityClient,
} from "@/lib/auth/studentLoginIdentifier";
import {
  saveRecoveryEmailForUser,
  validateRecoveryEmail,
  type RecoveryEmailClient,
} from "@/lib/auth/recoveryEmail";

function generateStudentCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "MCV-";

  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

export async function POST(request: Request) {
  const admin = createAdminClient();

  try {
  const body = await request.json().catch(() => null);

  const firstName = normalizePersonName(String(body?.firstName ?? ""));
  const lastName = normalizePersonName(String(body?.lastName ?? ""));
  const registrationCode = normalizeRegistrationCode(
    String(body?.registrationCode ?? "")
  );
  const password = String(body?.password ?? "");
  const confirmPassword = String(body?.confirmPassword ?? "");
  const personalEmailInput = String(body?.personalEmail ?? "");
  const useEmailForRecovery = Boolean(body?.useEmailForRecovery);

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

  let normalizedPersonalEmail: string | null = null;

  if (personalEmailInput.trim()) {
    const validation = validateRecoveryEmail(personalEmailInput);

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.message, code: validation.code },
        { status: 400 }
      );
    }

    normalizedPersonalEmail = validation.email;
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

  const { data: existingStudents, error: existingStudentsError } = await admin
    .from("students")
    .select("id, first_name, last_name, registration_status")
    .eq("class_id", classData.id);

  if (existingStudentsError) {
    return NextResponse.json(
      { error: existingStudentsError.message },
      { status: 500 }
    );
  }

  const duplicateStudent = (existingStudents ?? []).find((student) => {
    const existingFirstName = normalizePersonName(
      String(student.first_name ?? "")
    ).toLowerCase();

    const existingLastName = normalizePersonName(
      String(student.last_name ?? "")
    ).toLowerCase();

    return (
      existingFirstName === firstName.toLowerCase() &&
      existingLastName === lastName.toLowerCase()
    );
  });

  if (duplicateStudent) {
    return NextResponse.json(
      {
        error:
          "Une inscription existe déjà avec ce prénom et ce nom dans cette classe. Si tu penses qu’il s’agit d’une erreur, contacte ton professeur.",
      },
      { status: 409 }
    );
  }

  const loginIdentifier = await generateUniqueStudentLoginIdentifier(
    admin as unknown as IdentifierAvailabilityClient,
    firstName
  );
  const email = normalizeEmail(buildInternalStudentEmail(loginIdentifier));
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

  const { error: reservationError } = await admin
    .from("student_login_identifiers")
    .insert({
      identifier: loginIdentifier,
      auth_email: email,
      user_id: appUser.id,
    });

  if (reservationError) {
    await admin.from("app_users").delete().eq("id", appUser.id);
    await admin.auth.admin.deleteUser(authData.user.id);

    return NextResponse.json(
      { error: "Réservation de l’identifiant impossible." },
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

  let recoveryContactMessage =
    "Aucune adresse personnelle n’a été enregistrée. Tu pourras en ajouter une plus tard depuis /compte.";

  if (normalizedPersonalEmail) {
    const contactResult = await saveRecoveryEmailForUser(
      admin as unknown as RecoveryEmailClient,
      appUser.id,
      normalizedPersonalEmail,
      { canBeUsedForRecovery: useEmailForRecovery }
    );

    if (!contactResult.ok) {
      await admin.from("app_users").delete().eq("id", appUser.id);
      await admin.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        { error: contactResult.message, code: contactResult.code },
        { status: contactResult.code === "conflict" ? 409 : 400 }
      );
    }

    recoveryContactMessage = useEmailForRecovery
      ? "Adresse personnelle enregistrée. Elle devra être vérifiée pour récupérer ton compte."
      : "Adresse personnelle enregistrée. Elle ne sera pas utilisée pour récupérer ton compte sans ton accord.";
  }

  return NextResponse.json({
    email,
    loginIdentifier,
    className: classData.name,
    schoolYear: classData.school_year,
    hasRecoveryEmail: Boolean(normalizedPersonalEmail),
    canRecoverWithEmail: Boolean(normalizedPersonalEmail && useEmailForRecovery),
    recoveryContactMessage,
    message:
      "Compte créé. Ton inscription est en attente de validation par le professeur.",
  });
  } catch {
    return NextResponse.json(
      { error: "Création du compte impossible pour le moment." },
      { status: 500 }
    );
  }
}
