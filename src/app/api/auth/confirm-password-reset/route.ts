import { NextResponse } from "next/server";
import {
  hashPasswordResetToken,
  isValidPasswordResetTokenFormat,
  normalizePasswordResetRpcStatus,
} from "@/lib/auth/passwordResetTokens";
import {
  PASSWORD_RECOVERY_SUCCESS_MESSAGE,
  validateNewPassword,
} from "@/lib/auth/passwordRecovery";
import { createAdminClient } from "@/lib/supabase/admin";

const MESSAGES = {
  invalid: "Ce lien de réinitialisation est invalide.",
  expired: "Ce lien de réinitialisation a expiré.",
  consumed: "Ce lien de réinitialisation a déjà été utilisé.",
  generic: "Modification impossible. Demande un nouveau lien de réinitialisation.",
};

type ConsumePasswordResetTokenRow = {
  status?: unknown;
  user_id?: unknown;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? "");
  const newPassword = String(body?.newPassword ?? "");
  const confirmPassword = String(body?.confirmPassword ?? "");

  if (!isValidPasswordResetTokenFormat(token)) {
    return NextResponse.json(
      { status: "invalid", error: MESSAGES.invalid },
      { status: 400 }
    );
  }

  const validationError = validateNewPassword(newPassword, confirmPassword);

  if (validationError) {
    return NextResponse.json(
      { status: "invalid_password", error: validationError },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const tokenHash = hashPasswordResetToken(token);
  const { data: consumeData, error: consumeError } = await admin.rpc(
    "consume_user_password_reset_token",
    { p_token_hash: tokenHash }
  );

  if (consumeError) {
    return NextResponse.json(
      { status: "invalid", error: MESSAGES.invalid },
      { status: 400 }
    );
  }

  const consumeRow = getFirstRpcRow(consumeData);
  const consumeStatus = normalizePasswordResetRpcStatus(consumeRow?.status);

  if (consumeStatus !== "success") {
    return passwordResetFailureResponse(consumeStatus);
  }

  const userId = typeof consumeRow?.user_id === "string" ? consumeRow.user_id : "";

  if (!userId) {
    return NextResponse.json(
      { status: "invalid", error: MESSAGES.invalid },
      { status: 400 }
    );
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (updateError) {
    return NextResponse.json(
      { status: "invalid", error: MESSAGES.generic },
      { status: 400 }
    );
  }

  return NextResponse.json({
    status: "success",
    message: PASSWORD_RECOVERY_SUCCESS_MESSAGE,
    redirectTo: "/login",
  });
}

function getFirstRpcRow(data: unknown): ConsumePasswordResetTokenRow | null {
  const row = Array.isArray(data) ? data[0] : data;

  if (typeof row === "object" && row !== null) {
    return row as ConsumePasswordResetTokenRow;
  }

  return null;
}

function passwordResetFailureResponse(status: "invalid" | "expired" | "consumed") {
  const httpStatus = status === "invalid" ? 400 : 409;

  return NextResponse.json(
    {
      status,
      error: MESSAGES[status],
    },
    { status: httpStatus }
  );
}
