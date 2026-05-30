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

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let randomPart = "";

  for (let index = 0; index < 10; index += 1) {
    randomPart += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return `PROF-${randomPart}!`;
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
  const email = normalizeEmail(String(body?.email ?? ""));

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Adresse email professeur invalide." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const temporaryPassword = generateTemporaryPassword();

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      app_metadata: {
        role: "professeur",
      },
    });

  if (authError || !authData.user) {
    return NextResponse.json(
      {
        error:
          authError?.message ??
          "Création du compte professeur impossible.",
      },
      { status: 500 }
    );
  }

  const { error: appUserError } = await admin
    .from("app_users")
    .upsert(
      {
        id: authData.user.id,
        email,
        role: "teacher",
        is_active: true,
      },
      { onConflict: "id" }
    );

  if (appUserError) {
    await admin.auth.admin.deleteUser(authData.user.id);

    return NextResponse.json(
      { error: appUserError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Compte professeur créé.",
    teacher: {
      id: authData.user.id,
      email,
    },
    temporaryPassword,
  });
}
