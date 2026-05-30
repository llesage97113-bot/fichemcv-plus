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

  const { data: appUser, error: appUserError } = await admin
    .from("app_users")
    .select("id, email, role, is_active")
    .eq("email", email)
    .eq("role", "teacher")
    .single();

  if (appUserError || !appUser) {
    return NextResponse.json(
      {
        error:
          appUserError?.message ??
          "Compte professeur introuvable dans app_users.",
      },
      { status: 404 }
    );
  }

  if (!appUser.is_active) {
    return NextResponse.json(
      { error: "Ce compte professeur est désactivé." },
      { status: 400 }
    );
  }

  const temporaryPassword = generateTemporaryPassword();

  const { error: updateError } = await admin.auth.admin.updateUserById(
    appUser.id,
    {
      password: temporaryPassword,
    }
  );

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Mot de passe professeur réinitialisé.",
    teacher: {
      id: appUser.id,
      email: appUser.email,
    },
    temporaryPassword,
  });
}
