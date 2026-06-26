import { NextResponse } from "next/server";
import { getSafePasswordRecoveryNextPath } from "@/lib/auth/passwordRecovery";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafePasswordRecoveryNextPath(
    requestUrl.searchParams.get("next")
  );
  const redirectUrl = new URL(next, requestUrl.origin);

  if (!code) {
    return NextResponse.redirect(redirectUrl);
  }

  const response = NextResponse.redirect(redirectUrl);
  const supabase = await createClient(response);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  const hasSession = Boolean(data.session);
  const hasUser = Boolean(data.user);

  if (error || !hasSession || !hasUser) {
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
