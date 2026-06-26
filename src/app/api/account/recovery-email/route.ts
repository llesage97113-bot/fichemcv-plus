import { NextResponse } from "next/server";
import {
  compareRecoveryEmails,
  type RecoveryEmailClient,
  saveRecoveryEmailForUser,
} from "@/lib/auth/recoveryEmail";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "Session utilisateur requise." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const validation = compareRecoveryEmails(
    String(body?.email ?? ""),
    String(body?.confirmEmail ?? "")
  );

  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.message, code: validation.code },
      { status: 400 }
    );
  }

  const admin = createAdminClient() as unknown as RecoveryEmailClient;
  const result = await saveRecoveryEmailForUser(admin, user.id, validation.email);

  if (!result.ok) {
    const status = result.code === "conflict" ? 409 : 400;

    return NextResponse.json(
      { error: result.message, code: result.code },
      { status }
    );
  }

  return NextResponse.json({ message: result.message });
}
