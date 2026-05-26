import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

export async function GET() {
  const teacher = await requireTeacher();

  if (!teacher) {
    return NextResponse.json(
      { error: "Accès réservé au professeur." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("classes")
    .select(
      "id, name, school_year, level, registration_code, is_registration_open, created_at, updated_at"
    )
    .order("school_year", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ classes: data ?? [] });
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
  const registrationCode = normalizeRegistrationCode(
    String(body?.registrationCode ?? "")
  );

  if (!name || !schoolYear || !registrationCode) {
    return NextResponse.json(
      {
        error:
          "Nom de classe, année scolaire et code d’inscription sont obligatoires.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("classes")
    .insert({
      id: crypto.randomUUID(),
      name,
      school_year: schoolYear,
      level,
      registration_code: registrationCode,
      is_registration_open: true,
    })
    .select(
      "id, name, school_year, level, registration_code, is_registration_open"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
