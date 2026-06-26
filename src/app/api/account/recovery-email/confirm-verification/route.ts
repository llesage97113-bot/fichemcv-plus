import { NextResponse } from "next/server";
import {
  hashContactVerificationToken,
  isValidContactVerificationTokenFormat,
  normalizeVerificationRpcStatus,
} from "@/lib/auth/contactVerification";
import { createAdminClient } from "@/lib/supabase/admin";

const MESSAGES = {
  success: "Ton adresse email de récupération est maintenant vérifiée.",
  invalid: "Ce lien de vérification est invalide.",
  expired: "Ce lien de vérification a expiré.",
  consumed: "Ce lien de vérification a déjà été utilisé.",
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? "");

  if (!isValidContactVerificationTokenFormat(token)) {
    return NextResponse.json(
      { status: "invalid", error: MESSAGES.invalid },
      { status: 400 }
    );
  }

  const tokenHash = hashContactVerificationToken(token);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc(
    "confirm_user_contact_verification_token",
    { p_token_hash: tokenHash }
  );

  if (error) {
    return NextResponse.json(
      { status: "invalid", error: MESSAGES.invalid },
      { status: 400 }
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  const resultStatus = normalizeVerificationRpcStatus(
    typeof row === "object" && row !== null && "status" in row
      ? (row as { status?: unknown }).status
      : row
  );

  if (resultStatus !== "success") {
    const failureStatus =
      resultStatus === "expired" || resultStatus === "consumed"
        ? resultStatus
        : "invalid";
    const httpStatus = failureStatus === "expired" || failureStatus === "consumed" ? 409 : 400;

    return NextResponse.json(
      { status: failureStatus, error: MESSAGES[failureStatus] },
      { status: httpStatus }
    );
  }

  return NextResponse.json({
    status: "success",
    message: MESSAGES.success,
    redirectTo: "/verify-recovery-email/success",
  });
}
