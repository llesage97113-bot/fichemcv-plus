import { NextResponse } from "next/server";
import {
  normalizeLoginIdentifier,
  normalizeShortLoginIdentifier,
} from "@/lib/auth/loginIdentifier";
import {
  PASSWORD_RESET_RECENT_LIMIT_PER_HOUR,
  buildPasswordResetEmail,
  buildPasswordResetUrl,
  generatePasswordResetToken,
  getNativePasswordRecoveryRedirectTo,
  getPasswordResetCooldownStart,
  getPasswordResetExpiresAt,
  getPasswordResetHourStart,
  hashPasswordResetToken,
  shouldUseCustomRecoveryForIdentifier,
} from "@/lib/auth/passwordResetTokens";
import {
  isValidEmail,
  PASSWORD_RESET_REQUEST_PUBLIC_MESSAGE,
} from "@/lib/auth/passwordRecovery";
import { canAddRecoveryContact, type RecoveryEmailAppUser } from "@/lib/auth/recoveryEmail";
import { sendEmail } from "@/lib/email/mailer";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_PUBLIC_RESPONSE_MS = 350;
const PUBLIC_RESPONSE_JITTER_MS = 150;

type AppUserForPasswordReset = RecoveryEmailAppUser & {
  email: string | null;
  legacy_login_email: string | null;
};

type RecoveryContactForPasswordReset = {
  id: string;
  user_id: string;
  contact_type: string | null;
  contact_value: string | null;
  normalized_value: string | null;
  verified_at: string | null;
  is_primary: boolean | null;
};

export async function POST(request: Request) {
  const startedAt = Date.now();
  const body = await request.json().catch(() => null);
  const identifier = normalizeLoginIdentifier(String(body?.identifier ?? ""));

  if (!isValidEmail(identifier)) {
    return neutralPasswordResetResponse(startedAt);
  }

  const origin = getRequestOrigin(request);
  const admin = createAdminClient();

  if (!shouldUseCustomRecoveryForIdentifier(identifier)) {
    await admin.auth
      .resetPasswordForEmail(identifier, {
        redirectTo: getNativePasswordRecoveryRedirectTo(origin),
      })
      .catch(() => null);

    return neutralPasswordResetResponse(startedAt);
  }

  const appUser = await findAppUserByLoginIdentifier(admin, identifier);

  if (!appUser || !canAddRecoveryContact(appUser)) {
    return neutralPasswordResetResponse(startedAt);
  }

  const contact = await findVerifiedRecoveryEmail(admin, appUser.id);

  if (!contact) {
    return neutralPasswordResetResponse(startedAt);
  }

  await createAndSendCustomPasswordReset(admin, appUser.id, contact).catch(() => null);

  return neutralPasswordResetResponse(startedAt);
}

async function neutralPasswordResetResponse(startedAt: number) {
  const elapsed = Date.now() - startedAt;
  const targetDelay =
    MIN_PUBLIC_RESPONSE_MS + Math.floor(Math.random() * PUBLIC_RESPONSE_JITTER_MS);
  const remaining = targetDelay - elapsed;

  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }

  return NextResponse.json({ message: PASSWORD_RESET_REQUEST_PUBLIC_MESSAGE });
}

function getRequestOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    return configured;
  }

  return new URL(request.url).origin;
}

async function findAppUserByLoginIdentifier(
  admin: ReturnType<typeof createAdminClient>,
  identifier: string
) {
  const shortIdentifier = normalizeShortLoginIdentifier(identifier);
  const byShortIdentifier = await admin
    .from("student_login_identifiers")
    .select("user_id")
    .eq("identifier", shortIdentifier)
    .maybeSingle();

  if (byShortIdentifier.data?.user_id) {
    const byUserId = await admin
      .from("app_users")
      .select("id, email, is_active, account_status, legacy_login_email")
      .eq("id", byShortIdentifier.data.user_id)
      .maybeSingle();

    if (byUserId.data) {
      return byUserId.data as AppUserForPasswordReset;
    }
  }

  const byEmail = await admin
    .from("app_users")
    .select("id, email, is_active, account_status, legacy_login_email")
    .eq("email", identifier)
    .maybeSingle();

  if (byEmail.data) {
    return byEmail.data as AppUserForPasswordReset;
  }

  const byLegacyEmail = await admin
    .from("app_users")
    .select("id, email, is_active, account_status, legacy_login_email")
    .eq("legacy_login_email", identifier)
    .maybeSingle();

  return (byLegacyEmail.data ?? null) as AppUserForPasswordReset | null;
}

async function findVerifiedRecoveryEmail(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const { data, error } = await admin
    .from("user_contacts")
    .select("id, user_id, contact_type, contact_value, normalized_value, verified_at, is_primary, can_be_used_for_recovery")
    .eq("user_id", userId)
    .eq("contact_type", "email")
    .eq("can_be_used_for_recovery", true)
    .not("verified_at", "is", null)
    .order("is_primary", { ascending: false })
    .order("verified_at", { ascending: false })
    .limit(1);

  if (error || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  return data[0] as RecoveryContactForPasswordReset;
}

async function createAndSendCustomPasswordReset(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  contact: RecoveryContactForPasswordReset
) {
  const now = new Date();
  await invalidateExpiredPasswordResetTokens(admin, now);

  const { data: recentTokenData, error: recentTokenError } = await admin
    .from("user_password_reset_tokens")
    .select("id, created_at")
    .eq("user_id", userId)
    .gte("created_at", getPasswordResetCooldownStart(now).toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (recentTokenError || (Array.isArray(recentTokenData) && recentTokenData.length > 0)) {
    return;
  }

  const { count: recentHourlyCount, error: hourlyError } = await admin
    .from("user_password_reset_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", getPasswordResetHourStart(now).toISOString());

  if (hourlyError || (recentHourlyCount ?? 0) >= PASSWORD_RESET_RECENT_LIMIT_PER_HOUR) {
    return;
  }

  const rawToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = getPasswordResetExpiresAt(now);

  await admin
    .from("user_password_reset_tokens")
    .update({ consumed_at: now.toISOString() })
    .eq("user_id", userId)
    .is("consumed_at", null);

  const { data: insertedToken, error: insertError } = await admin
    .from("user_password_reset_tokens")
    .insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !insertedToken) {
    return;
  }

  const resetUrl = buildPasswordResetUrl(rawToken);
  const email = buildPasswordResetEmail(resetUrl);
  const sendResult = await sendEmail({
    to: contact.contact_value || contact.normalized_value || "",
    ...email,
  });

  if (!sendResult.ok) {
    await admin
      .from("user_password_reset_tokens")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", insertedToken.id);
  }
}

async function invalidateExpiredPasswordResetTokens(
  admin: ReturnType<typeof createAdminClient>,
  now: Date
) {
  await admin
    .from("user_password_reset_tokens")
    .update({ consumed_at: now.toISOString() })
    .is("consumed_at", null)
    .lte("expires_at", now.toISOString());
}
