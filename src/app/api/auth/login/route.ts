import { NextResponse } from "next/server";
import { getRoleHomePath } from "@/lib/auth/getRoleHomePath";
import { normalizeLoginIdentifier } from "@/lib/auth/loginIdentifier";
import {
  resolveAuthEmailForLoginIdentifier,
  type IdentifierAvailabilityClient,
} from "@/lib/auth/studentLoginIdentifier";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const LOGIN_FAILURE_MESSAGE =
  "Connexion impossible. Vérifie ton identifiant et ton mot de passe.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const identifier = normalizeLoginIdentifier(String(body?.identifier ?? ""));
  const password = String(body?.password ?? "");

  if (!identifier || !password) {
    return loginFailureResponse();
  }

  const admin = createAdminClient();
  const authEmail = await resolveAuthEmailForLoginIdentifier(
    admin as unknown as IdentifierAvailabilityClient,
    identifier
  );
  const response = NextResponse.json({ success: true });
  const supabase = await createClient(response);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  });

  if (error) {
    return loginFailureResponse();
  }

  const homePath = getRoleHomePath(data.user?.app_metadata?.role);

  if (!homePath) {
    await supabase.auth.signOut().catch(() => null);
    return loginFailureResponse();
  }

  return response;
}

function loginFailureResponse() {
  return NextResponse.json(
    { error: LOGIN_FAILURE_MESSAGE },
    { status: 401 }
  );
}
