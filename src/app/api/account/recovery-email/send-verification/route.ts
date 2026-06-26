import { NextResponse } from "next/server";
import {
  CONTACT_VERIFICATION_RATE_LIMIT_MESSAGE,
  CONTACT_VERIFICATION_RECENT_LIMIT_PER_HOUR,
  CONTACT_VERIFICATION_SEND_ERROR_MESSAGE,
  CONTACT_VERIFICATION_SENT_MESSAGE,
  buildRecoveryEmailVerificationEmail,
  buildRecoveryEmailVerificationUrl,
  generateContactVerificationToken,
  getContactVerificationCooldownStart,
  getContactVerificationExpiresAt,
  getContactVerificationHourStart,
  hashContactVerificationToken,
  type ContactVerificationContact,
} from "@/lib/auth/contactVerification";
import { canAddRecoveryContact, type RecoveryEmailAppUser } from "@/lib/auth/recoveryEmail";
import { sendEmail } from "@/lib/email/mailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const GENERIC_ERROR = "Le lien de vérification n’a pas pu être envoyé.";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Session utilisateur requise." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const contactId = String(body?.contactId ?? "");

  if (!isUuid(contactId)) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: appUserData, error: appUserError } = await admin
    .from("app_users")
    .select("id, is_active, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (appUserError || !appUserData || !canAddRecoveryContact(appUserData as RecoveryEmailAppUser)) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const { data: contactData, error: contactError } = await admin
    .from("user_contacts")
    .select("id, user_id, contact_type, contact_value, normalized_value, verified_at")
    .eq("id", contactId)
    .eq("user_id", user.id)
    .eq("contact_type", "email")
    .maybeSingle();

  if (contactError || !contactData) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 404 });
  }

  const contact = contactData as ContactVerificationContact;

  if (contact.verified_at) {
    return NextResponse.json(
      { error: "Cette adresse email est déjà vérifiée." },
      { status: 400 }
    );
  }

  const now = new Date();
  const { data: recentTokenData, error: recentTokenError } = await admin
    .from("user_contact_verification_tokens")
    .select("id, created_at")
    .eq("user_contact_id", contact.id)
    .gte("created_at", getContactVerificationCooldownStart(now).toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (recentTokenError) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  if (Array.isArray(recentTokenData) && recentTokenData.length > 0) {
    return NextResponse.json(
      { error: CONTACT_VERIFICATION_RATE_LIMIT_MESSAGE },
      { status: 429 }
    );
  }

  const { count: recentHourlyCount, error: hourlyError } = await admin
    .from("user_contact_verification_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_contact_id", contact.id)
    .gte("created_at", getContactVerificationHourStart(now).toISOString());

  if (hourlyError) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  if ((recentHourlyCount ?? 0) >= CONTACT_VERIFICATION_RECENT_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: CONTACT_VERIFICATION_RATE_LIMIT_MESSAGE },
      { status: 429 }
    );
  }

  const rawToken = generateContactVerificationToken();
  const tokenHash = hashContactVerificationToken(rawToken);
  const expiresAt = getContactVerificationExpiresAt(now);

  const { error: invalidateError } = await admin
    .from("user_contact_verification_tokens")
    .update({ consumed_at: now.toISOString() })
    .eq("user_contact_id", contact.id)
    .is("consumed_at", null);

  if (invalidateError) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const { data: insertedToken, error: insertError } = await admin
    .from("user_contact_verification_tokens")
    .insert({
      user_contact_id: contact.id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !insertedToken) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const verificationUrl = buildRecoveryEmailVerificationUrl(rawToken);
  const email = buildRecoveryEmailVerificationEmail(verificationUrl);
  const sendResult = await sendEmail({
    to: contact.contact_value || contact.normalized_value || "",
    ...email,
  });

  if (!sendResult.ok) {
    await admin
      .from("user_contact_verification_tokens")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", insertedToken.id);

    return NextResponse.json(
      { error: CONTACT_VERIFICATION_SEND_ERROR_MESSAGE },
      { status: 503 }
    );
  }

  return NextResponse.json({ message: CONTACT_VERIFICATION_SENT_MESSAGE });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
